import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

/**
 * Middleware to authenticate JWT token and populate req.user.
 * Also enforces tenant validation (active organization check).
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Token could be in header Authorization: Bearer <token>
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token is missing. Please log in.'
      }
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from DB to verify status and organization status
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User session not found or invalid.'
        }
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Your user account is inactive or suspended.'
        }
      });
    }

    if (user.organization?.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Your organization is currently inactive or suspended.'
        }
      });
    }

    // Attach user information and organizationId for tenant isolation
    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      organizationId: user.organizationId,
      organizationCode: user.organization.code,
      organizationName: user.organization.name,
      permissions: user.role.permissions.map(rp => rp.permission.name)
    };

    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    
    // Return unauthorized for invalid/expired tokens
    const message = err.name === 'TokenExpiredError' 
      ? 'Access token has expired. Please log in again.' 
      : 'Access token is invalid.';
      
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message
      }
    });
  }
}

/**
 * Middleware generator to restrict route access by permissions.
 * @param {string} permission - The required permission (e.g. 'sales.create')
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User is not authenticated.'
        }
      });
    }

    const hasPerm = req.user.permissions.includes(permission);

    if (!hasPerm) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied. Required permission: '${permission}'.`
        }
      });
    }

    next();
  };
}
