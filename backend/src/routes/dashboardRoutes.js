import express from 'express';
import { getKPIs, getAlerts, getReport } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Dashboard Routes
router.get('/kpis', getKPIs);
router.get('/alerts', getAlerts);

// Reports Route
router.get('/reports/:type', getReport);

export default router;
