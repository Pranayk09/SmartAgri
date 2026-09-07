import * as invoiceService from '../services/invoiceService.js';

/**
 * GET /api/invoices/pending-orders
 * Returns all DISPATCHED orders that do not have an invoice yet.
 */
export async function getPendingDispatchOrders(req, res, next) {
  try {
    const orders = await invoiceService.getPendingDispatchOrders(req.user.organizationId);
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/invoices
 * Body: { salesOrderId }
 * Generates an invoice for a DISPATCHED order.
 */
export async function createInvoice(req, res, next) {
  try {
    const { salesOrderId } = req.body;
    if (!salesOrderId) {
      return res.status(400).json({ success: false, error: { message: 'salesOrderId is required' } });
    }
    const invoice = await invoiceService.createInvoice(req.user.organizationId, salesOrderId, req.user.userId);
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/invoices
 * Returns all invoices.
 */
export async function listInvoices(req, res, next) {
  try {
    const invoices = await invoiceService.listInvoices(req.user.organizationId);
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/invoices/:id/payments
 * Body: { amount, paymentMethod, referenceNumber, notes }
 * Records a payment against the invoice.
 */
export async function recordPayment(req, res, next) {
  try {
    const paymentData = req.body;
    const payment = await invoiceService.recordPayment(
      req.user.organizationId,
      req.params.id,
      paymentData,
      req.user.userId
    );
    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
}
