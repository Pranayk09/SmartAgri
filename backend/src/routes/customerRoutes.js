import express from 'express';
import * as customerController from '../controllers/customerController.js';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// Customer CRUD
router.get('/customers', authenticateToken, requirePermission('customers.view'), customerController.getCustomers);
router.post('/customers', authenticateToken, requirePermission('customers.create'), customerController.createCustomer);
router.put('/customers/:id', authenticateToken, requirePermission('customers.update'), customerController.updateCustomer);
router.delete('/customers/:id', authenticateToken, requirePermission('customers.delete'), customerController.deleteCustomer);

// Credit management (separate permission: customers.credit)
router.put('/customers/:id/credit', authenticateToken, requirePermission('customers.credit'), customerController.updateCreditLimit);

// Credit summary dashboard (customers.view is sufficient)
router.get('/customers/credit/summary', authenticateToken, requirePermission('customers.view'), customerController.getCreditSummary);

export default router;
