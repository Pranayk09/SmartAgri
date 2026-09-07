import { prisma } from '../config/db.js';

// Number of days ahead to flag a batch as "expiring soon"
const EXPIRING_SOON_THRESHOLD_DAYS = 30;

// ==========================================
// UTILITY: Expiry Classification
// ==========================================

/**
 * Classifies a batch expiry date into one of three states.
 * @param {Date|string} expiryDate
 * @returns {'EXPIRED' | 'EXPIRING_SOON' | 'AVAILABLE'}
 */
export function classifyExpiry(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);

  if (expiry <= now) {
    return 'EXPIRED';
  }

  const diffMs = expiry - now;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= EXPIRING_SOON_THRESHOLD_DAYS) {
    return 'EXPIRING_SOON';
  }

  return 'AVAILABLE';
}

// ==========================================
// 1. SYNC BATCH EXPIRY STATUSES
// ==========================================

/**
 * Scans all active batches for an organization and updates their status
 * based on current date vs expiry date. Skips DEPLETED and BLOCKED batches.
 *
 * @param {string} organizationId
 * @returns {{ updated: number, expired: number, expiringSoon: number, normal: number }}
 */
export async function syncBatchExpiryStatuses(organizationId) {
  // Fetch all batches that are eligible for expiry classification
  const batches = await prisma.productBatch.findMany({
    where: {
      organizationId,
      status: {
        notIn: ['DEPLETED', 'BLOCKED'],
      },
    },
    select: {
      id: true,
      expiryDate: true,
      status: true,
    },
  });

  let expired = 0;
  let expiringSoon = 0;
  let normal = 0;
  let updated = 0;

  // Group updates to minimize DB round-trips
  const toUpdate = [];

  for (const batch of batches) {
    const newStatus = classifyExpiry(batch.expiryDate);

    if (newStatus !== batch.status) {
      toUpdate.push({ id: batch.id, newStatus });
    }

    if (newStatus === 'EXPIRED') expired++;
    else if (newStatus === 'EXPIRING_SOON') expiringSoon++;
    else normal++;
  }

  // Perform all updates inside a single transaction
  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map((b) =>
        prisma.productBatch.update({
          where: { id: b.id },
          data: { status: b.newStatus },
        })
      )
    );
    updated = toUpdate.length;
  }

  return { updated, expired, expiringSoon, normal };
}

// ==========================================
// 2. EXPIRY DASHBOARD STATS
// ==========================================

/**
 * Returns aggregated expiry stats for the organization's inventory.
 * Provides both totals and a per-product breakdown.
 *
 * @param {string} organizationId
 * @returns {object} Dashboard data
 */
export async function getExpiryDashboard(organizationId) {
  const batches = await prisma.productBatch.findMany({
    where: { organizationId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true,
        },
      },
    },
  });

  const summary = {
    expired: { count: 0, totalQuantity: 0 },
    expiringSoon: { count: 0, totalQuantity: 0 },
    normal: { count: 0, totalQuantity: 0 },
    depleted: { count: 0, totalQuantity: 0 },
    blocked: { count: 0, totalQuantity: 0 },
  };

  // Per-product breakdown map: productId -> stats
  const productMap = {};

  for (const batch of batches) {
    const pid = batch.product.id;
    if (!productMap[pid]) {
      productMap[pid] = {
        productId: pid,
        productName: batch.product.name,
        sku: batch.product.sku,
        unit: batch.product.unit,
        expired: 0,
        expiringSoon: 0,
        normal: 0,
        totalAvailable: 0,
      };
    }

    const liveStatus = classifyExpiry(batch.expiryDate);
    const qty = batch.availableQuantity;

    if (batch.status === 'DEPLETED') {
      summary.depleted.count++;
      summary.depleted.totalQuantity += qty;
    } else if (batch.status === 'BLOCKED') {
      summary.blocked.count++;
      summary.blocked.totalQuantity += qty;
    } else if (liveStatus === 'EXPIRED') {
      summary.expired.count++;
      summary.expired.totalQuantity += qty;
      productMap[pid].expired += qty;
    } else if (liveStatus === 'EXPIRING_SOON') {
      summary.expiringSoon.count++;
      summary.expiringSoon.totalQuantity += qty;
      productMap[pid].expiringSoon += qty;
      productMap[pid].totalAvailable += qty;
    } else {
      summary.normal.count++;
      summary.normal.totalQuantity += qty;
      productMap[pid].normal += qty;
      productMap[pid].totalAvailable += qty;
    }
  }

  return {
    summary,
    byProduct: Object.values(productMap),
    totalBatches: batches.length,
  };
}
