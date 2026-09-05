import express from 'express';
import * as productController from '../controllers/productController.js';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==========================================
// 1. PRODUCT CATEGORIES ROUTES
// ==========================================
router.get('/categories', authenticateToken, requirePermission('products.view'), productController.getCategories);
router.post('/categories', authenticateToken, requirePermission('products.create'), productController.createCategory);
router.put('/categories/:id', authenticateToken, requirePermission('products.update'), productController.updateCategory);
router.delete('/categories/:id', authenticateToken, requirePermission('products.delete'), productController.deleteCategory);

// ==========================================
// 2. PRODUCTS ROUTES
// ==========================================
router.get('/products', authenticateToken, requirePermission('products.view'), productController.getProducts);
router.post('/products', authenticateToken, requirePermission('products.create'), productController.createProduct);
router.put('/products/:id', authenticateToken, requirePermission('products.update'), productController.updateProduct);
router.delete('/products/:id', authenticateToken, requirePermission('products.delete'), productController.deleteProduct);

export default router;
