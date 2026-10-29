import { prisma } from '../config/db.js';
import { GoogleGenAI } from '@google/genai';

// ─── In-memory cache (15-minute TTL per organization) ─────────────────────────
const cache = new Map(); // key: orgId → { data, expiresAt }
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ─── Active Indian Agricultural Season ────────────────────────────────────────
function resolveActiveSeason() {
  const month = new Date().getMonth(); // 0-indexed
  if (month >= 5 && month <= 8) return { code: 'KHARIF', name: 'Kharif (Monsoon Cycle)', peakNote: 'Monsoon triggers rapid basal fertilization and seed sowing. Peak sowing window in ~14 days.' };
  if (month >= 9 || month <= 1) return { code: 'RABI', name: 'Rabi (Winter Cycle)', peakNote: 'Post-monsoon winter sowing driven by residual soil moisture. Canal irrigation releases begin.' };
  return { code: 'ZAID', name: 'Zaid (Summer Cycle)', peakNote: 'Short summer cultivation. Demand concentrated in pesticides and bio-stimulants.' };
}

// ─── Main Data Aggregation ─────────────────────────────────────────────────────
async function aggregateOperationalContext(organizationId) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  const sixtyDaysAhead = new Date(now.getTime() + 60 * 86400000);

  // 1. Catalog + Live Batch Stock (parallel)
  const [products, recentOrderItems, last30dOrders, org] = await Promise.all([
    prisma.product.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: {
        category: true,
        batches: {
          where: { status: { notIn: ['EXPIRED', 'DEPLETED', 'BLOCKED'] } }
        }
      }
    }),
    prisma.salesOrderItem.findMany({
      where: {
        salesOrder: {
          organizationId,
          status: { in: ['CONFIRMED', 'DISPATCHED', 'INVOICED', 'PAID'] },
          orderDate: { gte: ninetyDaysAgo }
        }
      },
      select: { productId: true, quantity: true }
    }),
    prisma.salesOrder.findMany({
      where: {
        organizationId,
        status: { in: ['CONFIRMED', 'DISPATCHED', 'INVOICED', 'PAID'] },
        orderDate: { gte: thirtyDaysAgo }
      },
      select: { totalAmount: true, orderDate: true }
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true }
    })
  ]);

  // 2. Build per-product velocity map (last 90 days)
  const velocityMap = {};
  recentOrderItems.forEach(item => {
    velocityMap[item.productId] = (velocityMap[item.productId] || 0) + item.quantity;
  });

  // 3. Financial aggregates
  const monthlySalesValue = last30dOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const orderCountLast30d = last30dOrders.length;

  // 4. Build SKU-level intelligence
  let totalInventoryValuation = 0;
  let totalCurrentUnits = 0;
  const criticalSkus = [];
  const healthySkus = [];
  const expiryAlerts = [];

  for (const product of products) {
    const currentStock = product.batches.reduce((s, b) => s + (b.availableQuantity || 0), 0);
    const totalSold90d = velocityMap[product.id] || 0;
    const avgDailyOutflow = totalSold90d > 0 ? totalSold90d / 90 : (product.minimumStock || 100) / 30;
    const daysOfInventory = avgDailyOutflow > 0 ? Math.round((currentStock / avgDailyOutflow) * 10) / 10 : 999;
    const bufferCompliance = product.minimumStock > 0
      ? Math.round((currentStock / product.minimumStock) * 100)
      : 100;

    const valuation = currentStock * (product.defaultSellingPrice || 0);
    totalInventoryValuation += valuation;
    totalCurrentUnits += currentStock;

    // Determine stock status using relative metrics only
    let stockStatus;
    if (daysOfInventory < 14 || bufferCompliance < 50) stockStatus = 'CRITICAL';
    else if (bufferCompliance < 90) stockStatus = 'LOW';
    else if (bufferCompliance > 150) stockStatus = 'EXCESS';
    else stockStatus = 'HEALTHY';

    // Near-expiry batch detection (within 60 days)
    const nearExpiryBatches = product.batches.filter(b => new Date(b.expiryDate) <= sixtyDaysAhead && b.availableQuantity > 0);
    const nearExpiryUnits = nearExpiryBatches.reduce((s, b) => s + b.availableQuantity, 0);
    const nearestExpiry = nearExpiryBatches.length > 0
      ? Math.min(...nearExpiryBatches.map(b => Math.round((new Date(b.expiryDate) - now) / 86400000)))
      : null;

    if (nearExpiryUnits > 0 && nearestExpiry !== null) {
      expiryAlerts.push({
        sku: product.sku,
        productName: product.name,
        units: Math.round(nearExpiryUnits),
        daysToExpiry: nearestExpiry,
        recommendedAction: `Prioritize dispatch of ${Math.round(nearExpiryUnits)} ${product.unit}(s) in the next sales orders under FEFO to prevent write-off.`
      });
    }

    const skuData = {
      sku: product.sku,
      name: product.name,
      category: product.category?.name || 'General',
      unit: product.unit,
      currentStock: Math.round(currentStock),
      minimumBuffer: product.minimumStock || 0,
      bufferCompliancePercent: bufferCompliance,
      avgDailyOutflow: Math.round(avgDailyOutflow * 10) / 10,
      daysOfInventoryOnHand: daysOfInventory > 365 ? '>365' : daysOfInventory,
      stockStatus,
      nearExpiryUnits: Math.round(nearExpiryUnits),
      nearExpiryDays: nearestExpiry
    };

    if (stockStatus === 'CRITICAL' || stockStatus === 'LOW') {
      criticalSkus.push(skuData);
    } else {
      healthySkus.push({ sku: product.sku, name: product.name, bufferCompliancePercent: bufferCompliance, stockStatus });
    }
  }

  // 5. Warehouse-level relative metrics
  const inventoryCoverageRatio = monthlySalesValue > 0
    ? Math.round((totalInventoryValuation / monthlySalesValue) * 100) / 100
    : null;

  // Weighted average days-of-inventory across all SKUs (excluding >365)
  const validDays = criticalSkus
    .filter(s => typeof s.daysOfInventoryOnHand === 'number')
    .map(s => s.daysOfInventoryOnHand);
  const avgDaysOnHand = validDays.length > 0
    ? Math.round(validDays.reduce((a, b) => a + b, 0) / validDays.length * 10) / 10
    : null;

  // Sales velocity trend
  const last7dOrders = last30dOrders.filter(o => new Date(o.orderDate) >= new Date(now.getTime() - 7 * 86400000));
  const velocityTrend = last7dOrders.length > (orderCountLast30d / 4) * 1.3 ? 'ACCELERATING' : orderCountLast30d === 0 ? 'NO_DATA' : 'STABLE';

  const activeSeason = resolveActiveSeason();

  return {
    organizationName: org?.name || 'SmartAgri ERP',
    activeSeason,
    financialContext: {
      totalInventoryValuation: Math.round(totalInventoryValuation),
      monthlySalesRunRate: Math.round(monthlySalesValue),
      inventoryCoverageRatio,
      coverageRatioNote: inventoryCoverageRatio !== null
        ? `Current stock covers ${inventoryCoverageRatio}x of last month's sales value`
        : 'Insufficient sales history to compute coverage ratio'
    },
    warehouseContext: {
      totalProductsActive: products.length,
      totalUnitsInWarehouse: Math.round(totalCurrentUnits),
      criticalSkuCount: criticalSkus.length,
      healthySkuCount: healthySkus.length,
      avgDaysOfInventoryOnHand: avgDaysOnHand,
      targetDaysOfInventory: 30,
      coverageGapDays: avgDaysOnHand !== null ? Math.max(0, 30 - avgDaysOnHand) : null
    },
    criticalSkus,
    healthySkus: healthySkus.slice(0, 5), // limit payload size
    expiryAlerts,
    salesVelocity: {
      last30dOrders: orderCountLast30d,
      last7dOrders: last7dOrders.length,
      trend: velocityTrend,
      trendNote: velocityTrend === 'ACCELERATING'
        ? 'Order volume is accelerating — consistent with pre-sowing dealer stocking behaviour.'
        : velocityTrend === 'NO_DATA'
        ? 'No recent orders. Buffer thresholds estimated from product minimum stock settings.'
        : 'Order volume is at a stable baseline rate.'
    }
  };
}

