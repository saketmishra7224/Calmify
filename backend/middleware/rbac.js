/**
 * Role-Based Access Control Middleware
 * Manages permissions for different user roles
 */

/**
 * Role hierarchy for access control
 */
const ROLE_HIERARCHY = {
  'patient': 1,
  'peer': 2,
  'counselor': 3,
  'admin': 4
};

/**
 * Permission sets for different roles
 */
const ROLE_PERMISSIONS = {
  patient: [
    'session:create',
    'session:join',
    'session:leave',
    'message:send',
    'message:read',
    'assessment:take',
    'profile:read',
    'profile:update',
    'crisis:report'
  ],
  peer: [
    'session:accept',
    'session:join',
    'session:manage',
    'message:send',
    'message:read',
    'message:moderate',
    'profile:read',
    'profile:update',
    'resources:access',
    'crisis:respond'
  ],
  counselor: [
    'session:accept',
    'session:join',
    'session:manage',
    'session:escalate',
    'session:close',
    'message:send',
    'message:read',
    'message:moderate',
    'message:delete',
    'assessment:review',
    'assessment:create',
    'profile:read',
    'profile:update',
    'resources:access',
    'resources:manage',
    'crisis:respond',
    'crisis:manage',
    'user:suspend',
    'reports:view'
  ],
  admin: [
    'session:*',
    'message:*',
    'assessment:*',
    'profile:*',
    'resources:*',
    'crisis:*',
    'user:*',
    'reports:*',
    'system:*'
  ]
};

/**
 * Check if user has required role level
 * @param {array|string} requiredRoles - Required role(s)
 * @returns {function} Middleware function
 */
const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    // Check if user has any of the required roles
    const hasRequiredRole = roles.some(role => {
      const requiredLevel = ROLE_HIERARCHY[role];
      const userLevel = ROLE_HIERARCHY[userRole];
      return userLevel >= requiredLevel;
    });

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        error: 'INSUFFICIENT_ROLE',
        userRole,
        requiredRoles: roles
      });
    }

    next();
  };
};

/**
 * Check if user has specific permission
 * @param {string} permission - Permission to check
 * @returns {function} Middleware function
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
    }

    const userRole = req.user.role;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    // Check for wildcard permissions (admin)
    const hasWildcard = userPermissions.some(perm => {
      const [resource, action] = perm.split(':');
      const [reqResource, reqAction] = permission.split(':');
      return (resource === reqResource && action === '*') || perm === '*';
    });

    const hasDirectPermission = userPermissions.includes(permission);

    if (!hasDirectPermission && !hasWildcard) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`,
        error: 'INSUFFICIENT_PERMISSION',
        userRole,
        requiredPermission: permission
      });
    }

    next();
  };
};

/**
 * Check if user owns the resource or has elevated permissions
 * @param {function} getResourceOwnerId - Function to extract owner ID from request
 * @returns {function} Middleware function
 */
const requireOwnershipOrRole = (getResourceOwnerId, allowedRoles = ['admin']) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
    }

    try {
      const resourceOwnerId = await getResourceOwnerId(req);
      const userId = req.user._id.toString();
      const userRole = req.user.role;

      // Check if user owns the resource
      if (resourceOwnerId === userId) {
        return next();
      }

      // Check if user has elevated role
      const hasElevatedRole = allowedRoles.some(role => {
        const requiredLevel = ROLE_HIERARCHY[role];
        const userLevel = ROLE_HIERARCHY[userRole];
        return userLevel >= requiredLevel;
      });

      if (!hasElevatedRole) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources or need elevated permissions.',
          error: 'OWNERSHIP_REQUIRED',
          userRole,
          allowedRoles
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify resource ownership',
        error: 'OWNERSHIP_CHECK_FAILED'
      });
    }
  };
};

/**
 * Session-specific access control
 * Checks if user can access a specific session
 */
const requireSessionAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED'
    });
  }

  try {
    const sessionId = req.params.sessionId || req.body.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
        error: 'MISSING_SESSION_ID'
      });
    }

    const Session = require('../models/Session');
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        error: 'SESSION_NOT_FOUND'
      });
    }

    const userId = req.user._id.toString();
    const userRole = req.user.role;

    // Check if user is a participant
    const isPatient = session.patientId && session.patientId.toString() === userId;
    const isHelper = session.helperId && session.helperId.toString() === userId;
    
    // Check if user has elevated role (counselor/admin can access any session)
    const hasElevatedAccess = ['counselor', 'admin'].includes(userRole);

    if (!isPatient && !isHelper && !hasElevatedAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to access this session.',
        error: 'SESSION_ACCESS_DENIED',
        sessionId
      });
    }

    // Attach session to request for use in route handlers
    req.session = session;
    next();
  } catch (error) {
    console.error('Session access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify session access',
      error: 'SESSION_ACCESS_CHECK_FAILED'
    });
  }
};

/**
 * Crisis response access control
 * Only allows counselors and admins to handle crisis situations
 */
const requireCrisisAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED'
    });
  }

  const userRole = req.user.role;
  const allowedRoles = ['counselor', 'admin'];

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Crisis response requires counselor or admin role.',
      error: 'CRISIS_ACCESS_DENIED',
      userRole,
      requiredRoles: allowedRoles
    });
  }

  next();
};

/**
 * Admin-only access control
 */
const requireAdmin = requireRole('admin');

/**
 * Counselor or admin access control
 */
const requireCounselorOrAdmin = requireRole(['counselor', 'admin']);

/**
 * Peer, counselor, or admin access control
 */
const requireHelperRole = requireRole(['peer', 'counselor', 'admin']);

/**
 * Rate limiting based on user role
 */
const roleBasedRateLimit = (req, res, next) => {
  if (!req.user) {
    // Apply default rate limit for unauthenticated users
    req.rateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10 // 10 requests per window
    };
  } else {
    const userRole = req.user.role;
    
    // Different rate limits based on role
    const roleLimits = {
      patient: { windowMs: 15 * 60 * 1000, max: 50 },
      peer: { windowMs: 15 * 60 * 1000, max: 100 },
      counselor: { windowMs: 15 * 60 * 1000, max: 200 },
      admin: { windowMs: 15 * 60 * 1000, max: 500 }
    };

    req.rateLimitConfig = roleLimits[userRole] || roleLimits.patient;
  }

  next();
};

/**
 * Check if user account is in good standing
 */
const requireActiveAccount = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED'
    });
  }

  if (!req.user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated',
      error: 'ACCOUNT_DEACTIVATED'
    });
  }

  // Check for account suspension
  if (req.user.suspendedUntil && req.user.suspendedUntil > new Date()) {
    return res.status(403).json({
      success: false,
      message: `Account is suspended until ${req.user.suspendedUntil.toISOString()}`,
      error: 'ACCOUNT_SUSPENDED',
      suspendedUntil: req.user.suspendedUntil
    });
  }

  next();
};

module.exports = {
  requireRole,
  requirePermission,
  requireOwnershipOrRole,
  requireSessionAccess,
  requireCrisisAccess,
  requireAdmin,
  requireCounselorOrAdmin,
  requireHelperRole,
  roleBasedRateLimit,
  requireActiveAccount,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS
};