import * as authService from '../services/authService.js';

/**
 * Handle user registration POST /api/auth/register.
 */
export async function register(req, res, next) {
  try {
    const { name, email, password, roleName, organizationCode, organizationName } = req.body;

    // Basic request validation
    if (!name || !email || !password || !organizationCode) {
      const error = new Error('Name, email, password, and organization code are required fields.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const result = await authService.registerUser({
      name,
      email,
      password,
      roleName,
      organizationCode,
      organizationName
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle user login POST /api/auth/login.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Basic request validation
    if (!email || !password) {
      const error = new Error('Email and password are required.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const result = await authService.loginUser(email, password);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle user logout POST /api/auth/logout.
 */
export async function logout(req, res, next) {
  try {
    // For stateless JWT, logout is primarily handled by the client destroying the token.
    // We return a standard success response confirming token destruction client side.
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle fetch current user session GET /api/auth/me.
 */
export async function me(req, res, next) {
  try {
    // req.user is populated by authenticateToken middleware
    const userId = req.user.userId;
    const profile = await authService.getUserProfile(userId);

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
}
