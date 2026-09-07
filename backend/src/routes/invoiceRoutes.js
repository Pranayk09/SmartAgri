import express from 'express';
import * as invoiceController from '../controllers/invoiceController.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ---- Invoice Generation ----
// GET /api/invoices/pending-orders - Need invoices.create to fetch
router.get('/pending-orders', requirePermission('invoices.create'), invoiceController.getPendingDispatchOrders);

// POST /api/invoices - Create new invoice
router.post('/', requirePermission('invoices.create'), invoiceController.createInvoice);

// ---- Invoice Ledger ----
// GET /api/invoices - View invoices
router.get('/', requirePermission('invoices.view'), invoiceController.listInvoices);

// ---- Payments ----
// POST /api/invoices/:id/payments - Record a payment
router.post('/:id/payments', requirePermission('invoices.payment'), invoiceController.recordPayment);

export default router;
