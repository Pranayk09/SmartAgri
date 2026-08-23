import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

/**
 * Hash a plain text password.
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain text password with a hash.
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user session.
 */
export function generateToken(user) {
  const permissions = user.role?.permissions?.map(rp => rp.permission.name) || [];
  
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role?.name,
      organizationId: user.organizationId,
      permissions
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Register a user and potentially their organization.
 */
export async function registerUser({ name, email, password, roleName = 'SALES_EXECUTIVE', organizationCode, organizationName }) {
  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    const error = new Error('A user with this email address already exists.');
    error.statusCode = 400;
    error.code = 'DUPLICATE_OPERATION';
    throw error;
  }

  // Find or create organization
  let organization;
  let finalRoleName = roleName;

  if (!organizationCode) {
    const error = new Error('Organization code is required.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const normalizedOrgCode = organizationCode.toUpperCase().trim();

  // Try to find organization
  organization = await prisma.organization.findUnique({
    where: { code: normalizedOrgCode }
  });

  if (!organization) {
    // If organization doesn't exist, create it and register user as OWNER
    if (!organizationName) {
      const error = new Error('Organization name is required to create a new organization.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    organization = await prisma.organization.create({
      data: {
        name: organizationName.trim(),
        code: normalizedOrgCode,
        status: 'ACTIVE'
      }
    });
    
    // Override requested role with OWNER for the organization creator
    finalRoleName = 'OWNER';
  } else {
    // Organization exists. Verify it is ACTIVE
    if (organization.status !== 'ACTIVE') {
      const error = new Error('The organization is currently inactive or suspended.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  // Get Role ID
  const dbRole = await prisma.role.findUnique({
    where: { name: finalRoleName }
  });

  if (!dbRole) {
    const error = new Error(`Role ${finalRoleName} does not exist in the system.`);
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      roleId: dbRole.id,
      organizationId: organization.id,
      status: 'ACTIVE'
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      },
      organization: true
    }
  });

  // Generate token
  const token = generateToken(newUser);

  return {
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role.name,
      organizationCode: organization.code,
      organizationName: organization.name,
      permissions: newUser.role.permissions.map(rp => rp.permission.name)
    },
    token
  };
}

/**
 * Authenticate user credentials and return a token.
 */
export async function loginUser(email, password) {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      },
      organization: true
    }
  });

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  // Check user status
  if (user.status !== 'ACTIVE') {
    const error = new Error('Your user account is suspended or inactive.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Check organization status
  if (user.organization?.status !== 'ACTIVE') {
    const error = new Error('Your organization is currently inactive or suspended.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Compare passwords
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  // Generate token
  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      organizationCode: user.organization.code,
      organizationName: user.organization.name,
      permissions: user.role.permissions.map(rp => rp.permission.name)
    },
    token
  };
}

/**
 * Fetch a user profile by ID including organization, role, and permissions details.
 */
export async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      },
      organization: true
    }
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (user.status !== 'ACTIVE') {
    const error = new Error('User is inactive.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  if (user.organization?.status !== 'ACTIVE') {
    const error = new Error('Organization is inactive.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    organizationId: user.organizationId,
    organizationCode: user.organization.code,
    organizationName: user.organization.name,
    permissions: user.role.permissions.map(rp => rp.permission.name)
  };
}
