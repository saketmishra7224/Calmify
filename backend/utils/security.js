const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Security & Authentication Utilities
 * Provides anonymous ID generation, JWT tokens, and message encryption
 */

/**
 * Anonymous ID Generation
 * Generates secure anonymous identifiers for patients
 */

// Predefined anonymous prefixes for user-friendly IDs
const ANONYMOUS_PREFIXES = [
  'Hope', 'Light', 'Calm', 'Peace', 'Dawn', 'Brave', 'Safe', 'Kind',
  'Gentle', 'Strong', 'Warm', 'Clear', 'Bright', 'Star', 'Moon', 'Sun',
  'River', 'Ocean', 'Sky', 'Cloud', 'Rain', 'Snow', 'Wind', 'Earth',
  'Spring', 'Summer', 'Winter', 'Fall', 'Phoenix', 'Eagle', 'Dove', 'Swan'
];

// Adjectives for more variety
const ANONYMOUS_ADJECTIVES = [
  'Quiet', 'Gentle', 'Bright', 'Calm', 'Swift', 'Bold', 'Wise', 'Kind',
  'Pure', 'Free', 'Wild', 'Soft', 'Deep', 'High', 'True', 'New',
  'Open', 'Fresh', 'Cool', 'Warm', 'Clear', 'Still', 'Fast', 'Slow'
];

/**
 * Generates a human-readable anonymous ID
 * @returns {string} Anonymous ID like "HopefulStar-7429"
 */
function generateAnonymousId() {
  const prefix = ANONYMOUS_PREFIXES[Math.floor(Math.random() * ANONYMOUS_PREFIXES.length)];
  const adjective = ANONYMOUS_ADJECTIVES[Math.floor(Math.random() * ANONYMOUS_ADJECTIVES.length)];
  const number = Math.floor(Math.random() * 9000) + 1000; // 4 digit number
  
  return `${adjective}${prefix}-${number}`;
}

/**
 * Generates a secure anonymous ID with cryptographic randomness
 * @returns {string} Secure anonymous ID
 */
function generateSecureAnonymousId() {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `anon_${timestamp}_${randomBytes}`;
}

/**
 * Validates anonymous ID format
 * @param {string} anonymousId - ID to validate
 * @returns {boolean} Whether ID is valid
 */
function validateAnonymousId(anonymousId) {
  if (!anonymousId || typeof anonymousId !== 'string') return false;
  
  // Check human-readable format
  const humanReadablePattern = /^[A-Z][a-z]+[A-Z][a-z]+-\d{4}$/;
  if (humanReadablePattern.test(anonymousId)) return true;
  
  // Check secure format
  const securePattern = /^anon_[a-z0-9]+_[a-f0-9]{16}$/;
  if (securePattern.test(anonymousId)) return true;
  
  return false;
}

/**
 * JWT Token Generation and Verification
 */

/**
 * Generates JWT access token
 * @param {object} payload - Token payload (user data)
 * @param {string} expiresIn - Token expiration time
 * @returns {string} JWT token
 */
function generateAccessToken(payload, expiresIn = '1h') {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  const tokenPayload = {
    ...payload,
    type: 'access',
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(tokenPayload, process.env.JWT_SECRET, { 
    expiresIn,
    issuer: 'saneyar-platform',
    audience: 'saneyar-users'
  });
}

/**
 * Generates JWT refresh token
 * @param {object} payload - Token payload (user data)
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(payload) {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }
  
  const tokenPayload = {
    userId: payload.userId,
    role: payload.role,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET, { 
    expiresIn: '30d',
    issuer: 'saneyar-platform',
    audience: 'saneyar-users'
  });
}

/**
 * Verifies JWT token
 * @param {string} token - Token to verify
 * @param {string} type - Token type ('access' or 'refresh')
 * @returns {object} Decoded token payload
 */
function verifyToken(token, type = 'access') {
  if (!token) {
    throw new Error('Token is required');
  }
  
  const secret = type === 'refresh' ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error(`JWT secret for ${type} tokens is not configured`);
  }
  
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'saneyar-platform',
      audience: 'saneyar-users'
    });
    
    if (decoded.type !== type) {
      throw new Error(`Invalid token type. Expected ${type}, got ${decoded.type}`);
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw error;
    }
  }
}

/**
 * Extracts token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Password Hashing Utilities
 */

