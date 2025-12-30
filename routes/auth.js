const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Settings = require('../models/Settings');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Helper to get WebView URL from database or fallback
const getWebViewUrl = async () => {
  try {
    // Try to get from database first
    const setting = await Settings.findOne({ key: 'webViewUrl' });
    
    if (setting && setting.value) {
      return setting.value;
    }

    // Fallback to environment variable
    if (process.env.WEBVIEW_URL) {
      return process.env.WEBVIEW_URL;
    }
    
    // Final fallback to app-guide route
    const port = process.env.PORT || 3332;
    return `http://localhost:${port}/app-guide`;
  } catch (error) {
    console.error('Error fetching WebView URL:', error);
    // Fallback on error
    const port = process.env.PORT || 3332;
    return process.env.WEBVIEW_URL || `http://localhost:${port}/app-guide`;
  }
};

// @route   POST /api/auth/signup
// @desc    Register new user (status: pending)
// @access  Public
router.post('/signup', [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { phone, email, password, username } = req.body;

    console.log('Signup attempt:', { phone, email, username });

    // Check if phone already exists
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      console.log('Phone already exists:', phone);
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered',
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        console.log('Email already exists:', email);
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }
    }

    // Create new user with pending status
    const user = await User.create({
      phone,
      email: email ? email.toLowerCase() : undefined,
      password,
      username: username || phone,
      status: 'pending',
    });

    console.log('User created successfully:', user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your account is pending approval.',
      data: {
        userId: user._id,
        phone: user.phone,
        email: user.email,
        username: user.username,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({
        success: false,
        message: message,
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already registered`,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user with phone OR email
// @access  Public
router.post('/login', [
  body('identifier').notEmpty().withMessage('Phone number or email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { identifier, password } = req.body;

    console.log('Login attempt with:', identifier);

    // DEMO USER: Shows game rules (can login with phone or email)
    if ((identifier === '1231237777' || identifier === 'demo@philucky.com') && password === 'Qqqwww888') {
      const token = generateToken('demo-user-id');
      console.log('Demo user login successful');
      return res.json({
        success: true,
        message: 'Login successful',
        isDemo: true,
        showGames: true,
        data: {
          token,
          user: {
            id: 'demo-user-id',
            phone: '1231237777',
            username: 'Demo User',
            email: 'demo@philucky.com',
            balance: 1250.00,
            status: 'demo',
          },
        },
      });
    }

    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@');
    
    // Find user by email OR phone
    const query = isEmail 
      ? { email: identifier.toLowerCase() }
      : { phone: identifier };

    console.log('Searching for user with query:', query);

    const user = await User.findOne(query).select('+password');
    
    if (!user) {
      console.log('User not found:', identifier);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      console.log('Invalid password for:', identifier);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // CRITICAL: Check user status - enforce approval
    if (user.status === 'pending') {
      console.log('User pending approval:', identifier);
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval. Please wait for admin approval.',
        status: 'pending',
      });
    }

    if (user.status === 'rejected') {
      console.log('User rejected:', identifier);
      return res.status(403).json({
        success: false,
        message: 'Your account has been rejected. Please contact support.',
        status: 'rejected',
      });
    }

    if (!user.isActive) {
      console.log('User inactive:', identifier);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    const token = generateToken(user._id);

    // Get WebView URL from database settings
    const webViewUrl = await getWebViewUrl();

    console.log('User login successful:', identifier);
    console.log('WebView URL:', webViewUrl);

    res.json({
      success: true,
      message: 'Login successful',
      isDemo: false,
      showGames: false,
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          username: user.username,
          email: user.email,
          balance: user.balance,
          status: user.status,
        },
        // URL for webview - fetched from database or fallback
        webViewUrl: webViewUrl,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
});

// @route   GET /api/auth/check-status/:identifier
// @desc    Check user approval status by phone or email
// @access  Public
router.get('/check-status/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@');
    const query = isEmail 
      ? { email: identifier.toLowerCase() }
      : { phone: identifier };

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        phone: user.phone,
        email: user.email,
        username: user.username,
        status: user.status,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;