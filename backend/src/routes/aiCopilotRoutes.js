import express from 'express';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware.js';
import { getExecutiveSummary } from '../controllers/aiCopilotController.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/ai/executive-summary?refresh=true (optional cache bust)
router.get('/executive-summary', requirePermission('dashboard.view'), getExecutiveSummary);

export default router;
