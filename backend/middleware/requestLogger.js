/**
 * Request Logging Middleware
 * Comprehensive logging for API requests, user actions, and system events
 */

const winston = require('winston');
const morgan = require('morgan');

/**
 * Logger configuration
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'saneyar-backend' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/access.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/audit.log',
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Security logger for sensitive operations
 */
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/security.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

/**
 * Crisis events logger
 */
const crisisLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/crisis.log',
      maxsize: 10485760, // 10MB
      maxFiles: 20
    })
  ]
});

/**
 * Sanitize sensitive data for logging
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = [
    'password', 'token', 'refresh_token', 'authorization',
    'cookie', 'x-auth-token', 'x-api-key', 'secret',
    'privateKey', 'publicKey', 'sessionId', 'jwt'
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Handle nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    }
  }
  
  return sanitized;
};

/**
 * Extract user information for logging
 */
const extractUserInfo = (req) => {
  const user = req.user || req.session?.user;
  
  if (!user) {
    return {
      userId: 'anonymous',
      userRole: 'anonymous',
      isAuthenticated: false
    };
  }
  
  return {
    userId: user._id || user.id,
    userRole: user.role,
    isAuthenticated: true,
    isAnonymous: user.isAnonymous || false
  };
};

/**
 * Extract session information
 */
const extractSessionInfo = (req) => {
  return {
    sessionId: req.session?._id || req.sessionID,
    sessionType: req.session?.type,
    isActive: req.session?.isActive,
    helperId: req.session?.helper?._id
  };
};

/**
 * Basic request logging middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  const requestInfo = {
    type: 'HTTP_REQUEST',
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: sanitizeData(req.query),
    headers: sanitizeData(req.headers),
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userInfo: extractUserInfo(req),
    sessionInfo: extractSessionInfo(req),
    timestamp: new Date(),
    requestId: req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  // Don't log body for sensitive endpoints or large payloads
  const sensitiveEndpoints = ['/api/auth/login', '/api/auth/register', '/api/messages'];
  const shouldLogBody = !sensitiveEndpoints.some(endpoint => req.path.includes(endpoint)) 
                       && req.get('content-length') < 10000;
  
  if (shouldLogBody && req.body) {
    requestInfo.body = sanitizeData(req.body);
  }
  
  logger.info('Request received', requestInfo);
  
  // Store request info for response logging
  req.requestInfo = requestInfo;
  req.startTime = startTime;
  
  // Log response when finished
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    const responseInfo = {
      type: 'HTTP_RESPONSE',
      requestId: requestInfo.requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
      headers: sanitizeData(res.getHeaders()),
      userInfo: requestInfo.userInfo,
      timestamp: new Date()
    };
    
    // Log response body for non-sensitive, small responses
    if (res.statusCode < 500 && data && data.length < 5000) {
      try {
        const parsedData = JSON.parse(data);
        responseInfo.body = sanitizeData(parsedData);
      } catch (e) {
        // Not JSON, don't log body
      }
    }
    
    if (res.statusCode >= 400) {
      logger.warn('Request failed', responseInfo);
    } else {
      logger.info('Request completed', responseInfo);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Security event logging
 */