/**
 * Hashes password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required and must be a string');
  }
  
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compares password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Whether password matches
 */
async function comparePassword(password, hash) {
  if (!password || !hash) {
    return false;
  }
  
  return await bcrypt.compare(password, hash);
}

/**
 * Message Encryption/Decryption
 * For sensitive message content
 */

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts message content
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key (optional, uses env var if not provided)
 * @returns {object} Encrypted data with IV and auth tag
 */
function encryptMessage(text, key = null) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text to encrypt is required');
  }
  
  const encryptionKey = key || process.env.MESSAGE_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('Encryption key is required');
  }
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, encryptionKey);
  cipher.setAAD(Buffer.from('saneyar-message'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    algorithm: ENCRYPTION_ALGORITHM
  };
}

/**
 * Decrypts message content
 * @param {object} encryptedData - Encrypted data object
 * @param {string} key - Decryption key (optional, uses env var if not provided)
 * @returns {string} Decrypted text
 */
function decryptMessage(encryptedData, key = null) {
  if (!encryptedData || typeof encryptedData !== 'object') {
    throw new Error('Encrypted data object is required');
  }
  
  const { encrypted, iv, authTag, algorithm } = encryptedData;
  
  if (!encrypted || !iv || !authTag) {
    throw new Error('Invalid encrypted data format');
  }
  
  const decryptionKey = key || process.env.MESSAGE_ENCRYPTION_KEY;
  if (!decryptionKey) {
    throw new Error('Decryption key is required');
  }
  
  if (algorithm !== ENCRYPTION_ALGORITHM) {
    throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
  }
  
  try {
    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, decryptionKey);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    decipher.setAAD(Buffer.from('saneyar-message'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt message: ' + error.message);
  }
}

/**
 * Secure Random String Generation
 */

/**
 * Generates cryptographically secure random string
 * @param {number} length - Length of string to generate
 * @param {string} charset - Character set to use
 * @returns {string} Random string
 */
function generateSecureRandomString(length = 32, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let result = '';
  const bytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  
  return result;
}

/**
 * Generates secure session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  return generateSecureRandomString(48, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
}

/**
 * API Key Generation
 */

/**
 * Generates API key for external integrations
 * @param {string} prefix - Key prefix (e.g., 'sk_live_', 'sk_test_')
 * @returns {string} API key
 */
function generateApiKey(prefix = 'sk_saneyar_') {
  const randomPart = generateSecureRandomString(40);
  return `${prefix}${randomPart}`;
}

/**
 * Token Blacklist Management
 */

// In production, this would be stored in Redis or database
const tokenBlacklist = new Set();

/**
 * Adds token to blacklist
 * @param {string} token - Token to blacklist
 */
function blacklistToken(token) {
  if (token) {
    tokenBlacklist.add(token);
  }
}

/**
 * Checks if token is blacklisted
 * @param {string} token - Token to check
 * @returns {boolean} Whether token is blacklisted
 */
function isTokenBlacklisted(token) {
  return tokenBlacklist.has(token);
}

/**
 * Clears expired tokens from blacklist
 */
function cleanupTokenBlacklist() {
  // In production, implement TTL-based cleanup
  // For now, clear all tokens older than 24 hours
  // This would be handled by Redis TTL in production
}

/**
 * Data Sanitization
 */

/**
 * Sanitizes user input to prevent injection attacks
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[{}]/g, '') // Remove potential code injection
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
    .trim();
}

/**
 * Validates and sanitizes email
 * @param {string} email - Email to validate
 * @returns {string|null} Sanitized email or null if invalid
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = email.toLowerCase().trim();
  
  return emailRegex.test(cleanEmail) ? cleanEmail : null;
}

module.exports = {
  // Anonymous ID functions
  generateAnonymousId,
  generateSecureAnonymousId,
  validateAnonymousId,
  
  // JWT functions
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractTokenFromHeader,
  
  // Password functions
  hashPassword,
  comparePassword,
  
  // Message encryption
  encryptMessage,
  decryptMessage,
  
  // Random string generation
  generateSecureRandomString,
  generateSessionId,
  generateApiKey,
  
  // Token blacklist
  blacklistToken,
  isTokenBlacklisted,
  cleanupTokenBlacklist,
  
  // Data sanitization
  sanitizeInput,
  sanitizeEmail
};