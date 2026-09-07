import * as salesOrderService from '../services/salesOrderService.js';

// =============================================
// ORDER CHECK (non-mutating)
// =============================================

/**
 * POST /api/sales/orders/check
 * Body: { customerId, items: [{ productId, quantity }] }
 */
export async function checkOrder(req, res, next) {
  try {
    const { customerId, items } = req.body;
    const result = await salesOrderService.checkOrder(
      req.user.organizationId,
      customerId,
      items
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// =============================================
// LIST ORDERS
// =============================================

/** GET /api/sales/orders */
export async function listOrders(req, res, next) {
  try {
    const orders = await salesOrderService.listOrders(req.user.organizationId);
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

// =============================================
// GET ORDER BY ID
// =============================================

/** GET /api/sales/orders/:id */
export async function getOrderById(req, res, next) {
  try {
    const order = await salesOrderService.getOrderById(
      req.user.organizationId,
      req.params.id
    );
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// =============================================
// CREATE ORDER (DRAFT)
// =============================================

/**
 * POST /api/sales/orders
 * Body: { customerId, items: [{ productId, quantity, unitPrice }] }
 */
export async function createOrder(req, res, next) {
  try {
    const { customerId, items } = req.body;
    const order = await salesOrderService.createOrder(
      req.user.organizationId,
      req.user.userId,
      { customerId, items }
    );
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// =============================================
// CANCEL ORDER
// =============================================

/** DELETE /api/sales/orders/:id  (logical cancel, not hard-delete) */
export async function cancelOrder(req, res, next) {
  try {
    const order = await salesOrderService.cancelOrder(
      req.user.organizationId,
      req.params.id
    );
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// =============================================
// CONFIRM ORDER
// =============================================

/** POST /api/sales/orders/:id/confirm */
export async function confirmOrder(req, res, next) {
  try {
    const order = await salesOrderService.confirmOrder(
      req.user.organizationId,
      req.params.id,
      req.user.userId
    );
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// =============================================
// DISPATCH ORDER
// =============================================

/** POST /api/sales/orders/:id/dispatch */
export async function dispatchOrder(req, res, next) {
  try {
    const order = await salesOrderService.dispatchOrder(
      req.user.organizationId,
      req.params.id,
      req.user.userId
    );
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}
