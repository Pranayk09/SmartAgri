import * as userService from '../services/userService.js';

/**
 * GET /api/users
 * List all users in the authenticated user's organization.
 */
export async function listUsers(req, res, next) {
  try {
    const users = await userService.listUsers(req.user.organizationId);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/roles
 * List all system roles (for dropdowns when creating/editing users).
 */
export async function listRoles(req, res, next) {
  try {
    const roles = await userService.listRoles();
    res.status(200).json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:id
 * Get a single user by ID within the authenticated org.
 */
export async function getUserById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id, req.user.organizationId);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/users
 * Create a new user in the authenticated organization (OWNER only).
 */
export async function createUser(req, res, next) {
  try {
    const { name, email, password, roleName } = req.body;

    if (!name || !email || !password || !roleName) {
      const error = new Error('name, email, password, and roleName are all required.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const newUser = await userService.createUser({
      name,
      email,
      password,
      roleName,
      organizationId: req.user.organizationId
    });

    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/:id/status
 * Enable, disable, or suspend a user.
 */
export async function updateUserStatus(req, res, next) {
  try {
    const { status } = req.body;

    if (!status) {
      const error = new Error('status is required.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const updated = await userService.updateUserStatus(
      req.params.id,
      req.user.organizationId,
      status,
      req.user.userId
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/:id/role
 * Change a user's role (cannot assign OWNER, cannot change own role).
 */
export async function updateUserRole(req, res, next) {
  try {
    const { roleName } = req.body;

    if (!roleName) {
      const error = new Error('roleName is required.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const updated = await userService.updateUserRole(
      req.params.id,
      req.user.organizationId,
      roleName,
      req.user.userId
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}
