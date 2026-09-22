import { prisma } from '../config/db.js';
import { hashPassword } from './authService.js';

/**
 * Return all users in the same organization (no password hashes).
 */
export async function listUsers(organizationId) {
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      role: {
        select: { id: true, name: true, description: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  return users;
}

/**
 * Get a single user by ID — enforces tenant isolation.
 */
export async function getUserById(userId, organizationId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      role: {
        select: { id: true, name: true, description: true }
      }
    }
  });

  if (!user) {
    const error = new Error('User not found in your organization.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return user;
}

/**
 * Create a new user inside the requesting user's organization.
 * Only callable by OWNER (enforced at route level via users.manage permission).
 */
export async function createUser({ name, email, password, roleName, organizationId }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check for duplicate email globally (email is a unique field)
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    const error = new Error('A user with this email address already exists.');
    error.statusCode = 400;
    error.code = 'DUPLICATE_OPERATION';
    throw error;
  }

  // Validate the role exists
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    const error = new Error(`Role '${roleName}' does not exist.`);
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  // OWNER cannot be assigned by this endpoint
  if (roleName === 'OWNER') {
    const error = new Error('Cannot create additional OWNER users. An organization already has one OWNER.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const passwordHash = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      roleId: role.id,
      organizationId,
      status: 'ACTIVE'
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      role: {
        select: { id: true, name: true }
      }
    }
  });

  return newUser;
}

/**
 * Enable or disable a user. Cannot affect your own account or another OWNER.
 * Valid statuses: ACTIVE, INACTIVE, SUSPENDED
 */
export async function updateUserStatus(userId, organizationId, status, requestingUserId) {
  const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
  if (!VALID_STATUSES.includes(status)) {
    const error = new Error(`Invalid status '${status}'. Must be one of: ${VALID_STATUSES.join(', ')}.`);
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (userId === requestingUserId) {
    const error = new Error('You cannot change the status of your own account.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    include: { role: true }
  });

  if (!target) {
    const error = new Error('User not found in your organization.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (target.role.name === 'OWNER') {
    const error = new Error('Cannot change the status of an OWNER account.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      role: { select: { name: true } }
    }
  });

  return updated;
}

/**
 * Change a user's role. Cannot change own role. Cannot assign OWNER role. Cannot change another OWNER.
 */
export async function updateUserRole(userId, organizationId, roleName, requestingUserId) {
  if (userId === requestingUserId) {
    const error = new Error('You cannot change your own role.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  if (roleName === 'OWNER') {
    const error = new Error('Cannot assign the OWNER role to another user.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    const error = new Error(`Role '${roleName}' does not exist.`);
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    include: { role: true }
  });

  if (!target) {
    const error = new Error('User not found in your organization.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (target.role.name === 'OWNER') {
    const error = new Error('Cannot change the role of an OWNER account.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { roleId: role.id },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      role: { select: { name: true, description: true } }
    }
  });

  return updated;
}

/**
 * List all available roles in the system (for UI dropdowns).
 */
export async function listRoles() {
  return prisma.role.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' }
  });
}
