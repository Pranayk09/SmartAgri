import { prisma } from '../config/db.js';

// ==========================================
// 1. GET PRICE RULES
// ==========================================

/**
 * Returns all price rules for the organisation, optionally filtered by product.
 *
 * @param {string} organizationId
 * @param {string|null} productId - optional filter
 * @returns {PriceRule[]}
 */
export async function getPriceRules(organizationId, productId = null) {
  const where = { organizationId };
  if (productId) where.productId = productId;

  const rules = await prisma.priceRule.findMany({
    where,
    include: {
      product: {
        select: { id: true, name: true, sku: true, unit: true, defaultSellingPrice: true },
      },
    },
    orderBy: [{ productId: 'asc' }, { minQuantity: 'asc' }],
  });

  return rules;
}

// ==========================================
// 2. CREATE PRICE RULE
// ==========================================

/**
 * Creates a new tiered price rule for a product.
 *
 * @param {string} organizationId
 * @param {object} data - { productId, minQuantity, maxQuantity?, pricePerUnit, status? }
 * @returns {PriceRule}
 */
export async function createPriceRule(organizationId, data) {
  const { productId, minQuantity, maxQuantity, pricePerUnit, status } = data;

  // --- Validation ---
  if (!productId) {
    const error = new Error('productId is required.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const parsedMin = parseFloat(minQuantity);
  if (isNaN(parsedMin) || parsedMin < 0) {
    const error = new Error('minQuantity must be a non-negative number.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  let parsedMax = null;
  if (maxQuantity !== undefined && maxQuantity !== null && maxQuantity !== '') {
    parsedMax = parseFloat(maxQuantity);
    if (isNaN(parsedMax) || parsedMax <= 0) {
      const error = new Error('maxQuantity must be a positive number when provided.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    if (parsedMax <= parsedMin) {
      const error = new Error('maxQuantity must be greater than minQuantity.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
  }

  const parsedPrice = parseFloat(pricePerUnit);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    const error = new Error('pricePerUnit must be a positive number.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  // Verify product belongs to this org
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId },
  });
  if (!product) {
    const error = new Error('Product not found or access denied.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const rule = await prisma.priceRule.create({
    data: {
      organizationId,
      productId,
      minQuantity: parsedMin,
      maxQuantity: parsedMax,
      pricePerUnit: parsedPrice,
      status: status || 'ACTIVE',
    },
    include: {
      product: {
        select: { id: true, name: true, sku: true, unit: true, defaultSellingPrice: true },
      },
    },
  });

  return rule;
}

// ==========================================
// 3. UPDATE PRICE RULE
// ==========================================

/**
 * Updates an existing price rule.
 *
 * @param {string} organizationId
 * @param {string} ruleId
 * @param {object} data
 * @returns {PriceRule}
 */
export async function updatePriceRule(organizationId, ruleId, data) {
  const { minQuantity, maxQuantity, pricePerUnit, status } = data;

  const existing = await prisma.priceRule.findFirst({
    where: { id: ruleId, organizationId },
  });
  if (!existing) {
    const error = new Error('Price rule not found or access denied.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const parsedMin =
    minQuantity !== undefined ? parseFloat(minQuantity) : existing.minQuantity;
  if (isNaN(parsedMin) || parsedMin < 0) {
    const error = new Error('minQuantity must be a non-negative number.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  let parsedMax = existing.maxQuantity;
  if (maxQuantity !== undefined) {
    if (maxQuantity === null || maxQuantity === '') {
      parsedMax = null;
    } else {
      parsedMax = parseFloat(maxQuantity);
      if (isNaN(parsedMax) || parsedMax <= 0) {
        const error = new Error('maxQuantity must be a positive number when provided.');
        error.statusCode = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
      if (parsedMax <= parsedMin) {
        const error = new Error('maxQuantity must be greater than minQuantity.');
        error.statusCode = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
    }
  }

  const parsedPrice =
    pricePerUnit !== undefined ? parseFloat(pricePerUnit) : existing.pricePerUnit;
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    const error = new Error('pricePerUnit must be a positive number.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const updated = await prisma.priceRule.update({
    where: { id: ruleId },
    data: {
      minQuantity: parsedMin,
      maxQuantity: parsedMax,
      pricePerUnit: parsedPrice,
      status: status || undefined,
    },
    include: {
      product: {
        select: { id: true, name: true, sku: true, unit: true, defaultSellingPrice: true },
      },
    },
  });

  return updated;
}

// ==========================================
// 4. DELETE PRICE RULE
// ==========================================

/**
 * Hard-deletes a price rule (no FK children on PriceRule).
 *
 * @param {string} organizationId
 * @param {string} ruleId
 */
export async function deletePriceRule(organizationId, ruleId) {
  const existing = await prisma.priceRule.findFirst({
    where: { id: ruleId, organizationId },
  });
  if (!existing) {
    const error = new Error('Price rule not found or access denied.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  await prisma.priceRule.delete({ where: { id: ruleId } });
  return { deleted: true, id: ruleId };
}

// ==========================================
// 5. RESOLVE PRICE  ← Core algorithm for Phase 9
// ==========================================

/**
 * Resolves the applicable unit price for a given product + quantity combination.
 * Non-mutating. Exported for reuse in Phase 9 POST /api/sales/orders/check.
 *
 * Algorithm:
 *  1. Load all ACTIVE PriceRules for (productId, organizationId), sorted by minQuantity ASC.
 *  2. Walk tiers: pick the rule where minQuantity <= quantity AND
 *     (maxQuantity is null OR quantity <= maxQuantity).
 *  3. If no tier matches, fall back to product.defaultSellingPrice.
 *
 * @param {string} organizationId
 * @param {string} productId
 * @param {number} quantity
 * @returns {{
 *   unitPrice: number,
 *   totalPrice: number,
 *   quantity: number,
 *   fallback: boolean,
 *   appliedRule: object | null,
 *   defaultSellingPrice: number,
 *   product: object
 * }}
 */
export async function resolvePrice(organizationId, productId, quantity) {
  const parsedQty = parseFloat(quantity);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    const error = new Error('quantity must be a positive number.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  // Load product and its ACTIVE rules in one query
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId, status: 'ACTIVE' },
    include: {
      priceRules: {
        where: { status: 'ACTIVE', organizationId },
        orderBy: { minQuantity: 'asc' },
      },
    },
  });

  if (!product) {
    const error = new Error('Product not found or inactive.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Walk tiers to find matching rule
  let appliedRule = null;
  for (const rule of product.priceRules) {
    const meetsMin = parsedQty >= rule.minQuantity;
    const meetsMax = rule.maxQuantity === null || parsedQty <= rule.maxQuantity;
    if (meetsMin && meetsMax) {
      appliedRule = rule;
      // Don't break early — keep iterating so the last (most-specific) matching tier wins
    }
  }

  const unitPrice = appliedRule ? appliedRule.pricePerUnit : product.defaultSellingPrice;
  const totalPrice = unitPrice * parsedQty;

  return {
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    productUnit: product.unit,
    defaultSellingPrice: product.defaultSellingPrice,
    quantity: parsedQty,
    unitPrice,
    totalPrice,
    fallback: appliedRule === null,
    appliedRule: appliedRule
      ? {
          id: appliedRule.id,
          minQuantity: appliedRule.minQuantity,
          maxQuantity: appliedRule.maxQuantity,
          pricePerUnit: appliedRule.pricePerUnit,
        }
      : null,
    availableRules: product.priceRules.map((r) => ({
      id: r.id,
      minQuantity: r.minQuantity,
      maxQuantity: r.maxQuantity,
      pricePerUnit: r.pricePerUnit,
      status: r.status,
    })),
  };
}
