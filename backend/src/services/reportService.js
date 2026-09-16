import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getReportData = async (organizationId, reportType) => {
  switch (reportType) {
    case 'inventory-expiry':
      return await getInventoryExpiryReport(organizationId);
    case 'sales-volume':
      return await getSalesVolumeReport(organizationId);
    case 'credit-risk':
      return await getCreditRiskReport(organizationId);
    case 'collections':
      return await getCollectionsReport(organizationId);
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
};

const getInventoryExpiryReport = async (organizationId) => {
  const batches = await prisma.productBatch.findMany({
    where: {
      organizationId,
      status: { notIn: ['DEPLETED'] }
    },
    include: {
      product: {
        include: { category: true }
      }
    },
    orderBy: { expiryDate: 'asc' }
  });

  return batches.map(b => ({
    'Batch Number': b.batchNumber,
    'Product': b.product.name,
    'Category': b.product.category.name,
    'SKU': b.product.sku,
    'Available Qty': b.availableQuantity,
    'Unit': b.product.unit,
    'Manufacturing Date': b.manufacturingDate.toISOString().split('T')[0],
    'Expiry Date': b.expiryDate.toISOString().split('T')[0],
    'Status': b.status
  }));
};

const getSalesVolumeReport = async (organizationId) => {
  const items = await prisma.salesOrderItem.findMany({
    where: {
      salesOrder: {
        organizationId,
        status: { in: ['CONFIRMED', 'DISPATCHED', 'INVOICED', 'PAID'] }
      }
    },
    include: {
      product: true,
      salesOrder: { include: { customer: true } }
    },
    orderBy: { salesOrder: { orderDate: 'desc' } }
  });

  return items.map(i => ({
    'Order Number': i.salesOrder.orderNumber,
    'Date': i.salesOrder.orderDate.toISOString().split('T')[0],
    'Customer': i.salesOrder.customer.name,
    'Product': i.product.name,
    'Quantity': i.quantity,
    'Unit Price': i.unitPrice,
    'Subtotal': i.subtotal,
    'Status': i.salesOrder.status
  }));
};

const getCreditRiskReport = async (organizationId) => {
  const credits = await prisma.customerCredit.findMany({
    where: { organizationId },
    include: { customer: true },
    orderBy: { outstandingAmount: 'desc' }
  });

  return credits.map(c => {
    const utilization = c.creditLimit > 0 ? (c.outstandingAmount / c.creditLimit) * 100 : 0;
    return {
      'Customer Name': c.customer.name,
      'Customer Type': c.customer.type,
      'Credit Limit': c.creditLimit,
      'Outstanding Amount': c.outstandingAmount,
      'Available Credit': c.creditLimit - c.outstandingAmount,
      'Utilization %': utilization.toFixed(2),
      'Status': c.status
    };
  });
};

const getCollectionsReport = async (organizationId) => {
  const payments = await prisma.payment.findMany({
    where: { organizationId },
    include: { 
      customer: true,
      invoice: true
    },
    orderBy: { paymentDate: 'desc' }
  });

  return payments.map(p => ({
    'Payment ID': p.id,
    'Date': p.paymentDate.toISOString().split('T')[0],
    'Customer': p.customer.name,
    'Invoice Number': p.invoice.invoiceNumber,
    'Amount Paid': p.amount,
    'Payment Method': p.paymentMethod,
    'Reference': p.referenceNumber || 'N/A'
  }));
};
