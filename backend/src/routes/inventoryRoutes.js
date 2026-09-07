import express from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// Existing batch & movement routes
router.get('/inventory/batches', authenticateToken, requirePermission('inventory.view'), inventoryController.getBatches);
router.post('/inventory/batches', authenticateToken, requirePermission('inventory.adjust'), inventoryController.createBatch);
router.post('/inventory/batches/:id/adjust', authenticateToken, requirePermission('inventory.adjust'), inventoryController.adjustStock);
router.get('/inventory/movements', authenticateToken, requirePermission('inventory.view'), inventoryController.getStockMovements);

// Phase 6: Expiry management routes
router.post('/inventory/expiry/sync', authenticateToken, requirePermission('inventory.adjust'), inventoryController.syncExpiry);
router.get('/inventory/expiry/dashboard', authenticateToken, requirePermission('inventory.view'), inventoryController.getExpiryDashboard);

// Phase 6: FEFO preview route (non-mutating)
router.post('/inventory/fefo/preview', authenticateToken, requirePermission('inventory.view'), inventoryController.fefoPreview);

export default router;
