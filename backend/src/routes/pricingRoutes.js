import express from 'express';
import * as pricingController from '../controllers/pricingController.js';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// All pricing routes require authentication
router.use(authenticateToken);

// ---- Price Rule CRUD ----
// GET  /api/pricing/rules            — pricing.view (or products.view as fallback)
router.get('/rules', requirePermission('pricing.view'), pricingController.getPriceRules);

// POST /api/pricing/rules            — pricing.create
router.post('/rules', requirePermission('pricing.create'), pricingController.createPriceRule);

// PUT  /api/pricing/rules/:id        — pricing.update
router.put('/rules/:id', requirePermission('pricing.update'), pricingController.updatePriceRule);

// DELETE /api/pricing/rules/:id      — pricing.delete
router.delete('/rules/:id', requirePermission('pricing.delete'), pricingController.deletePriceRule);

// ---- Price Resolution ----
// POST /api/pricing/resolve          — sales.view (non-mutating)
router.post('/resolve', requirePermission('sales.view'), pricingController.resolvePrice);

export default router;
