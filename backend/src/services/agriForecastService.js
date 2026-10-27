import { prisma } from '../config/db.js';

/**
 * Standard Agricultural Seasons Calendar & Profiles
 */
export const SEASONS = {
  KHARIF: {
    code: 'KHARIF',
    name: 'Kharif (Monsoon Cycle)',
    primaryCrops: ['Paddy (Rice)', 'Cotton', 'Soybean', 'Maize', 'Groundnut'],
    startMonth: 5, // June (0-indexed: May/June)
    peakSowingWeek: 26, // Late June / Early July
    surgeCategories: ['Fertilizers', 'Seeds', 'Bio-Stimulants'],
    description: 'Southwest monsoon arrival triggers rapid basal fertilization and seed sowing.'
  },
  RABI: {
    code: 'RABI',
    name: 'Rabi (Winter Cycle)',
    primaryCrops: ['Wheat', 'Mustard', 'Gram / Pulses', 'Barley'],
    startMonth: 9, // October (0-indexed: Sep/Oct)
    peakSowingWeek: 43, // Late October / Early November
    surgeCategories: ['Fertilizers', 'Seeds', 'Equipment'],
    description: 'Post-monsoon winter sowing driven by residual soil moisture and irrigation canal releases.'
  },
  ZAID: {
    code: 'ZAID',
    name: 'Zaid (Summer Cycle)',
    primaryCrops: ['Fodder', 'Vegetables', 'Melons', 'Pulses'],
    startMonth: 2, // March (0-indexed)
    peakSowingWeek: 12, // Mid March
    surgeCategories: ['Pesticides', 'Bio-Stimulants', 'Equipment'],
    description: 'Hot summer cultivation focused on quick-turnaround horticultural crops.'
  }
};

/**
 * Normal Distribution Critical Value (Z-Score) for Target Service Level
 */
function getZScore(serviceLevel = 95) {
  if (serviceLevel >= 99) return 2.326;
  if (serviceLevel >= 98) return 2.054;
  if (serviceLevel >= 95) return 1.645;
  if (serviceLevel >= 90) return 1.282;
  return 1.645;
}

/**
 * Determine Active Season from current date or scenario override
 */
export function resolveActiveSeason(seasonOverride) {
  if (seasonOverride && SEASONS[seasonOverride.toUpperCase()]) {
    return SEASONS[seasonOverride.toUpperCase()];
  }
  const currentMonth = new Date().getMonth(); // 0 to 11
  if (currentMonth >= 5 && currentMonth <= 8) return SEASONS.KHARIF;
  if (currentMonth >= 9 || currentMonth <= 1) return SEASONS.RABI;
  return SEASONS.ZAID;
}

/**
 * Calculate Gaussian Sowing Impulse Wave
 * Models the steep bell-curve surge in demand during the 3-week peak sowing window
 */
function calculateSowingSurgeMultiplier(dayOffset, monsoonDeltaDays = 0, acreageFactor = 1.0, categoryName = 'Fertilizers') {
  // Peak arrival is shifted by the monsoon delta (delayed monsoon pushes peak back, early brings it forward)
  const peakDay = 14 + monsoonDeltaDays; 
  const sigmaDays = 10; // Width of the primary sowing window (~20 days total)
  
  // Base category sensitivity multipliers
  let categorySensitivity = 3.5; // Fertilizers surge 3.5x - 5x
  if (categoryName.toLowerCase().includes('seed')) categorySensitivity = 4.5;
  else if (categoryName.toLowerCase().includes('pesticide')) categorySensitivity = 2.2;
  else if (categoryName.toLowerCase().includes('bio')) categorySensitivity = 2.8;
  
  const distance = Math.pow(dayOffset - peakDay, 2);
  const surge = (categorySensitivity - 1.0) * Math.exp(-distance / (2 * Math.pow(sigmaDays, 2)));
  
  return Math.max(0, surge * acreageFactor);
}

/**
 * Main Forecast & Dynamic Buffer Engine
 */
