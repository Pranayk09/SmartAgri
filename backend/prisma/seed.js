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
  { name: 'users.manage', description: 'Manage users, roles, and permissions within the organization' }
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
      'dashboard.view',
      'products.view',
      'inventory.view',
      'inventory.adjust',
      'inventory.fefo',
      'sales.view',
      'sales.dispatch'
    ]
  },
  SALES_MANAGER: {
    name: 'SALES_MANAGER',
    description: 'Manages sales operations, customer accounts, and order confirmations',
    permissions: [
      'dashboard.view',
      'products.view',
      'inventory.view',
      'customers.view',
      'customers.create',
      'customers.update',
      'sales.create',
      'sales.view',
      'sales.confirm',
      'invoices.view'
    ]
  },
  SALES_EXECUTIVE: {
    name: 'SALES_EXECUTIVE',
    description: 'Handles basic customer interactions and drafts sales orders',
    permissions: [
      'dashboard.view',
      'products.view',
      'inventory.view',
      'customers.view',
      'customers.create',
      'sales.create',
      'sales.view'
    ]
  },
  FINANCE_MANAGER: {
    name: 'FINANCE_MANAGER',
    description: 'Manages credit terms, pricing rules, invoicing, and payment processing',
    permissions: [
      'dashboard.view',
      'customers.view',
      'customers.credit',
      'sales.view',
      'invoices.create',
      'invoices.view',
      'invoices.payment'
    ]
  }
};

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Permissions
  console.log('Seeding permissions...');
  const seededPermissions = [];
  for (const perm of PERMISSIONS) {
    const dbPerm = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: { name: perm.name, description: perm.description }
    });
    seededPermissions.push(dbPerm);
  }
  console.log(`Successfully seeded ${seededPermissions.length} permissions.`);

  // Create permissions lookup map
  const permissionsMap = seededPermissions.reduce((acc, p) => {
    acc[p.name] = p.id;
    return acc;
  }, {});

  // 2. Seed Roles and RolePermissions
  console.log('Seeding roles & permissions relationships...');
  const seededRoles = {};
  for (const roleKey of Object.keys(ROLES)) {
    const roleData = ROLES[roleKey];
    
    // Upsert the role
    const dbRole = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: { name: roleData.name, description: roleData.description }
    });
    seededRoles[roleData.name] = dbRole;

    // Delete existing permissions for this role to avoid duplicates/stale links
    await prisma.rolePermission.deleteMany({
      where: { roleId: dbRole.id }
    });

    // Create new relationships
    const rolePermissionPayload = roleData.permissions.map(permName => ({
      roleId: dbRole.id,
      permissionId: permissionsMap[permName]
    }));

    await prisma.rolePermission.createMany({
      data: rolePermissionPayload
    });
  }
  console.log('Successfully seeded roles and linked their permissions.');

  // 3. Seed Default Organization
  console.log('Seeding initial Organization...');
  const defaultOrg = await prisma.organization.upsert({
    where: { code: 'AGRI_CORP' },
    update: { name: 'Agri-Chem Corporation' },
    create: {
      name: 'Agri-Chem Corporation',
      code: 'AGRI_CORP',
      status: 'ACTIVE'
    }
  });
  console.log(`Organization seeded: ${defaultOrg.name} (${defaultOrg.code})`);

  // 4. Seed Default Owner User
  console.log('Seeding default OWNER user...');
  const ownerEmail = 'owner@smartagri.com';
  const ownerRole = seededRoles['OWNER'];
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password@123', salt);

  const defaultOwner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      name: 'System Owner',
      passwordHash: passwordHash,
      roleId: ownerRole.id,
      organizationId: defaultOrg.id,
      status: 'ACTIVE'
    },
    create: {
      name: 'System Owner',
      email: ownerEmail,
      passwordHash: passwordHash,
      roleId: ownerRole.id,
      organizationId: defaultOrg.id,
      status: 'ACTIVE'
    }
  });
  console.log(`Default owner user seeded: ${defaultOwner.name} (${defaultOwner.email})`);
  
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
