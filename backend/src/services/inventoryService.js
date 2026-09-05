import { prisma } from '../config/db.js';

// ==========================================
// 1. PRODUCT BATCHES
// ==========================================

export async function getBatches(organizationId) {
  return prisma.productBatch.findMany({
    where: { organizationId },
    include: {
      product: {
        select: {
          name: true,
          sku: true,
          unit: true,
        },
      },
    },
    orderBy: { expiryDate: 'asc' },
  });
}

export async function createBatch(organizationId, data) {
  const { productId, batchNumber, manufacturingDate, expiryDate, initialQuantity } = data;

  // Validation
  if (!productId || !batchNumber || !manufacturingDate || !expiryDate || initialQuantity === undefined) {
    const error = new Error('Product, Batch Number, Manufacturing Date, Expiry Date, and Initial Quantity are required.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const parsedQty = parseFloat(initialQuantity);
  if (isNaN(parsedQty) || parsedQty < 0) {
    const error = new Error('Initial quantity must be a non-negative number.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  // Verify product belongs to organization
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId },
  });

  if (!product) {
    const error = new Error('Selected product not found or access denied.');
    error.statusCode = 400;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Verify batchNumber uniqueness per product + organization
  const normalizedBatchNumber = batchNumber.toUpperCase().trim();
  const existingBatch = await prisma.productBatch.findFirst({
    where: {
      organizationId,
      productId,
      batchNumber: {
        equals: normalizedBatchNumber,
        mode: 'insensitive',
      },
    },
  });

  if (existingBatch) {
    const error = new Error(`Batch number "${batchNumber}" already exists for this product.`);
    error.statusCode = 400;
    error.code = 'DUPLICATE_OPERATION';
    throw error;
  }

  // Perform creation inside a transaction
  return prisma.$transaction(async (tx) => {
    // Create the batch
    const batch = await tx.productBatch.create({
      data: {
        organizationId,
        productId,
        batchNumber: normalizedBatchNumber,
        manufacturingDate: new Date(manufacturingDate),
        expiryDate: new Date(expiryDate),
        initialQuantity: parsedQty,
        availableQuantity: parsedQty,
        reservedQuantity: 0,
        status: 'AVAILABLE',
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            unit: true,
          },
        },
      },
    });

    // Create the STOCK_IN movement log
    await tx.stockMovement.create({
      data: {
        organizationId,
        productId,
        batchId: batch.id,
        type: 'STOCK_IN',
        quantity: parsedQty,
        referenceType: 'INVENTORY_INITIAL',
        referenceId: batch.id,
        reason: `Initial stock entry for batch ${normalizedBatchNumber}`,
      },
    });

    return batch;
  });
}

export async function adjustStock(organizationId, batchId, data, userId) {
  const { type, quantity, reason } = data;

  // Validation
  if (!type || quantity === undefined) {
    const error = new Error('Adjustment type and quantity are required.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (type !== 'ADJUSTMENT_IN' && type !== 'ADJUSTMENT_OUT') {
    const error = new Error('Adjustment type must be either ADJUSTMENT_IN or ADJUSTMENT_OUT.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const parsedQty = parseFloat(quantity);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    const error = new Error('Adjustment quantity must be a positive number.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    // Verify batch exists
    const batch = await tx.productBatch.findFirst({
      where: { id: batchId, organizationId },
    });

    if (!batch) {
      const error = new Error('Batch not found or access denied.');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    let newAvailableQuantity = batch.availableQuantity;

    if (type === 'ADJUSTMENT_IN') {
      newAvailableQuantity += parsedQty;
    } else {
      // ADJUSTMENT_OUT
      if (batch.availableQuantity < parsedQty) {
        const error = new Error(`Insufficient inventory in batch. Available: ${batch.availableQuantity}, Requested deduction: ${parsedQty}`);
        error.statusCode = 400;
        error.code = 'RESTRICTED_OPERATION';
        throw error;
      }
      newAvailableQuantity -= parsedQty;
    }

    // Determine new status if depleted
    const newStatus = newAvailableQuantity === 0 ? 'DEPLETED' : batch.status;

    // Update batch quantity
    const updatedBatch = await tx.productBatch.update({
      where: { id: batchId },
      data: {
        availableQuantity: newAvailableQuantity,
        status: newStatus,
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            unit: true,
          },
        },
      },
    });

    // Create the StockMovement log
    await tx.stockMovement.create({
      data: {
        organizationId,
        productId: batch.productId,
        batchId: batch.id,
        type,
        quantity: parsedQty,
        referenceType: 'MANUAL_ADJUSTMENT',
        reason: reason?.trim() || `Manual adjustment (${type === 'ADJUSTMENT_IN' ? 'Addition' : 'Deduction'})`,
        createdBy: userId,
      },
    });

    return updatedBatch;
  });
}

// ==========================================
// 2. STOCK MOVEMENTS
// ==========================================

export async function getStockMovements(organizationId) {
  return prisma.stockMovement.findMany({
    where: { organizationId },
    include: {
      product: {
        select: {
          name: true,
          sku: true,
        },
      },
      batch: {
        select: {
          batchNumber: true,
        },
      },
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
