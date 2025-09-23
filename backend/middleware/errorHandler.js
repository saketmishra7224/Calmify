/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

const winston = require('winston');

/**
 * Custom Error Classes
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

class CrisisError extends AppError {
  constructor(message = 'Crisis situation detected') {
    super(message, 200, 'CRISIS_DETECTED'); // 200 because it's not an error, but special handling
    this.requiresImmediate = true;
  }
}

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
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
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
 * Handle different types of errors and convert them to AppError
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ValidationError(message);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new ConflictError(message);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => ({
    field: el.path,
    message: el.message,
    value: el.value
  }));
  const message = 'Invalid input data';
  return new ValidationError(message, errors);
};

const handleJWTError = () =>
  new AuthenticationError('Invalid token. Please log in again!');

const handleJWTExpiredError = () =>
  new AuthenticationError('Your token has expired! Please log in again.');

/**
 * Send error response in development
 */
const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      success: false,
      error: err,
      message: err.message,
      errorCode: err.errorCode,
      stack: err.stack,
      errors: err.errors || undefined
    });
  }

  // RENDERED WEBSITE
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        errorCode: err.errorCode,
        errors: err.errors || undefined
      });
    }

    // Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR 💥', err);
    logger.error('Programming Error', { error: err, stack: err.stack });

    // 2) Send generic message
    return res.status(500).json({
      success: false,
      message: 'Something went wrong!',
      errorCode: 'INTERNAL_ERROR'
    });
  }

  // RENDERED WEBSITE
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }

  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);
  logger.error('Programming Error', { error: err, stack: err.stack });

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

/**
 * Global error handling middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

/**
 * Catch async errors wrapper
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle unhandled routes (404)
 */
const handleNotFound = (req, res, next) => {
  const err = new NotFoundError(`Can't find ${req.originalUrl} on this server!`);
  next(err);
};

/**
 * Crisis error handler - special handling for crisis situations
 */
const handleCrisisError = (err, req, res, next) => {
  if (err instanceof CrisisError) {
    // Log crisis situation
    logger.error('Crisis situation detected', {
      userId: req.user?._id,
      sessionId: req.session?._id,
      message: err.message,
      timestamp: new Date(),
      requiresImmediate: err.requiresImmediate
    });

    // Trigger crisis response system
    const NotificationService = req.app.get('notificationService');
    if (NotificationService) {
      NotificationService.emit('crisis-alert', {
        alert: {
          user: req.user,
          session: req.session?._id,
          severity: 'critical',
          message: err.message
        },
        priority: 'critical'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Crisis situation detected. Help is on the way.',
      errorCode: 'CRISIS_DETECTED',
      crisisResources: {
        'Crisis Text Line': '741741',
        'Suicide Prevention Lifeline': '988',
        'Emergency Services': '911'
      },
      requiresImmediate: true
    });
  }

  next(err);
};

/**
 * Validation error formatter
 */
const formatValidationErrors = (errors) => {
  return errors.array().map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value,
    location: error.location
  }));
};

/**
 * Express-validator error handler
 */
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors);
    const err = new ValidationError('Validation failed', formattedErrors);
    return next(err);
  }
  
  next();
};

/**
 * Log errors for monitoring
 */
const logError = (err, req, res, next) => {
  const errorInfo = {
    message: err.message,
    statusCode: err.statusCode,
    errorCode: err.errorCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?._id,
    userRole: req.user?.role,
    timestamp: new Date(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  };

  if (err.statusCode >= 500) {
    logger.error('Server Error', errorInfo);
  } else if (err.statusCode >= 400) {
    logger.warn('Client Error', errorInfo);
  }

  next(err);
};

/**
 * Database connection error handler
 */
const handleDatabaseError = (err, req, res, next) => {
  if (err.name === 'MongooseServerSelectionError' || 
      err.name === 'MongoNetworkError' ||
      err.name === 'MongoTimeoutError') {
    
    logger.error('Database connection error', { error: err });
    
    const dbError = new AppError(
      'Database temporarily unavailable. Please try again later.',
      503,
      'DATABASE_ERROR'
    );
    
    return next(dbError);
  }
  
  next(err);
};

/**
 * Rate limit error handler
 */
const handleRateLimitError = (req, res, next) => {
  const err = new RateLimitError('Too many requests from this IP, please try again later.');
  next(err);
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  CrisisError,
  
  // Middleware functions
  globalErrorHandler,
  catchAsync,
  handleNotFound,
  handleCrisisError,
  handleValidationErrors,
  logError,
  handleDatabaseError,
  handleRateLimitError,
  
  // Utilities
  formatValidationErrors,
  logger
};