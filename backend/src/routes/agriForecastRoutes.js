import express from 'express';
import { 
  getForecast, 
  simulateForecast, 
  getAvailableSeasons, 
  scheduleBatch 
} from '../controllers/agriForecastController.js';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Forecast & Sowing Radar Routes
router.get('/', requirePermission('dashboard.view'), getForecast);
router.post('/simulate', requirePermission('dashboard.view'), simulateForecast);
router.get('/seasons', requirePermission('dashboard.view'), getAvailableSeasons);

// Replenishment Action
router.post('/schedule-batch', requirePermission('dashboard.view'), scheduleBatch);

export default router;
