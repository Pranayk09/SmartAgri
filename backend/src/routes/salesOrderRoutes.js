import express from 'express';
import * as salesOrderController from '../controllers/salesOrderController.js';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ---- Order Check (non-mutating evaluation) ----
// POST /api/sales/orders/check   — sales.view (read-only evaluation)
// IMPORTANT: /check must come before /:id to avoid route collision
router.post('/orders/check', requirePermission('sales.view'), salesOrderController.checkOrder);

// ---- Order State Transitions ----
// POST /api/sales/orders/:id/confirm
router.post('/orders/:id/confirm', requirePermission('sales.confirm'), salesOrderController.confirmOrder);

// POST /api/sales/orders/:id/dispatch
router.post('/orders/:id/dispatch', requirePermission('sales.dispatch'), salesOrderController.dispatchOrder);

// ---- Order CRUD ----
// GET  /api/sales/orders          — sales.view
router.get('/orders', requirePermission('sales.view'), salesOrderController.listOrders);

// GET  /api/sales/orders/:id      — sales.view
router.get('/orders/:id', requirePermission('sales.view'), salesOrderController.getOrderById);

// POST /api/sales/orders          — sales.create
router.post('/orders', requirePermission('sales.create'), salesOrderController.createOrder);

// DELETE /api/sales/orders/:id    — sales.create (cancel = modify; requires create perm)
router.delete('/orders/:id', requirePermission('sales.create'), salesOrderController.cancelOrder);

export default router;
