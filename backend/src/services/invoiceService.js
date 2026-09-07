import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Gets all dispatched sales orders that have not yet been invoiced.
 */
export async function getPendingDispatchOrders(organizationId) {
  return prisma.salesOrder.findMany({
    where: {
      organizationId,
      status: 'DISPATCHED'
    },
    include: {
      customer: { select: { name: true } },
      items: {
        include: {
          product: { select: { name: true, sku: true } }
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });
}

/**
 * Creates an invoice for a given DISPATCHED sales order.
 * - Generates INV-YYYYMM-NNNN
 * - Updates SalesOrder status to INVOICED
 */
export async function createInvoice(organizationId, orderId, userId) {
  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, organizationId }
  });

  if (!order) {
    const err = new Error('Sales order not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (order.status !== 'DISPATCHED') {
    const err = new Error(`Cannot invoice order in "${order.status}" state. Must be DISPATCHED.`);
    err.statusCode = 400;
    err.code = 'INVALID_ORDER_STATE';
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    // Generate Invoice Number
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', ''); // YYYYMM
    const count = await tx.invoice.count({
      where: {
        organizationId,
        invoiceNumber: { startsWith: `INV-${datePrefix}-` }
      }
    });
    const sequenceNumber = String(count + 1).padStart(4, '0');
    const invoiceNumber = `INV-${datePrefix}-${sequenceNumber}`;

    // Create Invoice
    const invoice = await tx.invoice.create({
      data: {
        organizationId,
        customerId: order.customerId,
        salesOrderId: order.id,
        invoiceNumber,
        subtotal: order.totalAmount, // Assuming no extra discounts applied post-order for now
        discount: 0,
        totalAmount: order.totalAmount,
        amountPaid: 0,
        outstandingAmount: order.totalAmount,
        paymentTermsDays: order.paymentTermsDays,
        dueDate: new Date(Date.now() + order.paymentTermsDays * 24 * 60 * 60 * 1000),
        status: 'PENDING'
      }
    });

    // Update SalesOrder status
    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: 'INVOICED' }
    });

    // Create Audit Log
    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'INVOICE_GENERATED',
        entityType: 'Invoice',
        entityId: invoice.id,
        metadata: { invoiceNumber, salesOrderId: order.id, totalAmount: invoice.totalAmount }
      }
    });

    return invoice;
  });
}

/**
 * Lists all invoices for the organization.
 */
export async function listInvoices(organizationId) {
  return prisma.invoice.findMany({
    where: { organizationId },
    include: {
      customer: { select: { name: true } },
      salesOrder: { select: { orderNumber: true } },
      payments: {
        orderBy: { paymentDate: 'desc' }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

/**
 * Records a payment against an invoice and frees up customer credit.
 */
export async function recordPayment(organizationId, invoiceId, paymentData, userId) {
  const { amount, paymentMethod, referenceNumber, notes } = paymentData;

  if (!amount || amount <= 0) {
    const err = new Error('Payment amount must be greater than zero.');
    err.statusCode = 400;
    err.code = 'INVALID_AMOUNT';
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { salesOrder: true }
    });

    if (!invoice) {
      const err = new Error('Invoice not found.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (invoice.outstandingAmount <= 0 || invoice.status === 'PAID') {
      const err = new Error('Invoice is already fully paid.');
      err.statusCode = 400;
      err.code = 'ALREADY_PAID';
      throw err;
    }

    if (amount > invoice.outstandingAmount) {
      const err = new Error(`Payment amount (${amount}) exceeds outstanding balance (${invoice.outstandingAmount}).`);
      err.statusCode = 400;
      err.code = 'EXCEEDS_BALANCE';
      throw err;
    }

    // Create Payment
    const payment = await tx.payment.create({
      data: {
        organizationId,
        invoiceId,
        customerId: invoice.customerId,
        amount,
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        referenceNumber,
        notes,
        createdBy: userId
      }
    });

    // Update Invoice
    const newAmountPaid = invoice.amountPaid + amount;
    const newOutstandingAmount = invoice.outstandingAmount - amount;
    // Using a tiny epsilon for float comparison safety
    const isFullyPaid = newOutstandingAmount < 0.001;
    const newStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        outstandingAmount: isFullyPaid ? 0 : newOutstandingAmount,
        status: newStatus
      }
    });

    // If fully paid, also update SalesOrder
    if (isFullyPaid) {
      await tx.salesOrder.update({
        where: { id: invoice.salesOrderId },
        data: { status: 'PAID' }
      });
    }

    // Decrement CustomerCredit outstanding amount to free up credit line
    await tx.customerCredit.update({
      where: { customerId: invoice.customerId },
      data: {
        outstandingAmount: {
          decrement: amount
        }
      }
    });

    // Create Audit Log
    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'PAYMENT_RECORDED',
        entityType: 'Payment',
        entityId: payment.id,
        metadata: { invoiceId: invoice.id, amount, newStatus }
      }
    });

    return payment;
  });
}
