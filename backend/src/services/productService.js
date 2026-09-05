import { prisma } from '../config/db.js';

// ==========================================
// 1. PRODUCT CATEGORIES CRUD
// ==========================================

export async function getCategories(organizationId) {
  return prisma.productCategory.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(organizationId, data) {
  const { name, description, status } = data;

  if (!name) {
    const error = new Error('Category name is required.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  // Check if name is unique within the organization
  const existingCategory = await prisma.productCategory.findFirst({
    where: {
      organizationId,
      name: {
        equals: name.trim(),
        mode: 'insensitive',
      },
    },
  });

  if (existingCategory) {
    const error = new Error(`Category "${name}" already exists in this organization.`);
    error.statusCode = 400;
    error.code = 'DUPLICATE_OPERATION';
    throw error;
  }

  return prisma.productCategory.create({
    data: {
      organizationId,
      name: name.trim(),
      description: description?.trim() || null,
      status: status || 'ACTIVE',
    },
  });
}

export async function updateCategory(organizationId, categoryId, data) {
  const { name, description, status } = data;

  // Verify category exists and belongs to organization
  const category = await prisma.productCategory.findFirst({
    where: { id: categoryId, organizationId },
  });

  if (!category) {
    const error = new Error('Category not found or access denied.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (name) {
    // Check uniqueness excluding self
    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        organizationId,
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
        id: { not: categoryId },
      },
    });

    if (existingCategory) {
      const error = new Error(`Category "${name}" already exists in this organization.`);
      error.statusCode = 400;
      error.code = 'DUPLICATE_OPERATION';
      throw error;
    }
  }

  return prisma.productCategory.update({
    where: { id: categoryId },
    data: {
      name: name ? name.trim() : undefined,
      description: description !== undefined ? description?.trim() : undefined,
      status: status || undefined,
    },
  });
}

export async function deleteCategory(organizationId, categoryId) {
  // Verify category exists
  const category = await prisma.productCategory.findFirst({
    where: { id: categoryId, organizationId },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    const error = new Error('Category not found or access denied.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Prevent delete if products are linked
  if (category._count.products > 0) {
    const error = new Error('Cannot delete category because it has associated products.');
    error.statusCode = 400;
    error.code = 'RESTRICTED_OPERATION';
    throw error;
  }

  return prisma.productCategory.delete({
    where: { id: categoryId },
  });
}

// ==========================================
// 2. PRODUCTS CRUD
// ==========================================

export async function getProducts(organizationId) {
  return prisma.product.findMany({
    where: { organizationId },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createProduct(organizationId, data) {
  const { categoryId, name, sku, unit, defaultSellingPrice, minimumStock, status } = data;

  // Validation
  if (!categoryId || !name || !sku || defaultSellingPrice === undefined) {
    const error = new Error('Category, Name, SKU, and Default Selling Price are required.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  // Verify category exists
  const category = await prisma.productCategory.findFirst({
    where: { id: categoryId, organizationId },
  });

  if (!category) {
    const error = new Error('Selected category not found or access denied.');
    error.statusCode = 400;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Verify SKU uniqueness within organization
  const existingProduct = await prisma.product.findFirst({
    where: {
      organizationId,
      sku: {
        equals: sku.toUpperCase().trim(),
        mode: 'insensitive',
      },
    },
  });

  if (existingProduct) {
    const error = new Error(`Product SKU "${sku}" already exists in this organization.`);
    error.statusCode = 400;
    error.code = 'DUPLICATE_OPERATION';
    throw error;
  }

  return prisma.product.create({
    data: {
      organizationId,
      categoryId,
      name: name.trim(),
      sku: sku.toUpperCase().trim(),
      unit: unit || 'KG',
      defaultSellingPrice: parseFloat(defaultSellingPrice),
      minimumStock: minimumStock !== undefined ? parseFloat(minimumStock) : 0,
      status: status || 'ACTIVE',
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function updateProduct(organizationId, productId, data) {
  const { categoryId, name, sku, unit, defaultSellingPrice, minimumStock, status } = data;

  // Verify product exists
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId },
  });

  if (!product) {
    const error = new Error('Product not found or access denied.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Verify category if updated
  if (categoryId) {
    const category = await prisma.productCategory.findFirst({
      where: { id: categoryId, organizationId },
    });
    if (!category) {
      const error = new Error('Selected category not found or access denied.');
      error.statusCode = 400;
      error.code = 'NOT_FOUND';
      throw error;
    }
  }

  // Verify SKU uniqueness if updated
  if (sku) {
    const existingProduct = await prisma.product.findFirst({
      where: {
        organizationId,
        sku: {
          equals: sku.toUpperCase().trim(),
          mode: 'insensitive',
        },
        id: { not: productId },
      },
    });

    if (existingProduct) {
      const error = new Error(`Product SKU "${sku}" already exists in this organization.`);
      error.statusCode = 400;
      error.code = 'DUPLICATE_OPERATION';
      throw error;
    }
  }

  return prisma.product.update({
    where: { id: productId },
    data: {
      categoryId: categoryId || undefined,
      name: name ? name.trim() : undefined,
      sku: sku ? sku.toUpperCase().trim() : undefined,
      unit: unit || undefined,
      defaultSellingPrice: defaultSellingPrice !== undefined ? parseFloat(defaultSellingPrice) : undefined,
      minimumStock: minimumStock !== undefined ? parseFloat(minimumStock) : undefined,
      status: status || undefined,
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function deleteProduct(organizationId, productId) {
  // Verify product exists and check child relations count
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId },
    include: {
      _count: {
        select: {
          batches: true,
          salesOrderItems: true,
        },
      },
    },
  });

  if (!product) {
    const error = new Error('Product not found or access denied.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Prevent delete if associated batches or sales order items exist
  if (product._count.batches > 0 || product._count.salesOrderItems > 0) {
    const error = new Error('Cannot delete product because it has associated batches or sales order items.');
    error.statusCode = 400;
    error.code = 'RESTRICTED_OPERATION';
    throw error;
  }

  return prisma.product.delete({
    where: { id: productId },
  });
}
