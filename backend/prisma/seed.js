import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Dashboard
  { name: 'dashboard.view', description: 'Access and view the main analytics dashboard' },
  
  // Products
  { name: 'products.view', description: 'View products list and details' },
  { name: 'products.create', description: 'Create new product categories and products' },
  { name: 'products.update', description: 'Update existing products and categories' },
  { name: 'products.delete', description: 'Delete or archive products and categories' },
  
  // Inventory & Stock
  { name: 'inventory.view', description: 'View batch inventory and stock movements' },
  { name: 'inventory.adjust', description: 'Perform manual stock adjustments and entries' },
  { name: 'inventory.fefo', description: 'Run and preview FEFO inventory allocations' },
  
  // Customers & Credit
  { name: 'customers.view', description: 'View customer accounts and credit limits' },
  { name: 'customers.create', description: 'Create and edit customer accounts' },
  { name: 'customers.update', description: 'Update customer credit limits and statuses' },
  { name: 'customers.credit', description: 'Manage and override customer credit limits' },
  { name: 'customers.delete', description: 'Delete or disable customer accounts' },
  
  // Sales Orders
  { name: 'sales.create', description: 'Create and modify draft sales orders' },
  { name: 'sales.view', description: 'View sales orders and allocations' },
  { name: 'sales.confirm', description: 'Confirm sales orders and reserve inventory' },
  { name: 'sales.dispatch', description: 'Dispatch confirmed orders and update physical stock' },
  
  // Invoices & Payments
  { name: 'invoices.create', description: 'Generate invoices from dispatched sales orders' },
  { name: 'invoices.view', description: 'View invoices and ledger details' },
  { name: 'invoices.payment', description: 'Record payments against customer invoices' },
  
  // Users & Access Control
  { name: 'users.manage', description: 'Manage users, roles, and permissions within the organization' },

  // Bulk Pricing
  { name: 'pricing.view',   description: 'View bulk pricing tiers and price rules' },
  { name: 'pricing.create', description: 'Create new bulk pricing tier rules' },
  { name: 'pricing.update', description: 'Update existing bulk pricing tier rules' },
  { name: 'pricing.delete', description: 'Delete bulk pricing tier rules' }
];

const ROLES = {
  OWNER: {
    name: 'OWNER',
    description: 'System Owner with full access across all operations',
    permissions: PERMISSIONS.map(p => p.name)
  },
  ADMIN: {
    name: 'ADMIN',
    description: 'Administrator with full management access',
    permissions: PERMISSIONS.map(p => p.name)
  },
  WAREHOUSE_MANAGER: {
    name: 'WAREHOUSE_MANAGER',
    description: 'Manages batch inventory, stock movements, and order dispatch',
    permissions: [
      'dashboard.view', 'products.view', 'inventory.view', 'inventory.adjust', 'inventory.fefo', 'sales.view', 'sales.dispatch'
    ]
  },
  SALES_MANAGER: {
    name: 'SALES_MANAGER',
    description: 'Manages sales operations, customer accounts, and order confirmations',
    permissions: [
      'dashboard.view', 'products.view', 'inventory.view', 'customers.view', 'customers.create', 'customers.update', 'pricing.view', 'sales.create', 'sales.view', 'sales.confirm', 'invoices.view'
    ]
  },
  SALES_EXECUTIVE: {
    name: 'SALES_EXECUTIVE',
    description: 'Handles basic customer interactions and drafts sales orders',
    permissions: [
      'dashboard.view', 'products.view', 'inventory.view', 'customers.view', 'customers.create', 'sales.create', 'sales.view'
    ]
  },
  FINANCE_MANAGER: {
    name: 'FINANCE_MANAGER',
    description: 'Manages credit terms, pricing rules, invoicing, and payment processing',
    permissions: [
      'dashboard.view', 'customers.view', 'customers.credit', 'pricing.view', 'pricing.create', 'pricing.update', 'pricing.delete', 'sales.view', 'invoices.create', 'invoices.view', 'invoices.payment'
    ]
  }
};