// ─── Gemini Structured JSON Response Schema ────────────────────────────────────
const responseSchema = {
  type: 'object',
  properties: {
    overallStatus: {
      type: 'string',
      enum: ['CRITICAL', 'AMBER', 'HEALTHY', 'EXCELLENT']
    },
    statusRationale: { type: 'string' },
    executiveSummary: { type: 'string' },
    immediateActions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: ['P1_URGENT', 'P2_THIS_WEEK', 'P3_MONITOR'] },
          actionTitle: { type: 'string' },
          actionDetail: { type: 'string' },
          targetSku: { type: 'string' },
          recommendedQuantity: { type: 'number' }
        },
        required: ['priority', 'actionTitle', 'actionDetail']
      }
    },
    expiryAlerts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
          productName: { type: 'string' },
          units: { type: 'number' },
          daysToExpiry: { type: 'number' },
          recommendedAction: { type: 'string' }
        },
        required: ['sku', 'productName', 'units', 'daysToExpiry', 'recommendedAction']
      }
    },
    seasonalInsight: { type: 'string' },
    financialRiskNote: { type: 'string' }
  },
  required: ['overallStatus', 'statusRationale', 'executiveSummary', 'immediateActions']
};

// ─── Main Export: Generate AI Copilot Summary ─────────────────────────────────
export async function generateCopilotSummary(organizationId, forceRefresh = false) {
  // Check cache
  if (!forceRefresh) {
    const cached = cache.get(organizationId);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.data, fromCache: true };
    }
  }

  // Aggregate live operational context from PostgreSQL
  const context = await aggregateOperationalContext(organizationId);

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    // Return a graceful fallback if no key is configured
    return buildFallbackSummary(context);
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are an expert Agricultural Supply Chain Operations Copilot for a fertilizer and agro-input manufacturing or distribution company in India.
You have deep knowledge of Kharif, Rabi, and Zaid crop calendar demand patterns, FEFO (First-Expiry-First-Out) inventory management, and supply chain risk.

