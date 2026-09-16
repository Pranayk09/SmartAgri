import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardKPIs = async (organizationId) => {
  // 1. Active Inventory
  const inventoryResult = await prisma.productBatch.aggregate({
    _sum: { availableQuantity: true },
    where: { 
      organizationId,
      status: { notIn: ['EXPIRED', 'DEPLETED'] }
    },
  });
  const activeInventory = inventoryResult._sum.availableQuantity || 0;

  // 2. Pending Sales (CONFIRMED status)
  const salesResult = await prisma.salesOrder.aggregate({
    _sum: { totalAmount: true },
    where: { 
      organizationId,
      status: 'CONFIRMED'
    },
  });
  const pendingSales = salesResult._sum.totalAmount || 0;

  // 3. Credit Utilization
  const creditResult = await prisma.customerCredit.aggregate({
    _sum: { outstandingAmount: true },
    where: { organizationId },
  });
  const creditUtilization = creditResult._sum.outstandingAmount || 0;

  // 4. Active Distributors
  const activeDistributors = await prisma.customer.count({
    where: {
      organizationId,
      type: 'DISTRIBUTOR',
      status: 'ACTIVE'
    },
  });

  // Get order count for Pending Sales label
  const pendingOrdersCount = await prisma.salesOrder.count({
    where: {
      organizationId,
      status: 'CONFIRMED'
    }
  });

  return {
    activeInventory,
    pendingSales,
    pendingOrdersCount,
    creditUtilization,
    activeDistributors
  };
};

export const getDashboardAlerts = async (organizationId) => {
  const alerts = [];

  // Expiring batches in next 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringBatches = await prisma.productBatch.findMany({
    where: {
      organizationId,
      status: { notIn: ['EXPIRED', 'DEPLETED'] },
      availableQuantity: { gt: 0 },
      expiryDate: { lte: thirtyDaysFromNow }
    },
    include: {
      product: true
    },
    take: 5,
    orderBy: { expiryDate: 'asc' }
  });

  expiringBatches.forEach(batch => {
    const daysLeft = Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    alerts.push({
      id: `exp-${batch.id}`,
      type: 'warning',
      title: 'Batch EXPIRY warning',
      message: `Batch #${batch.batchNumber} (${batch.product.name}) - ${batch.availableQuantity} ${batch.product.unit} expires in ${daysLeft} days.`,
      time: 'Just now'
    });
  });

  // Credit limit warnings (> 90% utilization)
  const allCredits = await prisma.customerCredit.findMany({
    where: { organizationId },
    include: { customer: true }
  });

  allCredits.forEach(credit => {
    if (credit.creditLimit > 0) {
      const utilizationPercent = (credit.outstandingAmount / credit.creditLimit) * 100;
      if (utilizationPercent > 90) {
        alerts.push({
          id: `cred-${credit.id}`,
          type: 'error',
          title: 'Limit Check Warning',
          message: `Distributor "${credit.customer.name}" is at ${utilizationPercent.toFixed(1)}% of their ₹${credit.creditLimit} limit.`,
          time: 'Just now'
        });
      }
    }
  });

  // Sort alerts: errors first, then warnings
  alerts.sort((a, b) => {
    if (a.type === 'error' && b.type !== 'error') return -1;
    if (a.type !== 'error' && b.type === 'error') return 1;
    return 0;
  });

  return alerts.slice(0, 10); // Return top 10 alerts
};
