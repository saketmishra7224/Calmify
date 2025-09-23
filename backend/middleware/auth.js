const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { extractTokenFromHeader } = require('../utils/security');

/**
 * Authentication Middleware
 * Verifies JWT tokens and extracts user information
 */

/**
 * Middleware to verify JWT token and authenticate user
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        error: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted (in production, check Redis)
    // const isBlacklisted = await checkTokenBlacklist(token);
    // if (isBlacklisted) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Token has been revoked',
    //     error: 'REVOKED_TOKEN'
    //   });
    // }

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
        error: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Update last active timestamp
    user.lastActive = new Date();
    await user.save();

    // Attach user to request object
    req.user = user;
    req.token = token;
    req.tokenData = decoded;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
        error: 'EXPIRED_TOKEN'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
      req.token = token;
      req.tokenData = decoded;
      
      // Update last active
      user.lastActive = new Date();
      await user.save();
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // Don't fail for optional auth - just continue without user
    req.user = null;
    next();
  }
};

/**
 * Anonymous authentication middleware
 * Allows anonymous users with valid anonymous IDs
 */
const allowAnonymous = async (req, res, next) => {
  try {
    // Check for anonymous ID in headers
    const anonymousId = req.headers['x-anonymous-id'];
    
    if (anonymousId) {
      // Validate anonymous ID format
      const { validateAnonymousId } = require('../utils/security');
      
      if (validateAnonymousId(anonymousId)) {
        // Find or create anonymous user record
        let user = await User.findOne({ anonymousId });
        
        if (!user) {
          // Create anonymous user record
          user = new User({
            anonymousId,
            role: 'patient',
            isActive: true,
            isAnonymous: true
          });
          await user.save();
        }

        req.user = user;
        req.isAnonymous = true;
        return next();
      }
    }

    // Try regular authentication
    await authenticateToken(req, res, next);
  } catch (error) {
    console.error('Anonymous authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'AUTH_REQUIRED'
    });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  allowAnonymous
};