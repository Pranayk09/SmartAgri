import express from 'express';
import multer from 'multer';
import * as productController from '../controllers/productController.js';
import * as bulkImportController from '../controllers/bulkImportController.js';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer: store file in memory (no disk writes) — max 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',                                          // .xls
      'text/csv',                                                           // .csv
      'application/csv',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls and .csv files are supported.'), false);
    }
  },
});

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

// ==========================================
// 3. BULK IMPORT ROUTES (CSV / XLSX)
// ==========================================
// Preview — parse file, return summary without writing to DB
router.post(
  '/products/bulk-import/preview',
  authenticateToken,
  requirePermission('products.create'),
  upload.single('file'),
  bulkImportController.previewBulkImport
);

// Execute — parse & commit valid rows, upsert categories, skip duplicates
router.post(
  '/products/bulk-import/execute',
  authenticateToken,
  requirePermission('products.create'),
  upload.single('file'),
  bulkImportController.executeBulkImport
);

export default router;
