import * as productService from '../services/productService.js';

// ==========================================
// 1. PRODUCT CATEGORIES CONTROLLER
// ==========================================

export async function getCategories(req, res, next) {
  try {
    const { organizationId } = req.user;
    const categories = await productService.getCategories(organizationId);
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { organizationId } = req.user;
    const category = await productService.createCategory(organizationId, req.body);
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const category = await productService.updateCategory(organizationId, id, req.body);
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    await productService.deleteCategory(organizationId, id);
    
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 2. PRODUCTS CONTROLLER
// ==========================================

export async function getProducts(req, res, next) {
  try {
    const { organizationId } = req.user;
    const products = await productService.getProducts(organizationId);
    
    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const { organizationId } = req.user;
    const product = await productService.createProduct(organizationId, req.body);
    
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const product = await productService.updateProduct(organizationId, id, req.body);
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    await productService.deleteProduct(organizationId, id);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}
