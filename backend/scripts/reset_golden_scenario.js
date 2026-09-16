/**
 * Cleanup script - resets Golden Scenario test data
 * Cancels any orphaned CONFIRMED orders for Golden Agro Ltd. and resets batch quantities.
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient();

const org = await prisma.organization.findUnique({ where: { code: 'AGRI_CORP' } });

// 1. Find all non-terminal orders for Golden Agro Ltd.
const customer = await prisma.customer.findFirst({
  where: { organizationId: org.id, name: 'Golden Agro Ltd.' },
});

if (customer) {
  const orders = await prisma.salesOrder.findMany({
    where: {
      organizationId: org.id,
      customerId: customer.id,
      status: { in: ['DRAFT', 'CONFIRMED'] },
    },
    include: { items: { include: { allocations: true } } },
  });

  for (const order of orders) {
    console.log(`Cleaning up order ${order.orderNumber} (status: ${order.status})`);

    if (order.status === 'CONFIRMED') {
      // Release all batch reservations atomically
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          for (const alloc of item.allocations) {
            const batch = await tx.productBatch.findUnique({ where: { id: alloc.batchId } });
            const newReserved = Math.max(0, batch.reservedQuantity - alloc.quantity);
            const newAvailable = batch.availableQuantity + alloc.quantity;
            await tx.productBatch.update({
              where: { id: alloc.batchId },
              data: {
                reservedQuantity: newReserved,
                availableQuantity: newAvailable,
                status: newAvailable > 0 ? 'AVAILABLE' : batch.status,
              },
            });
            console.log(`  Released ${alloc.quantity} KG from batch ${alloc.batchId}`);
          }
        }

        // Delete allocations
        await tx.batchAllocation.deleteMany({
          where: { salesOrderItem: { salesOrderId: order.id } },
        });

        // Cancel order
        await tx.salesOrder.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });

        // Delete RESERVATION stock movements for this order
        await tx.stockMovement.deleteMany({
          where: { referenceType: 'SALES_ORDER', referenceId: order.id, type: 'RESERVATION' },
        });
      });
    } else {
      // Just cancel DRAFT orders
      await prisma.salesOrder.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
    }
    console.log(`✅ Order ${order.orderNumber} cleaned up`);
  }

  // 2. Reset customer credit outstandingAmount to 0
  await prisma.customerCredit.update({
    where: { customerId: customer.id },
    data: { outstandingAmount: 0 },
  });
  console.log('✅ Customer credit reset to 0');
}

// 3. Reset B001, B002 to initial quantities
const product = await prisma.product.findFirst({
  where: { organizationId: org.id, sku: 'NPK-19-19-19' },
});

if (product) {
  const batchReset = [
    { batchNumber: 'B001', qty: 4000 },
    { batchNumber: 'B002', qty: 6000 },
    { batchNumber: 'B003', qty: 8000 },
  ];
  for (const b of batchReset) {
    const batch = await prisma.productBatch.findFirst({
      where: { organizationId: org.id, productId: product.id, batchNumber: b.batchNumber },
    });
    if (batch) {
      await prisma.productBatch.update({
        where: { id: batch.id },
        data: { availableQuantity: b.qty, reservedQuantity: 0, status: 'AVAILABLE' },
      });
      console.log(`✅ ${b.batchNumber} reset to ${b.qty} KG AVAILABLE`);
    }
  }
}

console.log('\n✅ Cleanup complete. Ready for fresh Golden Scenario run.\n');
await prisma.$disconnect();
