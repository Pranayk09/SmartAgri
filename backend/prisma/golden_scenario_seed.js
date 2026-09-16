/**
 * Golden Scenario Seed Script - Phase 13
 * 
 * Seeds the exact data required for the Golden Scenario E2E test:
 * - Product: NPK 19-19-19 (KG unit, ₹1,400 default price)
 * - Customer: Golden Agro Ltd. (DISTRIBUTOR, ₹20,00,000 credit limit)
 * - 3 Batches: B001 (4,000 KG), B002 (6,000 KG), B003 (8,000 KG)
 * - Price Rule: ₹1,200/KG for quantity >= 5,000 KG (bulk tier)
 *
 * Run: node --experimental-vm-modules backend/prisma/golden_scenario_seed.js
 * Or:  node backend/prisma/golden_scenario_seed.js  (from workspace root)
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient();

const ORG_CODE = 'AGRI_CORP';

async function main() {
  console.log('\n🌱 Golden Scenario Seed - Phase 13\n');

  // 1. Find the organization
  const org = await prisma.organization.findUnique({ where: { code: ORG_CODE } });
  if (!org) {
    throw new Error(`Organization "${ORG_CODE}" not found. Run main seed.js first.`);
  }
  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // 2. Ensure a product category exists
  let category = await prisma.productCategory.findFirst({
    where: { organizationId: org.id, name: 'Fertilizers' },
  });
  if (!category) {
    category = await prisma.productCategory.create({
      data: {
        organizationId: org.id,
        name: 'Fertilizers',
        description: 'NPK and other compound fertilizers',
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Category created: ${category.name}`);
  } else {
    console.log(`✅ Category exists: ${category.name}`);
  }

  // 3. Create product NPK 19-19-19 (idempotent)
  let product = await prisma.product.findFirst({
    where: { organizationId: org.id, sku: 'NPK-19-19-19' },
  });
  if (!product) {
    product = await prisma.product.create({
      data: {
        organizationId: org.id,
        categoryId: category.id,
        name: 'NPK 19-19-19',
        sku: 'NPK-19-19-19',
        unit: 'KG',
        defaultSellingPrice: 1400,
        minimumStock: 500,
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Product created: ${product.name} (SKU: ${product.sku})`);
  } else {
    console.log(`✅ Product exists: ${product.name} (${product.id})`);
  }

  // 4. Create 3 batches with staggered expiry dates (FEFO order: B001 → B002 → B003)
  const batchesData = [
    {
      batchNumber: 'B001',
      manufacturingDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-03-31'), // Earliest expiry → FEFO first
      initialQuantity: 4000,
    },
    {
      batchNumber: 'B002',
      manufacturingDate: new Date('2026-02-01'),
      expiryDate: new Date('2027-06-30'), // Second expiry → FEFO second
      initialQuantity: 6000,
    },
    {
      batchNumber: 'B003',
      manufacturingDate: new Date('2026-03-01'),
      expiryDate: new Date('2027-12-31'), // Latest expiry → FEFO last
      initialQuantity: 8000,
    },
  ];

  for (const bd of batchesData) {
    const exists = await prisma.productBatch.findFirst({
      where: { organizationId: org.id, productId: product.id, batchNumber: bd.batchNumber },
    });
    if (!exists) {
      const batch = await prisma.$transaction(async (tx) => {
        const b = await tx.productBatch.create({
          data: {
            organizationId: org.id,
            productId: product.id,
            batchNumber: bd.batchNumber,
            manufacturingDate: bd.manufacturingDate,
            expiryDate: bd.expiryDate,
            initialQuantity: bd.initialQuantity,
            availableQuantity: bd.initialQuantity,
            reservedQuantity: 0,
            status: 'AVAILABLE',
          },
        });
        await tx.stockMovement.create({
          data: {
            organizationId: org.id,
            productId: product.id,
            batchId: b.id,
            type: 'STOCK_IN',
            quantity: bd.initialQuantity,
            referenceType: 'INVENTORY_INITIAL',
            referenceId: b.id,
            reason: `Golden Scenario: Initial stock entry for batch ${bd.batchNumber}`,
          },
        });
        return b;
      });
      console.log(`✅ Batch created: ${batch.batchNumber} — ${batch.initialQuantity} KG (Expiry: ${batch.expiryDate.toDateString()})`);
    } else {
      console.log(`✅ Batch exists: ${bd.batchNumber}`);
    }
  }

  // 5. Create customer: Golden Agro Ltd.
  let customer = await prisma.customer.findFirst({
    where: { organizationId: org.id, name: 'Golden Agro Ltd.' },
  });
  if (!customer) {
    customer = await prisma.$transaction(async (tx) => {
      const c = await tx.customer.create({
        data: {
          organizationId: org.id,
          name: 'Golden Agro Ltd.',
          type: 'DISTRIBUTOR',
          phone: '+91-9876543210',
          email: 'procurement@goldenagro.in',
          address: '12, Industrial Estate, Pune, Maharashtra',
          status: 'ACTIVE',
        },
      });
      await tx.customerCredit.create({
        data: {
          organizationId: org.id,
          customerId: c.id,
          creditLimit: 15000000, // ₹1,50,00,000 (covers 10,000 KG × ₹1,200 = ₹1,20,00,000)
          outstandingAmount: 0,
          paymentTermsDays: 30,
          status: 'ACTIVE',
        },
      });
      return c;
    });
    console.log(`✅ Customer created: ${customer.name} (Credit: ₹1,50,00,000)`);
  } else {
    console.log(`✅ Customer exists: ${customer.name} (${customer.id})`);
  }

  // 6. Create bulk price rule: ₹1,200/KG for quantity >= 5,000 KG
  const existingRule = await prisma.priceRule.findFirst({
    where: {
      organizationId: org.id,
      productId: product.id,
      minQuantity: 5000,
    },
  });
  if (!existingRule) {
    const rule = await prisma.priceRule.create({
      data: {
        organizationId: org.id,
        productId: product.id,
        minQuantity: 5000,
        maxQuantity: null, // No upper limit
        pricePerUnit: 1200,
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Price rule created: ₹${rule.pricePerUnit}/KG for qty >= ${rule.minQuantity} KG`);
  } else {
    console.log(`✅ Price rule exists: ₹${existingRule.pricePerUnit}/KG for qty >= ${existingRule.minQuantity} KG`);
  }

  console.log('\n✅ Golden Scenario seed complete!\n');
  console.log('📋 Summary:');
  console.log(`   Product   : NPK 19-19-19 (SKU: NPK-19-19-19)`);
  console.log(`   Batches   : B001 (4,000 KG) + B002 (6,000 KG) + B003 (8,000 KG) = 18,000 KG total`);
  console.log(`   Customer  : Golden Agro Ltd. — ₹20,00,000 credit limit`);
  console.log(`   Price Rule: ₹1,200/KG for qty >= 5,000 KG`);
  console.log(`   Test Order: 10,000 KG → FEFO = B001 (4,000 KG) + B002 (6,000 KG)`);
  console.log(`   Total     : 10,000 KG × ₹1,200 = ₹1,20,00,000\n`);
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
