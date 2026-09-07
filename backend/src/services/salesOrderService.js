import { prisma } from '../config/db.js';
import { resolvePrice } from './pricingService.js';
import { allocateFEFO } from './inventoryService.js';
import { validateCreditForOrder } from './creditValidationService.js';

// ==========================================
// HELPERS
// ==========================================

/** Generate sequential order number: SO-YYYYMM-NNNN */
async function generateOrderNumber(organizationId) {
  const now = new Date();
  const prefix = `SO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await prisma.salesOrder.findFirst({
    where: { organizationId, orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  let seq = 1;
  if (latest) {
    const parts = latest.orderNumber.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

// ==========================================
// 1. LIST ORDERS
// ==========================================

/**
 * Returns all sales orders for the organisation, newest first.
 */
export async function listOrders(organizationId) {
  return prisma.salesOrder.findMany({
    where: { organizationId },
    include: {
      customer: { select: { id: true, name: true, type: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
      },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ==========================================
// 2. GET ORDER BY ID
// ==========================================

export async function getOrderById(organizationId, orderId) {
  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, organizationId },
    include: {
      customer: { select: { id: true, name: true, type: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          allocations: {
            include: {
              batch: { select: { batchNumber: true, expiryDate: true } },
            },
          },
        },
      },
      user: { select: { name: true } },
    },
  });

  if (!order) {
    const err = new Error('Sales order not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return order;
}

// ==========================================
// 3. ORDER CHECK (non-mutating evaluation)
// ==========================================

/**
 * Runs a complete non-mutating business evaluation of a potential order:
 *  - Resolves tiered pricing for each line item
 *  - Runs FEFO allocation preview for each product
 *  - Validates customer credit against total order amount
 *
 * @param {string} organizationId
 * @param {string} customerId
 * @param {Array<{ productId, quantity }>} items
 * @returns {object} Full evaluation result
 */
export async function checkOrder(organizationId, customerId, items) {
  if (!customerId) {
    const err = new Error('customerId is required.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('At least one order item is required.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // Evaluate each line item (pricing + FEFO) in parallel
  const lineResults = await Promise.all(
    items.map(async (item) => {
      const { productId, quantity } = item;
      if (!productId || !quantity || parseFloat(quantity) <= 0) {
        const err = new Error(`Invalid item: productId and positive quantity are required.`);
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      const parsedQty = parseFloat(quantity);

      // Run pricing resolution and FEFO allocation concurrently per item
      const [pricing, fefo] = await Promise.all([
        resolvePrice(organizationId, productId, parsedQty),
        allocateFEFO(organizationId, productId, parsedQty),
      ]);

      return {
        productId,
        productName: pricing.productName,
        productSku: pricing.productSku,
        productUnit: pricing.productUnit,
        quantity: parsedQty,
        unitPrice: pricing.unitPrice,
        subtotal: pricing.totalPrice,
        pricingFallback: pricing.fallback,
        appliedPriceRule: pricing.appliedRule,
        defaultSellingPrice: pricing.defaultSellingPrice,
        fefo: {
          canFulfill: fefo.canFulfill,
          shortage: fefo.shortage,
          totalAvailable: fefo.totalAvailable,
          allocations: fefo.allocations,
        },
      };
    })
  );

  const totalAmount = lineResults.reduce((sum, l) => sum + l.subtotal, 0);

  // Run credit validation — throws CREDIT_LIMIT_EXCEEDED if not approved
  let creditResult;
  let creditPassed = false;
  let creditError = null;
  try {
    creditResult = await validateCreditForOrder(organizationId, customerId, totalAmount);
    creditPassed = true;
  } catch (err) {
    if (err.code === 'CREDIT_LIMIT_EXCEEDED') {
      creditResult = err.details;
      creditError = err.message;
    } else {
      throw err; // propagate unexpected errors
    }
  }

  // Determine stock sufficiency across all lines
  const allStockOk = lineResults.every((l) => l.fefo.canFulfill);

  return {
    customerId,
    customerName: creditResult?.customerName,
    items: lineResults,
    totalAmount,
    credit: {
      passed: creditPassed,
      error: creditError,
      ...(creditResult || {}),
    },
    stock: {
      allSufficient: allStockOk,
      linesSummary: lineResults.map((l) => ({
        productId: l.productId,
        productName: l.productName,
        quantity: l.quantity,
        canFulfill: l.fefo.canFulfill,
        shortage: l.fefo.shortage,
      })),
    },
    canProceed: creditPassed && allStockOk,
  };
}

// ==========================================
// 4. CREATE ORDER (saves as DRAFT)
// ==========================================

/**
 * Creates a new Sales Order in DRAFT status.
 * Persists SalesOrder + SalesOrderItems inside a transaction.
 * Does NOT reserve stock — that happens in Phase 10 (Confirm).
 *
 * @param {string} organizationId
 * @param {string} userId  — from req.user.userId
 * @param {object} data    — { customerId, items: [{ productId, quantity, unitPrice, subtotal }] }
 */
export async function createOrder(organizationId, userId, data) {
  const { customerId, items } = data;

  if (!customerId) {
    const err = new Error('customerId is required.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('At least one order item is required.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // Verify customer exists in this org
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    include: { credit: true },
  });
  if (!customer) {
    const err = new Error('Customer not found or access denied.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Validate each line item
  for (const item of items) {
    if (!item.productId || !item.quantity || !item.unitPrice) {
      const err = new Error('Each item requires productId, quantity, and unitPrice.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (parseFloat(item.quantity) <= 0 || parseFloat(item.unitPrice) <= 0) {
      const err = new Error('Item quantity and unitPrice must be positive numbers.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
  }

  const totalAmount = items.reduce(
    (sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.unitPrice),
    0
  );

  const paymentTermsDays = customer.credit?.paymentTermsDays ?? 30;
  const orderNumber = await generateOrderNumber(organizationId);

  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.create({
      data: {
        organizationId,
        customerId,
        orderNumber,
        totalAmount,
        paymentTermsDays,
        status: 'DRAFT',
        createdBy: userId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            subtotal: parseFloat(item.quantity) * parseFloat(item.unitPrice),
          })),
        },
      },
      include: {
        customer: { select: { id: true, name: true, type: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
        user: { select: { name: true } },
      },
    });
    return order;
  });
}

// ==========================================
// 5. CANCEL ORDER
// ==========================================

/**
 * Cancels a DRAFT order. Only DRAFT orders may be cancelled here.
 * CONFIRMED orders require dispatch reversal (Phase 10).
 */
export async function cancelOrder(organizationId, orderId) {
  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, organizationId },
  });

  if (!order) {
    const err = new Error('Sales order not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (order.status !== 'DRAFT') {
    const err = new Error(
      `Cannot cancel order in "${order.status}" state. Only DRAFT orders can be cancelled here.`
    );
    err.statusCode = 400;
    err.code = 'INVALID_ORDER_STATE';
    throw err;
  }

  return prisma.salesOrder.update({
    where: { id: orderId },
    data: { status: 'CANCELLED' },
    include: {
      customer: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { name: true, sku: true } } },
      },
    },
  });
}

// ==========================================
// 6. CONFIRM ORDER (RESERVES STOCK)
// ==========================================

/**
 * Confirms a DRAFT order.
 * Runs FEFO engine, creates BatchAllocation rows,
 * decrements availableQuantity, increments reservedQuantity, writes RESERVATION stock movements.
 */
export async function confirmOrder(organizationId, orderId, userId) {
  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, organizationId },
    include: {
      items: true,
    },
  });

  if (!order) {
    const err = new Error('Sales order not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (order.status !== 'DRAFT') {
    const err = new Error(`Cannot confirm order in "${order.status}" state.`);
    err.statusCode = 400;
    err.code = 'INVALID_ORDER_STATE';
    throw err;
  }

  // Check FEFO for all items
  const allocationPlans = [];
  for (const item of order.items) {
    const fefo = await allocateFEFO(organizationId, item.productId, item.quantity);
    if (!fefo.canFulfill) {
      const err = new Error(`Insufficient stock for product ${item.productId}. Shortage: ${fefo.shortage}`);
      err.statusCode = 400;
      err.code = 'INSUFFICIENT_STOCK';
      throw err;
    }
    allocationPlans.push({
      item,
      allocations: fefo.allocations,
    });
  }

  // Execute in transaction
  return prisma.$transaction(async (tx) => {
    for (const plan of allocationPlans) {
      for (const alloc of plan.allocations) {
        // Create BatchAllocation
        await tx.batchAllocation.create({
          data: {
            organizationId,
            salesOrderItemId: plan.item.id,
            batchId: alloc.batch.id,
            quantity: alloc.allocatedQuantity,
          },
        });

        // Update ProductBatch
        const batch = await tx.productBatch.findUnique({ where: { id: alloc.batch.id } });
        const newAvailable = batch.availableQuantity - alloc.allocatedQuantity;
        const newReserved = batch.reservedQuantity + alloc.allocatedQuantity;
        
        await tx.productBatch.update({
          where: { id: alloc.batch.id },
          data: {
            availableQuantity: newAvailable,
            reservedQuantity: newReserved,
            status: newAvailable <= 0 ? 'DEPLETED' : undefined,
          },
        });

        // StockMovement
        await tx.stockMovement.create({
          data: {
            organizationId,
            productId: plan.item.productId,
            batchId: alloc.batch.id,
            type: 'RESERVATION',
            quantity: alloc.allocatedQuantity,
            referenceType: 'SALES_ORDER',
            referenceId: orderId,
            createdBy: userId,
          },
        });
      }
    }

    const updatedOrder = await tx.salesOrder.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
      include: {
        customer: { select: { id: true, name: true, type: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
            allocations: {
              include: {
                batch: { select: { batchNumber: true, expiryDate: true } },
              },
            },
          },
        },
        user: { select: { name: true } },
      },
    });

    return updatedOrder;
  });
}

// ==========================================
// 7. DISPATCH ORDER (DEDUCTS STOCK & UPDATES CREDIT)
// ==========================================

/**
 * Dispatches a CONFIRMED order.
 * Decrements reservedQuantity, creates DISPATCH movements, updates CustomerCredit.
 */
export async function dispatchOrder(organizationId, orderId, userId) {
  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, organizationId },
    include: {
      items: {
        include: {
          allocations: true,
        },
      },
    },
  });

  if (!order) {
    const err = new Error('Sales order not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (order.status !== 'CONFIRMED') {
    const err = new Error(`Cannot dispatch order in "${order.status}" state.`);
    err.statusCode = 400;
    err.code = 'INVALID_ORDER_STATE';
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      for (const alloc of item.allocations) {
        // Decrement reservedQuantity
        const batch = await tx.productBatch.findUnique({ where: { id: alloc.batchId } });
        const newReserved = batch.reservedQuantity - alloc.quantity;
        
        await tx.productBatch.update({
          where: { id: alloc.batchId },
          data: {
            reservedQuantity: newReserved,
            status: (batch.availableQuantity <= 0 && newReserved <= 0) ? 'DEPLETED' : undefined,
          },
        });

        // StockMovement
        await tx.stockMovement.create({
          data: {
            organizationId,
            productId: item.productId,
            batchId: alloc.batchId,
            type: 'DISPATCH',
            quantity: alloc.quantity,
            referenceType: 'SALES_ORDER',
            referenceId: orderId,
            createdBy: userId,
          },
        });
      }
    }

    // Increment Customer outstanding amount
    await tx.customerCredit.update({
      where: { customerId: order.customerId },
      data: {
        outstandingAmount: {
          increment: order.totalAmount,
        },
      },
    });

    const updatedOrder = await tx.salesOrder.update({
      where: { id: orderId },
      data: { status: 'DISPATCHED' },
      include: {
        customer: { select: { id: true, name: true, type: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
            allocations: {
              include: {
                batch: { select: { batchNumber: true, expiryDate: true } },
              },
            },
          },
        },
        user: { select: { name: true } },
      },
    });

    return updatedOrder;
  });
}
