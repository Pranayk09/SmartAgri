import { prisma } from '../config/db.js';

// ==========================================
// 1. VALIDATE CREDIT FOR ORDER
// ==========================================

/**
 * Validates whether a customer has sufficient credit to place an order.
 * Non-mutating. Used in Phase 9's POST /api/sales/orders/check.
 *
 * @param {string} organizationId
 * @param {string} customerId
 * @param {number} orderAmount
 * @returns {{ approved: boolean, availableCredit: number, creditLimit: number, outstandingAmount: number, message: string }}
 */
export async function validateCreditForOrder(organizationId, customerId, orderAmount) {
  const credit = await prisma.customerCredit.findFirst({
    where: { customerId, organizationId },
    include: {
      customer: {
        select: { name: true, status: true },
      },
    },
  });

  if (!credit) {
    const error = new Error('No credit record found for this customer.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (credit.customer.status !== 'ACTIVE') {
    const error = new Error(`Customer account is ${credit.customer.status}. Orders cannot be placed.`);
    error.statusCode = 400;
    error.code = 'FORBIDDEN';
    throw error;
  }

  if (credit.status === 'SUSPENDED') {
    const error = new Error(`Customer credit is SUSPENDED. Contact Finance Manager.`);
    error.statusCode = 400;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const availableCredit = credit.creditLimit - credit.outstandingAmount;
  const parsedOrderAmount = parseFloat(orderAmount);
  const approved = parsedOrderAmount <= availableCredit;

  const result = {
    approved,
    customerName: credit.customer.name,
    creditLimit: credit.creditLimit,
    outstandingAmount: credit.outstandingAmount,
    availableCredit,
    orderAmount: parsedOrderAmount,
    paymentTermsDays: credit.paymentTermsDays,
    creditStatus: credit.status,
  };

  if (!approved) {
    const error = new Error(
      `Order amount (₹${parsedOrderAmount.toLocaleString('en-IN')}) exceeds available credit limit (₹${availableCredit.toLocaleString('en-IN')}).`
    );
    error.statusCode = 400;
    error.code = 'CREDIT_LIMIT_EXCEEDED';
    error.details = result;
    throw error;
  }

  return result;
}

// ==========================================
// 2. CREDIT SUMMARY DASHBOARD
// ==========================================

/**
 * Returns organisation-wide credit health stats.
 *
 * @param {string} organizationId
 * @returns {object} Credit summary for dashboard KPI cards
 */
export async function getCreditSummary(organizationId) {
  const credits = await prisma.customerCredit.findMany({
    where: { organizationId },
    include: {
      customer: {
        select: { id: true, name: true, type: true, status: true },
      },
    },
  });

  let totalCreditExposure = 0;
  let totalOutstanding = 0;
  let overLimitCount = 0;
  let nearLimitCount = 0; // >80% utilization
  const customerBreakdown = [];

  for (const credit of credits) {
    const available = credit.creditLimit - credit.outstandingAmount;
    const utilizationPct =
      credit.creditLimit > 0
        ? (credit.outstandingAmount / credit.creditLimit) * 100
        : 0;

    totalCreditExposure += credit.creditLimit;
    totalOutstanding += credit.outstandingAmount;

    if (credit.outstandingAmount > credit.creditLimit) overLimitCount++;
    else if (utilizationPct >= 80) nearLimitCount++;

    customerBreakdown.push({
      customerId: credit.customer.id,
      customerName: credit.customer.name,
      customerType: credit.customer.type,
      customerStatus: credit.customer.status,
      creditLimit: credit.creditLimit,
      outstandingAmount: credit.outstandingAmount,
      availableCredit: available,
      utilizationPct: Math.round(utilizationPct * 10) / 10,
      paymentTermsDays: credit.paymentTermsDays,
      creditStatus: credit.status,
    });
  }

  return {
    summary: {
      totalCustomers: credits.length,
      totalCreditExposure,
      totalOutstanding,
      totalAvailable: totalCreditExposure - totalOutstanding,
      overLimitCount,
      nearLimitCount,
    },
    customers: customerBreakdown.sort(
      (a, b) => b.utilizationPct - a.utilizationPct // highest utilization first
    ),
  };
}
