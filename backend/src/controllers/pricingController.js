import * as pricingService from '../services/pricingService.js';

// =============================================
// PRICE RULE CONTROLLERS
// =============================================

/**
 * GET /api/pricing/rules
 * GET /api/pricing/rules?productId=<id>
 */
export async function getPriceRules(req, res, next) {
  try {
    const { productId } = req.query;
    const rules = await pricingService.getPriceRules(req.user.organizationId, productId || null);
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/pricing/rules
 * Body: { productId, minQuantity, maxQuantity?, pricePerUnit, status? }
 */
export async function createPriceRule(req, res, next) {
  try {
    const { productId, minQuantity, maxQuantity, pricePerUnit, status } = req.body;
    const rule = await pricingService.createPriceRule(req.user.organizationId, {
      productId, minQuantity, maxQuantity, pricePerUnit, status,
    });
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/pricing/rules/:id
 * Body: { minQuantity?, maxQuantity?, pricePerUnit?, status? }
 */
export async function updatePriceRule(req, res, next) {
  try {
    const { id } = req.params;
    const { minQuantity, maxQuantity, pricePerUnit, status } = req.body;
    const rule = await pricingService.updatePriceRule(req.user.organizationId, id, {
      minQuantity, maxQuantity, pricePerUnit, status,
    });
    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/pricing/rules/:id
 */
export async function deletePriceRule(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pricingService.deletePriceRule(req.user.organizationId, id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// =============================================
// PRICE RESOLUTION CONTROLLER
// =============================================

/**
 * POST /api/pricing/resolve
 * Body: { productId, quantity }
 * Non-mutating: resolves unit price + total for a given product+qty.
 * Reused internally by Phase 9 SalesOrderService.
 */
export async function resolvePrice(req, res, next) {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'productId and quantity are required.',
        },
      });
    }

    const result = await pricingService.resolvePrice(
      req.user.organizationId,
      productId,
      quantity
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
