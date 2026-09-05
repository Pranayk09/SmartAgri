import express from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/inventory/batches', authenticateToken, requirePermission('inventory.view'), inventoryController.getBatches);
router.post('/inventory/batches', authenticateToken, requirePermission('inventory.adjust'), inventoryController.createBatch);
router.post('/inventory/batches/:id/adjust', authenticateToken, requirePermission('inventory.adjust'), inventoryController.adjustStock);
router.get('/inventory/movements', authenticateToken, requirePermission('inventory.view'), inventoryController.getStockMovements);

export default router;