export async function calculateAgriForecast(organizationId, options = {}) {
  const {
    season: seasonParam,
    monsoonDeltaDays = 0, // -15 (early) to +21 (delayed)
    acreageGrowthPercent = 0, // -20% to +30%
    serviceLevel = 95, // 90%, 95%, 98%, 99%
    leadTimeDays = 14 // standard production & QC lead time
  } = options;

  const activeSeason = resolveActiveSeason(seasonParam);
  const zScore = getZScore(serviceLevel);
  const acreageFactor = 1.0 + (parseFloat(acreageGrowthPercent) || 0) / 100;
  const leadTime = parseInt(leadTimeDays, 10) || 14;
  const deltaDays = parseInt(monsoonDeltaDays, 10) || 0;

  // 1. Fetch Products & Categories
  const products = await prisma.product.findMany({
    where: { organizationId, status: 'ACTIVE' },
    include: {
      category: true,
      batches: {
        where: {
          status: { notIn: ['EXPIRED', 'DEPLETED', 'BLOCKED'] },
          availableQuantity: { gt: 0 }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  // 2. Fetch Historical Sales velocity
  const salesItems = await prisma.salesOrderItem.findMany({
    where: {
      salesOrder: {
        organizationId,
        status: { in: ['CONFIRMED', 'DISPATCHED', 'INVOICED', 'PAID'] }
      }
    },
    select: {
      productId: true,
      quantity: true,
      salesOrder: {
        select: { orderDate: true }
      }
    }
  });

  // Calculate historical baseline daily run rate per product
  const productSalesMap = {};
  salesItems.forEach(item => {
    productSalesMap[item.productId] = (productSalesMap[item.productId] || 0) + item.quantity;
  });

  // 3. Process SKU-Level Forecasts
  const skuForecasts = [];
  let totalProjected30dDemand = 0;
  let totalProjected60dDemand = 0;
  let totalCurrentInventoryUnits = 0;
  let totalCapitalAtStockoutRisk = 0;
  let imminentStockoutsCount = 0;
  let belowBufferCount = 0;
  let optimalCount = 0;

  // Global daily aggregate projection (for 60-day visual curve)
  const timelineDays = 60;
  const dailyProjections = Array.from({ length: timelineDays }, (_, i) => ({
    day: i + 1,
    date: new Date(Date.now() + (i + 1) * 86400000).toISOString().split('T')[0],
    medianDemand: 0,
    upperDemand: 0,
    lowerDemand: 0,
    fertilizerDemand: 0,
    seedsDemand: 0,
    pesticideDemand: 0
  }));

  for (const product of products) {
    // Current available warehouse stock
    const currentStock = product.batches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0);
    totalCurrentInventoryUnits += currentStock;

    // Baseline daily demand estimation
    // If historical order volume exists, average over 90 days; otherwise ground on minimumStock / 30
    const totalSold = productSalesMap[product.id] || 0;
    const baseDailyDemand = totalSold > 0 
      ? Math.max(2, totalSold / 45) 
      : Math.max(3, (product.minimumStock || 100) / 30);

    const categoryName = product.category?.name || 'Fertilizers';

    // Generate 60-day daily expected demand array for this SKU
    const skuDailyCurve = [];
    let sku30dDemand = 0;
    let sku60dDemand = 0;

    for (let d = 0; d < timelineDays; d++) {
      const surgeMultiplier = calculateSowingSurgeMultiplier(d, deltaDays, acreageFactor, categoryName);
      const expectedDayDemand = baseDailyDemand * (1 + surgeMultiplier);

      skuDailyCurve.push(expectedDayDemand);
      if (d < 30) sku30dDemand += expectedDayDemand;
      sku60dDemand += expectedDayDemand;

      // Accumulate into global daily projections
      dailyProjections[d].medianDemand += expectedDayDemand;
      dailyProjections[d].upperDemand += expectedDayDemand * 1.22;
      dailyProjections[d].lowerDemand += expectedDayDemand * 0.82;

      if (categoryName.toLowerCase().includes('fertilizer')) {
        dailyProjections[d].fertilizerDemand += expectedDayDemand;
      } else if (categoryName.toLowerCase().includes('seed')) {
        dailyProjections[d].seedsDemand += expectedDayDemand;
      } else {
        dailyProjections[d].pesticideDemand += expectedDayDemand;
      }
    }

    // Dynamic Buffer & ROP Calculation
    // Average demand during lead time window
    const leadTimeSlice = skuDailyCurve.slice(0, leadTime);
    const avgDemandInLeadTime = leadTimeSlice.reduce((a, b) => a + b, 0) / leadTime;
    
    // Variance/Std Dev of lead time demand
    const variance = leadTimeSlice.reduce((acc, val) => acc + Math.pow(val - avgDemandInLeadTime, 2), 0) / leadTime;
    const stdDevDemand = Math.sqrt(variance) || (avgDemandInLeadTime * 0.25);

    // Dynamic Safety Stock = Z * sqrt(LeadTime) * StdDev * (1 + Sowing Surge Peak Weight)
    const peakSurgeInLeadTime = Math.max(...leadTimeSlice.map(d => d / baseDailyDemand));
    const dynamicSafetyStock = Math.ceil(zScore * Math.sqrt(leadTime) * stdDevDemand * (1 + (peakSurgeInLeadTime - 1) * 0.2));

    // Dynamic Reorder Point = (LeadTime * AvgDemand) + DynamicSafetyStock
    const dynamicROP = Math.ceil((avgDemandInLeadTime * leadTime) + dynamicSafetyStock);

    // Stockout Evaluation & Run-out Days
    const runoutDays = avgDemandInLeadTime > 0 
      ? Math.round((currentStock / avgDemandInLeadTime) * 10) / 10 
      : 999;

    let stockStatus = 'OPTIMAL';
    let statusLabel = 'Optimal Buffer';
    let statusSeverity = 'success'; // 'danger', 'warning', 'success', 'info'
    let recommendedBatchSize = 0;

    if (currentStock < (avgDemandInLeadTime * leadTime * 0.7) || runoutDays < leadTime) {
      stockStatus = 'STOCKOUT_IMMINENT';
      statusLabel = 'Stockout Imminent';
      statusSeverity = 'danger';
      imminentStockoutsCount++;
      const deficit = dynamicROP - currentStock;
      recommendedBatchSize = Math.max(100, Math.ceil((deficit * 1.25) / 50) * 50);
      totalCapitalAtStockoutRisk += deficit * product.defaultSellingPrice;
    } else if (currentStock < dynamicROP) {
      stockStatus = 'BELOW_BUFFER';
      statusLabel = 'Below Dynamic ROP';
      statusSeverity = 'warning';
      belowBufferCount++;
      const deficit = dynamicROP - currentStock;
      recommendedBatchSize = Math.max(50, Math.ceil(deficit / 50) * 50);
      totalCapitalAtStockoutRisk += deficit * 0.5 * product.defaultSellingPrice;
    } else if (currentStock > (dynamicROP * 2.5)) {
      stockStatus = 'OVERSTOCKED';
      statusLabel = 'Excess Inventory';
      statusSeverity = 'info';
    } else {
      optimalCount++;
    }

    totalProjected30dDemand += sku30dDemand;
    totalProjected60dDemand += sku60dDemand;

    skuForecasts.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      category: categoryName,
      unit: product.unit,
      sellingPrice: product.defaultSellingPrice,
      currentStock: Math.round(currentStock),
      projected30dDemand: Math.round(sku30dDemand),
      projected60dDemand: Math.round(sku60dDemand),
      avgDailyDemandInLeadTime: Math.round(avgDemandInLeadTime * 10) / 10,
      dynamicSafetyStock,
      dynamicROP,
      runoutDays,
      leadTimeDays: leadTime,
      stockStatus,
      statusLabel,
      statusSeverity,
      recommendedBatchSize,
      batchesCount: product.batches.length
    });
  }

  // Round summary numbers
  totalProjected30dDemand = Math.round(totalProjected30dDemand);
  totalProjected60dDemand = Math.round(totalProjected60dDemand);
  totalCapitalAtStockoutRisk = Math.round(totalCapitalAtStockoutRisk);

  return {
    scenario: {
      season: activeSeason,
      monsoonDeltaDays: deltaDays,
      acreageGrowthPercent: parseFloat(acreageGrowthPercent) || 0,
      serviceLevel,
      leadTimeDays: leadTime,
      activeCrops: activeSeason.primaryCrops
    },
    summary: {
      activeSeasonName: activeSeason.name,
      totalSkusAnalyzed: products.length,
      currentTotalStock: Math.round(totalCurrentInventoryUnits),
      projected30dDemand: totalProjected30dDemand,
      projected60dDemand: totalProjected60dDemand,
      projectedSurgeRatio: totalProjected30dDemand > 0 ? (totalProjected30dDemand / (totalCurrentInventoryUnits || 1)).toFixed(2) : '1.0',
      capitalAtStockoutRisk: totalCapitalAtStockoutRisk,
      imminentStockoutsCount,
      belowBufferCount,
      optimalCount,
      healthIndexPercent: products.length > 0 ? Math.round((optimalCount / products.length) * 100) : 100
    },
    dailyTimeline: dailyProjections.map(d => ({
      ...d,
      medianDemand: Math.round(d.medianDemand),
      upperDemand: Math.round(d.upperDemand),
      lowerDemand: Math.round(d.lowerDemand),
      fertilizerDemand: Math.round(d.fertilizerDemand),
      seedsDemand: Math.round(d.seedsDemand),
      pesticideDemand: Math.round(d.pesticideDemand)
    })),
    skus: skuForecasts
  };
}

/**
 * 1-Click Scheduled Batch Creation
 * Directly converts an AI-recommended replenishment batch into an active/pending ProductBatch
 */
export async function scheduleReplenishmentBatch(organizationId, userId, payload) {
  const { productId, batchSize, leadTimeDays = 14, notes } = payload;

  if (!productId || !batchSize || batchSize <= 0) {
    const error = new Error('Product ID and positive Batch Size are required.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId },
    include: { category: true }
  });

  if (!product) {
    const error = new Error('Product not found or access denied.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const qty = parseFloat(batchSize);
  const now = new Date();
  
  // Expiry set to 18 months standard for agrochemicals/fertilizers
  const expiry = new Date(now);
  expiry.setMonth(now.getMonth() + 18);

  const timestampSuffix = Math.floor(1000 + Math.random() * 9000);
  const batchNumber = `FCST-${product.sku.slice(0, 6)}-${timestampSuffix}`.toUpperCase();

  return await prisma.$transaction(async (tx) => {
    // Create new batch
    const newBatch = await tx.productBatch.create({
      data: {
        organizationId,
        productId: product.id,
        batchNumber,
        manufacturingDate: now,
        expiryDate: expiry,
        initialQuantity: qty,
        availableQuantity: qty,
        reservedQuantity: 0,
        status: 'AVAILABLE'
      }
    });

    // Record Stock Movement
    await tx.stockMovement.create({
      data: {
        organizationId,
        productId: product.id,
        batchId: newBatch.id,
        type: 'STOCK_IN',
        quantity: qty,
        referenceType: 'AGRI_FORECAST_REPLENISHMENT',
        referenceId: newBatch.id,
        reason: `AgriForecast Sowing Buffer Replenishment (Lead Time: ${leadTimeDays}d). ${notes || ''}`,
        createdBy: userId
      }
    });

    // Create Audit Log
    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'BATCH_REPLENISHED_VIA_FORECAST',
        entityType: 'ProductBatch',
        entityId: newBatch.id,
        metadata: {
          batchNumber,
          quantity: qty,
          productId: product.id,
          productSku: product.sku,
          trigger: 'AGRI_FORECAST_AI'
        }
      }
    });

    return {
      batch: newBatch,
      product: {
        name: product.name,
        sku: product.sku,
        unit: product.unit
      }
    };
  });
}
