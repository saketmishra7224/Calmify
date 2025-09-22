const express = require('express');
const { User } = require('../models');
const { jwt, auth, validation } = require('../utils');

const router = express.Router();

// Register new user with role validation
router.post('/register', 
  validation.validate(validation.validateRegistration),
  async (req, res) => {
    try {
      const { username, email, password, role = 'patient' } = req.body;

      // Role validation - only allow certain roles for self-registration
      const allowedRoles = ['patient', 'peer'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          error: 'Invalid role. Only patient and peer roles are allowed for registration'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
      });

      if (existingUser) {
        return res.status(400).json({
          error: 'User with this email or username already exists'
        });
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        role
      });

      await user.save();

      // Generate JWT tokens
      const token = jwt.generateAccessToken(user);
      const refreshToken = jwt.generateRefreshToken(user);

      res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        token,
        refreshToken,
        role: user.role
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        details: error.message
      });
    }
  }
);

// User login with JWT token return
router.post('/login',
  validation.validate(validation.validateLogin),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          error: 'Account is suspended or inactive'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }

      // Update last active and online status
      await user.updateLastActive();
      user.isOnline = true;
      await user.save();

      // Generate JWT tokens
      const token = jwt.generateAccessToken(user);
      const refreshToken = jwt.generateRefreshToken(user);

      res.json({
        message: 'Login successful',
        user: user.toJSON(),
        token,
        refreshToken,
        role: user.role
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        details: error.message
      });
    }
  }
);

// Anonymous patient login
router.post('/anonymous',
  async (req, res) => {
    try {
      const { sessionId } = req.body;

      // Generate unique anonymous credentials
      const anonymousId = 'anon_' + Math.random().toString(36).substr(2, 12);
      const anonymousUsername = 'Anonymous_' + Math.random().toString(36).substr(2, 6);

      // Create temporary anonymous user
      const anonymousUser = new User({
        username: anonymousUsername,
        email: `${anonymousId}@anonymous.temp`,
        password: Math.random().toString(36).substr(2, 15), // Random password
        role: 'patient',
        anonymousId: anonymousId,
        preferences: {
          anonymousMode: true,
          crisisAlerts: true,
          emailNotifications: false
        }
      });

      await anonymousUser.save();

      // Generate JWT token for anonymous user
      const token = anonymousUser.generateToken();

      res.status(201).json({
        message: 'Anonymous session created',
        user: {
          _id: anonymousUser._id,
          anonymousId: anonymousUser.anonymousId,
          username: anonymousUser.username,
          role: anonymousUser.role,
          isAnonymous: true
        },
        token,
        sessionId: sessionId || null
      });
    } catch (error) {
      console.error('Anonymous login error:', error);
      res.status(500).json({
        error: 'Anonymous login failed',
        details: error.message
      });
    }
  }
);

// JWT token verification middleware endpoint
router.get('/verify',
  auth.authenticateToken,
  async (req, res) => {
    try {
      // Update last active timestamp
      await req.user.updateLastActive();

      res.json({
        valid: true,
        user: req.user.toJSON(),
        role: req.user.role,
        isAnonymous: !!req.user.anonymousId,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({
        error: 'Token verification failed',
        details: error.message
      });
    }
  }
);

// Logout user
router.post('/logout',
  auth.authenticateToken,
  async (req, res) => {
    try {
      // Update user online status
      req.user.isOnline = false;
      req.user.lastSeen = new Date();
      await req.user.save();

      res.json({
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed',
        details: error.message
      });
    }
  }
);

// Refresh token
router.post('/refresh',
  async (req, res) => {
    try {
      const { refreshToken } = req.body;

      console.log('Refresh token request received');
      console.log('Token type:', typeof refreshToken);
      console.log('Token length:', refreshToken ? refreshToken.length : 'N/A');
      console.log('Token preview:', refreshToken ? refreshToken.substring(0, 50) + '...' : 'N/A');

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token required'
        });
      }

      // Validate token format
      if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
        return res.status(401).json({
          error: 'Invalid refresh token format'
        });
      }

      // Check if token has the basic JWT structure (three parts separated by dots)
      const tokenParts = refreshToken.trim().split('.');
      if (tokenParts.length !== 3) {
        console.log('Token parts count:', tokenParts.length);
        console.log('Token parts:', tokenParts);
        return res.status(401).json({
          error: 'Malformed refresh token - invalid structure'
        });
      }

      let decoded;
      try {
        decoded = jwt.verifyToken(refreshToken);
      } catch (jwtError) {
        console.error('JWT verification error:', jwtError.message);
        return res.status(401).json({
          error: 'Invalid refresh token',
          details: jwtError.message
        });
      }
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          error: 'Invalid refresh token'
        });
      }

      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({
          error: 'Invalid refresh token'
        });
      }

      // Generate new tokens
      const newAccessToken = jwt.generateAccessToken(user);
      const newRefreshToken = jwt.generateRefreshToken(user);

      res.json({
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600 // 1 hour in seconds
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        error: 'Token refresh failed',
        details: error.message
      });
    }
  }
);

// Get current user profile
router.get('/me',
  auth.authenticateToken,
  async (req, res) => {
    try {
      res.json({
        user: req.user.toJSON()
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to get profile',
        details: error.message
      });
    }
  }
);

// Update user profile
router.put('/profile',
  auth.authenticateToken,
  validation.validate(validation.validateProfileUpdate),
  async (req, res) => {
    try {
      const { profile, preferences } = req.body;

      if (profile) {
        Object.assign(req.user.profile, profile);
      }

      if (preferences) {
        Object.assign(req.user.preferences, preferences);
      }

      await req.user.save();

      res.json({
        message: 'Profile updated successfully',
        user: req.user.toJSON()
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        error: 'Profile update failed',
        details: error.message
      });
    }
  }
);

module.exports = router;