async function main() {
  console.log('🌱 Starting rich database seed...');

  // 1. Seed Permissions & Roles
  console.log('Seeding permissions & roles...');
  const seededPermissions = [];
  for (const perm of PERMISSIONS) {
    const dbPerm = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: { name: perm.name, description: perm.description }
    });
    seededPermissions.push(dbPerm);
  }
  const permissionsMap = seededPermissions.reduce((acc, p) => ({ ...acc, [p.name]: p.id }), {});

  const seededRoles = {};
  for (const roleKey of Object.keys(ROLES)) {
    const roleData = ROLES[roleKey];
    const dbRole = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: { name: roleData.name, description: roleData.description }
    });
    seededRoles[roleData.name] = dbRole;

    await prisma.rolePermission.deleteMany({ where: { roleId: dbRole.id } });
    await prisma.rolePermission.createMany({
      data: roleData.permissions.map(permName => ({
        roleId: dbRole.id,
        permissionId: permissionsMap[permName]
      }))
    });
  }

  // 2. Organization & Users
  console.log('Seeding organization & users...');
  const org = await prisma.organization.upsert({
    where: { code: 'AGRI_CORP' },
    update: { name: 'Agri-Chem Corporation' },
    create: { name: 'Agri-Chem Corporation', code: 'AGRI_CORP', status: 'ACTIVE' }
  });

  const salt = await bcrypt.genSalt(10);
  const pass = await bcrypt.hash('Password@123', salt);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@smartagri.com' },
    update: { passwordHash: pass },
    create: { name: 'System Owner', email: 'owner@smartagri.com', passwordHash: pass, roleId: seededRoles['OWNER'].id, organizationId: org.id, status: 'ACTIVE' }
  });

  await prisma.user.upsert({
    where: { email: 'sales@smartagri.com' },
    update: { passwordHash: pass },
    create: { name: 'Sales Manager', email: 'sales@smartagri.com', passwordHash: pass, roleId: seededRoles['SALES_MANAGER'].id, organizationId: org.id, status: 'ACTIVE' }
  });

  // Clean data to prevent duplicates (Batches, Orders, Invoices, StockMovement, PriceRules, Customers, Products, Categories)
  console.log('Cleaning up existing transaction data...');
  await prisma.payment.deleteMany({ where: { invoice: { salesOrder: { organizationId: org.id } } } });
  await prisma.invoice.deleteMany({ where: { salesOrder: { organizationId: org.id } } });
  await prisma.stockMovement.deleteMany({ where: { organizationId: org.id } });
  await prisma.batchAllocation.deleteMany({ where: { batch: { organizationId: org.id } } });
  await prisma.productBatch.deleteMany({ where: { organizationId: org.id } });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrder: { organizationId: org.id } } });
  await prisma.salesOrder.deleteMany({ where: { organizationId: org.id } });
  await prisma.priceRule.deleteMany({ where: { organizationId: org.id } });
  await prisma.customerCredit.deleteMany({ where: { organizationId: org.id } });
  await prisma.customer.deleteMany({ where: { organizationId: org.id } });
  await prisma.product.deleteMany({ where: { organizationId: org.id } });
  await prisma.productCategory.deleteMany({ where: { organizationId: org.id } });

  // 3. Categories
  console.log('Seeding categories...');
  const catNames = ['Fertilizers', 'Pesticides', 'Seeds', 'Equipment', 'Bio-Stimulants'];
  const categories = {};
  for (const name of catNames) {
    categories[name] = await prisma.productCategory.create({
      data: { organizationId: org.id, name, description: `${name} category`, status: 'ACTIVE' }
    });
  }

  // 4. Products
  console.log('Seeding products...');
  const prodData = [
    { name: 'NPK 19-19-19', sku: 'NPK-19-19-19', unit: 'KG', price: 1400, cat: 'Fertilizers', min: 500 },
    { name: 'DAP 18-46-0', sku: 'DAP-18-46-0', unit: 'KG', price: 1800, cat: 'Fertilizers', min: 1000 },
    { name: 'Urea 46% N', sku: 'UREA-46', unit: 'KG', price: 900, cat: 'Fertilizers', min: 2000 },
    { name: 'Chlorpyrifos 20% EC', sku: 'PEST-CHL-20', unit: 'LTR', price: 450, cat: 'Pesticides', min: 100 },
    { name: 'Glyphosate 41% SL', sku: 'PEST-GLY-41', unit: 'LTR', price: 600, cat: 'Pesticides', min: 150 },
    { name: 'Hybrid Cotton Seed', sku: 'SEED-COT-HYB', unit: 'PKT', price: 2100, cat: 'Seeds', min: 50 },
    { name: 'Wheat Seed HD 2967', sku: 'SEED-WHT-2967', unit: 'KG', price: 40, cat: 'Seeds', min: 1000 },
    { name: 'Knapsack Sprayer 16L', sku: 'EQP-SPR-16L', unit: 'NOS', price: 2500, cat: 'Equipment', min: 20 },
    { name: 'Drip Irrigation Kit', sku: 'EQP-DRIP-KIT', unit: 'NOS', price: 5000, cat: 'Equipment', min: 10 },
    { name: 'Seaweed Extract Bio', sku: 'BIO-SEA-1L', unit: 'LTR', price: 800, cat: 'Bio-Stimulants', min: 50 },
  ];

  const products = {};
  for (const p of prodData) {
    products[p.sku] = await prisma.product.create({
      data: {
        organizationId: org.id,
        categoryId: categories[p.cat].id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        defaultSellingPrice: p.price,
        minimumStock: p.min,
        status: 'ACTIVE'
      }
    });
  }

  // 5. Pricing Rules
  console.log('Seeding pricing rules...');
  await prisma.priceRule.createMany({
    data: [
      { organizationId: org.id, productId: products['NPK-19-19-19'].id, minQuantity: 1000, pricePerUnit: 1300, status: 'ACTIVE' },
      { organizationId: org.id, productId: products['NPK-19-19-19'].id, minQuantity: 5000, pricePerUnit: 1200, status: 'ACTIVE' },
      { organizationId: org.id, productId: products['UREA-46'].id, minQuantity: 2000, pricePerUnit: 850, status: 'ACTIVE' },
      { organizationId: org.id, productId: products['SEED-WHT-2967'].id, minQuantity: 500, pricePerUnit: 35, status: 'ACTIVE' },
    ]
  });

  // 6. Customers
  console.log('Seeding customers & credit...');
  const custData = [
    { name: 'Golden Agro Ltd.', type: 'DISTRIBUTOR', limit: 20000000 },
    { name: 'Venkata Fertilizers', type: 'DEALER', limit: 5000000 },
    { name: 'Kisan Retail Center', type: 'RETAILER', limit: 1000000 },
    { name: 'Green Valley Farms', type: 'FARMER', limit: 500000 },
    { name: 'Modern Agri Distributors', type: 'DISTRIBUTOR', limit: 10000000 },
    { name: 'Sunrise Organics', type: 'DEALER', limit: 2500000 }
  ];

  const customers = {};
  for (const c of custData) {
    const cust = await prisma.customer.create({
      data: { organizationId: org.id, name: c.name, type: c.type, email: `${c.name.replace(/\s+/g, '').toLowerCase()}@example.com`, status: 'ACTIVE' }
    });
    await prisma.customerCredit.create({
      data: { organizationId: org.id, customerId: cust.id, creditLimit: c.limit, outstandingAmount: 0, status: 'ACTIVE' }
    });
    customers[c.name] = cust;
  }

  // 7. Inventory Batches
  console.log('Seeding inventory batches...');
  const now = new Date();
  
  const createBatch = async (sku, num, addDays, qty, isDepleted = false) => {
    const exp = new Date(now);
    exp.setDate(now.getDate() + addDays);
    const b = await prisma.productBatch.create({
      data: {
        organizationId: org.id,
        productId: products[sku].id,
        batchNumber: num,
        manufacturingDate: new Date('2026-01-01'),
        expiryDate: exp,
        initialQuantity: qty,
        availableQuantity: isDepleted ? 0 : qty,
        reservedQuantity: 0,
        status: isDepleted ? 'DEPLETED' : (addDays < 0 ? 'EXPIRED' : 'AVAILABLE')
      }
    });
    await prisma.stockMovement.create({
      data: {
        organizationId: org.id, productId: products[sku].id, batchId: b.id, type: 'STOCK_IN', quantity: qty, referenceType: 'INVENTORY_INITIAL', referenceId: b.id
      }
    });
    return b;
  };

  // Expired batches
  await createBatch('NPK-19-19-19', 'NPK-EXP-01', -10, 500);
  await createBatch('PEST-CHL-20', 'PEST-EXP-01', -5, 50);

  // Expiring soon (within 30 days) - for Dashboard Alerts
  await createBatch('DAP-18-46-0', 'DAP-WARN-01', 15, 2000);
  await createBatch('SEED-COT-HYB', 'SEED-WARN-01', 25, 200);
  await createBatch('BIO-SEA-1L', 'BIO-WARN-01', 10, 100);

  // Healthy batches
  await createBatch('NPK-19-19-19', 'NPK-OK-01', 180, 10000);
  await createBatch('NPK-19-19-19', 'NPK-OK-02', 360, 15000);
  await createBatch('UREA-46', 'UREA-OK-01', 365, 20000);
  await createBatch('PEST-GLY-41', 'PEST-GLY-OK', 200, 500);
  await createBatch('SEED-WHT-2967', 'WHT-OK-01', 120, 5000);
  await createBatch('EQP-SPR-16L', 'EQP-SPR-01', 3650, 100); // 10 years
  await createBatch('EQP-DRIP-KIT', 'EQP-DRIP-01', 3650, 50);

  // Depleted batches
  await createBatch('UREA-46', 'UREA-DEP-01', 180, 5000, true);
  await createBatch('DAP-18-46-0', 'DAP-DEP-01', 200, 2000, true);

  // 8. Generate Orders, Invoices, Payments
  // Create an invoiced order (will bump customer credit)
  console.log('Seeding historical orders and invoices...');
  
  // order 1: Invoiced, partially paid (Golden Agro)
  const o1 = await prisma.salesOrder.create({
    data: {
      organizationId: org.id, customerId: customers['Golden Agro Ltd.'].id, orderNumber: 'SO-202609-0001',
      status: 'INVOICED', totalAmount: 1400000, createdBy: owner.id
    }
  });
  await prisma.salesOrderItem.create({
    data: { salesOrderId: o1.id, productId: products['NPK-19-19-19'].id, quantity: 1000, unitPrice: 1400, subtotal: 1400000 }
  });
  
  // increment credit for invoiced order
  await prisma.customerCredit.update({
    where: { customerId: customers['Golden Agro Ltd.'].id },
    data: { outstandingAmount: { increment: 1400000 } }
  });

  const inv1 = await prisma.invoice.create({
    data: { organizationId: org.id, customerId: customers['Golden Agro Ltd.'].id, salesOrderId: o1.id, invoiceNumber: 'INV-202609-0001', subtotal: 1400000, totalAmount: 1400000, outstandingAmount: 400000, amountPaid: 1000000, status: 'PARTIALLY_PAID', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
  });
  await prisma.payment.create({
    data: { organizationId: org.id, customerId: customers['Golden Agro Ltd.'].id, invoiceId: inv1.id, referenceNumber: 'PAY-202609-0001', amount: 1000000, paymentMethod: 'BANK_TRANSFER', createdBy: owner.id }
  });
  // decrement credit for payment
  await prisma.customerCredit.update({
    where: { customerId: customers['Golden Agro Ltd.'].id },
    data: { outstandingAmount: { decrement: 1000000 } }
  });

  // order 2: Dispatched, pending invoice (Venkata Fertilizers)
  const o2 = await prisma.salesOrder.create({
    data: {
      organizationId: org.id, customerId: customers['Venkata Fertilizers'].id, orderNumber: 'SO-202609-0002',
      status: 'DISPATCHED', totalAmount: 850000, createdBy: owner.id
    }
  });
  await prisma.salesOrderItem.create({
    data: { salesOrderId: o2.id, productId: products['UREA-46'].id, quantity: 1000, unitPrice: 850, subtotal: 850000 }
  });
  // Dispatched bumps credit
  await prisma.customerCredit.update({
    where: { customerId: customers['Venkata Fertilizers'].id },
    data: { outstandingAmount: { increment: 850000 } }
  });
  // Simulate dispatch of UREA-46 from 'UREA-OK-01' batch by deducting 1000
  const ureaBatch = await prisma.productBatch.findFirst({ where: { batchNumber: 'UREA-OK-01' }});
  await prisma.productBatch.update({ where: { id: ureaBatch.id }, data: { availableQuantity: { decrement: 1000 } } });

  // order 3: Confirmed (Modern Agri Distributors)
  const o3 = await prisma.salesOrder.create({
    data: {
      organizationId: org.id, customerId: customers['Modern Agri Distributors'].id, orderNumber: 'SO-202609-0003',
      status: 'CONFIRMED', totalAmount: 180000, createdBy: owner.id
    }
  });
  const o3Item = await prisma.salesOrderItem.create({
    data: { salesOrderId: o3.id, productId: products['DAP-18-46-0'].id, quantity: 100, unitPrice: 1800, subtotal: 180000 }
  });
  // Confirmed creates reservations on DAP-WARN-01
  const dapWarnBatch = await prisma.productBatch.findFirst({ where: { batchNumber: 'DAP-WARN-01' }});
  await prisma.productBatch.update({ where: { id: dapWarnBatch.id }, data: { availableQuantity: { decrement: 100 }, reservedQuantity: { increment: 100 } } });
  await prisma.batchAllocation.create({
    data: { organizationId: org.id, salesOrderItemId: o3Item.id, batchId: dapWarnBatch.id, quantity: 100 }
  });

  // order 4: Draft (Kisan Retail Center)
  const o4 = await prisma.salesOrder.create({
    data: {
      organizationId: org.id, customerId: customers['Kisan Retail Center'].id, orderNumber: 'SO-202609-0004',
      status: 'DRAFT', totalAmount: 25000, createdBy: owner.id
    }
  });
  await prisma.salesOrderItem.create({
    data: { salesOrderId: o4.id, productId: products['EQP-SPR-16L'].id, quantity: 10, unitPrice: 2500, subtotal: 25000 }
  });


  console.log('✅ Rich data seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
