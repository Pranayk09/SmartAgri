import express from 'express';
import { getKPIs, getAlerts, getReport } from '../controllers/dashboardController.js';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Dashboard Routes — require dashboard.view permission
router.get('/kpis', requirePermission('dashboard.view'), getKPIs);
router.get('/alerts', requirePermission('dashboard.view'), getAlerts);

// Reports Route — require dashboard.view permission
router.get('/reports/:type', requirePermission('dashboard.view'), getReport);

export default router;
