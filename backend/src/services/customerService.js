import { prisma } from '../config/db.js';

// ==========================================
// 1. GET CUSTOMERS (with credit data)
// ==========================================

export async function getCustomers(organizationId) {
  const customers = await prisma.customer.findMany({
    where: { organizationId },
    include: {
      credit: true,
    },
    orderBy: { name: 'asc' },
  });

  // Compute availableCredit inline
  return customers.map((c) => ({
    ...c,
    credit: c.credit
      ? {
          ...c.credit,
          availableCredit: c.credit.creditLimit - c.credit.outstandingAmount,
        }
      : null,
  }));
}

// ==========================================
// 2. CREATE CUSTOMER (atomic with credit)
// ==========================================

export async function createCustomer(organizationId, data) {
  const {
    name,
    type,
    phone,
    email,
    address,
    status,
    creditLimit,
    paymentTermsDays,
  } = data;

  if (!name || !name.trim()) {
    const error = new Error('Customer name is required.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const parsedCreditLimit = creditLimit !== undefined ? parseFloat(creditLimit) : 0;
  if (isNaN(parsedCreditLimit) || parsedCreditLimit < 0) {
    const error = new Error('Credit limit must be a non-negative number.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const parsedTerms = paymentTermsDays !== undefined ? parseInt(paymentTermsDays, 10) : 30;
  if (isNaN(parsedTerms) || parsedTerms < 0) {
    const error = new Error('Payment terms must be a non-negative integer.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  // Check for duplicate name within org (warn, not block)
  const existing = await prisma.customer.findFirst({
    where: {
      organizationId,
      name: { equals: name.trim(), mode: 'insensitive' },
    },
  });

  if (existing) {
    const error = new Error(`A customer named "${name.trim()}" already exists in this organization.`);
    error.statusCode = 400;
    error.code = 'DUPLICATE_OPERATION';
    throw error;
  }

  // Atomic create: Customer + CustomerCredit
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        organizationId,
        name: name.trim(),
        type: type || 'DISTRIBUTOR',
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        status: status || 'ACTIVE',
      },
    });

    const credit = await tx.customerCredit.create({
      data: {
        organizationId,
        customerId: customer.id,
        creditLimit: parsedCreditLimit,
        outstandingAmount: 0,
        paymentTermsDays: parsedTerms,
        status: 'ACTIVE',
      },
    });

    return {
      ...customer,
      credit: {
        ...credit,
        availableCredit: credit.creditLimit - credit.outstandingAmount,
      },
    };
  });
}

// ==========================================
// 3. UPDATE CUSTOMER PROFILE
// ==========================================

export async function updateCustomer(organizationId, customerId, data) {
  const { name, type, phone, email, address, status } = data;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
  });

  if (!customer) {
    const error = new Error('Customer not found or access denied.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Duplicate name check (excluding self)
  if (name) {
    const duplicate = await prisma.customer.findFirst({
      where: {
        organizationId,
        name: { equals: name.trim(), mode: 'insensitive' },
        id: { not: customerId },
      },
    });
    if (duplicate) {
      const error = new Error(`A customer named "${name.trim()}" already exists.`);
      error.statusCode = 400;
      error.code = 'DUPLICATE_OPERATION';
      throw error;
    }
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: name ? name.trim() : undefined,
      type: type || undefined,
      phone: phone !== undefined ? phone?.trim() || null : undefined,
      email: email !== undefined ? email?.trim() || null : undefined,
      address: address !== undefined ? address?.trim() || null : undefined,
      status: status || undefined,
    },
    include: { credit: true },
  });

  return {
    ...updated,
    credit: updated.credit
      ? {
          ...updated.credit,
          availableCredit: updated.credit.creditLimit - updated.credit.outstandingAmount,
        }
      : null,
  };
}

// ==========================================
// 4. UPDATE CREDIT LIMIT (Finance gate)
// ==========================================

export async function updateCreditLimit(organizationId, customerId, data) {
  const { creditLimit, paymentTermsDays, status } = data;

  // Verify customer exists
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    include: { credit: true },
  });

  if (!customer) {
    const error = new Error('Customer not found or access denied.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (!customer.credit) {
    const error = new Error('No credit record found for this customer.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Business rule: credit limit cannot be set below current outstanding
  if (creditLimit !== undefined) {
    const parsed = parseFloat(creditLimit);
    if (isNaN(parsed) || parsed < 0) {
      const error = new Error('Credit limit must be a non-negative number.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    if (parsed < customer.credit.outstandingAmount) {
      const error = new Error(
        `Credit limit (₹${parsed.toLocaleString('en-IN')}) cannot be less than current outstanding amount (₹${customer.credit.outstandingAmount.toLocaleString('en-IN')}).`
      );
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
  }

  const updatedCredit = await prisma.customerCredit.update({
    where: { id: customer.credit.id },
    data: {
      creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : undefined,
      paymentTermsDays:
        paymentTermsDays !== undefined ? parseInt(paymentTermsDays, 10) : undefined,
      status: status || undefined,
    },
  });

  return {
    ...customer,
    credit: {
      ...updatedCredit,
      availableCredit: updatedCredit.creditLimit - updatedCredit.outstandingAmount,
    },
  };
}

// ==========================================
// 5. DELETE CUSTOMER
// ==========================================

export async function deleteCustomer(organizationId, customerId) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    include: {
      _count: {
        select: {
          salesOrders: true,
          invoices: true,
          payments: true,
        },
      },
    },
  });

  if (!customer) {
    const error = new Error('Customer not found or access denied.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const hasHistory =
    customer._count.salesOrders > 0 ||
    customer._count.invoices > 0 ||
    customer._count.payments > 0;

  if (hasHistory) {
    // Soft-delete: deactivate instead of destroying data
    return prisma.customer.update({
      where: { id: customerId },
      data: { status: 'INACTIVE' },
    });
  }

  // Hard-delete: no transactional history; also cascades CustomerCredit
  return prisma.customer.delete({
    where: { id: customerId },
  });
}
