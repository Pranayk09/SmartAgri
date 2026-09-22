import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticateToken, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// All user management routes require authentication AND users.manage permission (OWNER only)
router.use(authenticateToken);
router.use(requirePermission('users.manage'));

// ---- Role Listing ----
// GET /api/users/roles — list available roles (must be before /:id to avoid collision)
router.get('/roles', userController.listRoles);

// ---- User CRUD ----
// GET /api/users — list all users in the organization
router.get('/', userController.listUsers);

// POST /api/users — create a new user in the organization
router.post('/', userController.createUser);

// GET /api/users/:id — get a specific user
router.get('/:id', userController.getUserById);

// PUT /api/users/:id/status — enable/disable/suspend a user
router.put('/:id/status', userController.updateUserStatus);

// PUT /api/users/:id/role — change a user's role
router.put('/:id/role', userController.updateUserRole);

export default router;