CRITICAL RULES:
1. NEVER judge inventory health by absolute currency amounts alone. Always use relative metrics: bufferCompliancePercent, inventoryCoverageRatio, daysOfInventoryOnHand vs targetDaysOfInventory (30 days).
2. Any product with daysOfInventoryOnHand < 14 (factory lead time) is ALWAYS a stockout risk, regardless of company size.
3. Generate confident, specific, actionable recommendations — avoid vague language.
4. Base all severity judgments on the company's own configured minimumBuffer thresholds — these are the manager-set targets, not industry averages.
5. Output ONLY valid JSON matching the schema. No markdown, no extra text.`;

  const userPrompt = JSON.stringify({
    operationalContext: {
      organizationName: context.organizationName,
      currentDate: new Date().toISOString().split('T')[0],
      activeSeason: context.activeSeason,
      factoryLeadTimeDays: 14,
      targetBufferDays: context.warehouseContext.targetDaysOfInventory
    },
    financialContext: context.financialContext,
    warehouseContext: context.warehouseContext,
    criticalSkus: context.criticalSkus,
    healthySkus: context.healthySkus,
    expiryAlerts: context.expiryAlerts,
    salesVelocity: context.salesVelocity
  });

  const candidateModels = ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      });

      const raw = response.text;
      const parsed = JSON.parse(raw);

      const result = {
        ...parsed,
        _meta: {
          generatedAt: new Date().toISOString(),
          fromCache: false,
          modelUsed: model,
          activeSeason: context.activeSeason.name,
          skusAnalyzed: context.warehouseContext.totalProductsActive
        }
      };

      // Store in cache
      cache.set(organizationId, {
        data: result,
        expiresAt: Date.now() + CACHE_TTL_MS
      });

      return result;
    } catch (err) {
      console.warn(`[AiCopilot] Error with model ${model}:`, err.message);
      lastError = err;
    }
  }

  console.error('[AiCopilot] All Gemini candidate models failed:', lastError?.message);
  return buildFallbackSummary(context);
}

// ─── Fallback: Rule-based local summary when Gemini is unavailable ─────────────
function buildFallbackSummary(context) {
  const critical = context.criticalSkus.filter(s => s.stockStatus === 'CRITICAL');
  const low = context.criticalSkus.filter(s => s.stockStatus === 'LOW');
  const hasKey = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;

  let overallStatus = 'HEALTHY';
  if (critical.length > 0) overallStatus = 'CRITICAL';
  else if (low.length > 0) overallStatus = 'AMBER';

  return {
    overallStatus,
    statusRationale: hasKey
      ? `Gemini API temporarily unavailable. Showing local analysis: ${critical.length} critical and ${low.length} low-stock SKUs detected.`
      : `Gemini API key not configured. Add GEMINI_API_KEY to backend/.env to enable AI insights. Showing local analysis.`,
    executiveSummary: `${context.organizationName} has ${context.warehouseContext.totalProductsActive} active products with ${context.warehouseContext.criticalSkuCount} requiring immediate attention. ${context.expiryAlerts.length > 0 ? `${context.expiryAlerts.length} near-expiry batch alerts require FEFO dispatch priority.` : ''}`,
    immediateActions: critical.slice(0, 3).map(sku => ({
      priority: 'P1_URGENT',
      actionTitle: `Replenish ${sku.name}`,
      actionDetail: `Buffer compliance is ${sku.bufferCompliancePercent}% of minimum target (${sku.minimumBuffer} ${sku.unit}). Current stock will deplete in approximately ${sku.daysOfInventoryOnHand} days.`,
      targetSku: sku.sku,
      recommendedQuantity: Math.max(50, Math.ceil((sku.minimumBuffer - sku.currentStock) * 1.2 / 50) * 50)
    })),
    expiryAlerts: context.expiryAlerts,
    seasonalInsight: context.activeSeason.peakNote,
    financialRiskNote: context.financialContext.coverageRatioNote,
    _meta: {
      generatedAt: new Date().toISOString(),
      fromCache: false,
      isFallback: true,
      activeSeason: context.activeSeason.name,
      skusAnalyzed: context.warehouseContext.totalProductsActive
    }
  };
}