const logSecurityEvent = (eventType, details, req) => {
  const securityEvent = {
    type: 'SECURITY_EVENT',
    eventType,
    details: sanitizeData(details),
    userInfo: extractUserInfo(req),
    sessionInfo: extractSessionInfo(req),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    timestamp: new Date()
  };
  
  securityLogger.warn('Security event', securityEvent);
  
  // Also log to main logger for critical events
  const criticalEvents = ['LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'TOKEN_MANIPULATION', 'SUSPICIOUS_ACTIVITY'];
  if (criticalEvents.includes(eventType)) {
    logger.error('Critical security event', securityEvent);
  }
};

/**
 * Authentication logging middleware
 */
const logAuthEvents = (req, res, next) => {
  // Monitor authentication events
  const originalJson = res.json;
  res.json = function(data) {
    if (req.path.includes('/auth/')) {
      const authEvent = {
        type: 'AUTH_EVENT',
        endpoint: req.path,
        method: req.method,
        success: res.statusCode < 400,
        statusCode: res.statusCode,
        userInfo: extractUserInfo(req),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      };
      
      if (res.statusCode >= 400) {
        logSecurityEvent('AUTH_FAILED', {
          endpoint: req.path,
          reason: data.message || 'Authentication failed'
        }, req);
      } else if (req.path.includes('/login')) {
        logSecurityEvent('LOGIN_SUCCESS', {
          userId: req.user?._id,
          role: req.user?.role
        }, req);
      }
      
      securityLogger.info('Authentication event', authEvent);
    }
    
    originalJson.call(this, data);
  };
  
  next();
};

/**
 * Crisis event logging
 */
const logCrisisEvent = (eventType, details, req) => {
  const crisisEvent = {
    type: 'CRISIS_EVENT',
    eventType,
    details: sanitizeData(details),
    userInfo: extractUserInfo(req),
    sessionInfo: extractSessionInfo(req),
    severity: details.severity || 'unknown',
    timestamp: new Date(),
    requiresImmediate: details.requiresImmediate || false
  };
  
  crisisLogger.error('Crisis event', crisisEvent);
  
  // Also log to main logger and security logger
  logger.error('Crisis situation detected', crisisEvent);
  securityLogger.error('Crisis alert', crisisEvent);
};

/**
 * Session activity logging
 */
const logSessionActivity = (activityType, details, req) => {
  const sessionActivity = {
    type: 'SESSION_ACTIVITY',
    activityType,
    details: sanitizeData(details),
    userInfo: extractUserInfo(req),
    sessionInfo: extractSessionInfo(req),
    timestamp: new Date()
  };
  
  logger.info('Session activity', sessionActivity);
};

/**
 * Data access logging for sensitive operations
 */
const logDataAccess = (req, res, next) => {
  // Log access to sensitive data endpoints
  const sensitiveEndpoints = [
    '/api/users', '/api/sessions', '/api/messages', 
    '/api/assessments', '/api/crisis-alerts'
  ];
  
  const isSensitive = sensitiveEndpoints.some(endpoint => 
    req.path.startsWith(endpoint)
  );
  
  if (isSensitive) {
    const dataAccessEvent = {
      type: 'DATA_ACCESS',
      resource: req.path,
      method: req.method,
      userInfo: extractUserInfo(req),
      sessionInfo: extractSessionInfo(req),
      query: sanitizeData(req.query),
      timestamp: new Date()
    };
    
    logger.info('Data access', dataAccessEvent);
    
    // Log to security logger for admin actions
    if (req.user?.role === 'admin') {
      securityLogger.info('Admin data access', dataAccessEvent);
    }
  }
  
  next();
};

/**
 * Performance monitoring
 */
const logPerformance = (req, res, next) => {
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
    const endMemory = process.memoryUsage();
    
    if (duration > 1000) { // Log slow requests (>1s)
      const performanceEvent = {
        type: 'SLOW_REQUEST',
        url: req.originalUrl,
        method: req.method,
        duration: `${duration.toFixed(2)}ms`,
        memoryUsage: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal,
          external: endMemory.external,
          rss: endMemory.rss
        },
        userInfo: extractUserInfo(req),
        timestamp: new Date()
      };
      
      logger.warn('Slow request detected', performanceEvent);
    }
  });
  
  next();
};

/**
 * Morgan HTTP logger configuration
 */
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

const morganLogger = morgan(morganFormat, {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  },
  skip: (req, res) => {
    // Skip logging for health checks and static assets
    return req.path === '/health' || 
           req.path.startsWith('/static/') ||
           req.path.startsWith('/favicon');
  }
});

/**
 * Audit trail middleware for important actions
 */
const auditTrail = (action) => {
  return (req, res, next) => {
    const auditEvent = {
      type: 'AUDIT_TRAIL',
      action,
      userInfo: extractUserInfo(req),
      sessionInfo: extractSessionInfo(req),
      details: {
        path: req.path,
        method: req.method,
        params: sanitizeData(req.params),
        query: sanitizeData(req.query)
      },
      timestamp: new Date()
    };
    
    logger.info('Audit trail', auditEvent);
    
    // Store audit info for post-processing
    req.auditAction = action;
    
    next();
  };
};

/**
 * Error logging (used by error handler)
 */
const logError = (error, req) => {
  const errorEvent = {
    type: 'ERROR',
    error: {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      errorCode: error.errorCode
    },
    userInfo: extractUserInfo(req),
    sessionInfo: extractSessionInfo(req),
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: sanitizeData(req.headers),
      query: sanitizeData(req.query)
    },
    timestamp: new Date()
  };
  
  if (error.statusCode >= 500) {
    logger.error('Server error', errorEvent);
  } else {
    logger.warn('Client error', errorEvent);
  }
};

module.exports = {
  requestLogger,
  logSecurityEvent,
  logAuthEvents,
  logCrisisEvent,
  logSessionActivity,
  logDataAccess,
  logPerformance,
  auditTrail,
  logError,
  morganLogger,
  logger,
  securityLogger,
  crisisLogger,
  sanitizeData
};