const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Settings = require('../models/Settings');

// Generate JWT Token
const generateToken = (adminId) => {
  return jwt.sign({ id: adminId, isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Middleware to verify admin token
const verifyAdminToken = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized as admin',
      });
    }

    req.admin = await Admin.findById(decoded.id);

    if (!req.admin || !req.admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found or inactive',
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { username, password } = req.body;

    console.log('Admin login attempt:', username);

    const admin = await Admin.findOne({ username }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isPasswordMatch = await admin.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is inactive',
      });
    }

    admin.lastLogin = Date.now();
    await admin.save();

    const token = generateToken(admin._id);

    console.log('Admin login successful:', username);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with optional status filter
// @access  Private (Admin)
router.get('/users', verifyAdminToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const query = status ? { status } : {};

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
    });
  }
});

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Private (Admin)
router.get('/stats', verifyAdminToken, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingUsers = await User.countDocuments({ status: 'pending' });
    const approvedUsers = await User.countDocuments({ status: 'approved' });
    const rejectedUsers = await User.countDocuments({ status: 'rejected' });
    const activeUsers = await User.countDocuments({ isActive: true, status: 'approved' });

    // Users registered in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        pendingUsers,
        approvedUsers,
        rejectedUsers,
        activeUsers,
        recentUsers,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
    });
  }
});

// @route   PUT /api/admin/users/:userId/approve
// @desc    Approve a user
// @access  Private (Admin)
router.put('/users/:userId/approve', verifyAdminToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.status = 'approved';
    await user.save();

    console.log(`User ${user.phone} approved by admin ${req.admin.username}`);

    res.json({
      success: true,
      message: 'User approved successfully',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          email: user.email,
          username: user.username,
          status: user.status,
        },
      },
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving user',
    });
  }
});

// @route   PUT /api/admin/users/:userId/reject
// @desc    Reject a user
// @access  Private (Admin)
router.put('/users/:userId/reject', verifyAdminToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.status = 'rejected';
    await user.save();

    console.log(`User ${user.phone} rejected by admin ${req.admin.username}`);

    res.json({
      success: true,
      message: 'User rejected successfully',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          email: user.email,
          username: user.username,
          status: user.status,
        },
      },
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting user',
    });
  }
});

// @route   PUT /api/admin/users/:userId/toggle-active
// @desc    Toggle user active status
// @access  Private (Admin)
router.put('/users/:userId/toggle-active', verifyAdminToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    console.log(`User ${user.phone} active status toggled to ${user.isActive} by admin ${req.admin.username}`);

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          email: user.email,
          username: user.username,
          status: user.status,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    console.error('Toggle active error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling user status',
    });
  }
});

// @route   DELETE /api/admin/users/:userId
// @desc    Delete a user
// @access  Private (Admin - Super Admin only)
router.delete('/users/:userId', verifyAdminToken, async (req, res) => {
  try {
    // Only super admins can delete users
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can delete users',
      });
    }

    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log(`User ${user.phone} deleted by super admin ${req.admin.username}`);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
    });
  }
});

// @route   GET /api/admin/settings
// @desc    Get app settings (including webViewUrl)
// @access  Private (Admin)
router.get('/settings', verifyAdminToken, async (req, res) => {
  try {
    const settings = await Settings.find();
    
    // Convert to key-value object
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = {
        value: setting.value,
        description: setting.description,
        updatedAt: setting.updatedAt,
      };
    });

    // Ensure webViewUrl exists
    if (!settingsObj.webViewUrl) {
      // Create default if doesn't exist
      const port = process.env.PORT || 3332;
      const defaultUrl = process.env.WEBVIEW_URL || `http://localhost:${port}/app-guide`;
      
      const newSetting = await Settings.create({
        key: 'webViewUrl',
        value: defaultUrl,
        description: 'URL shown in mobile app WebView after login',
        updatedBy: req.admin._id,
      });

      settingsObj.webViewUrl = {
        value: newSetting.value,
        description: newSetting.description,
        updatedAt: newSetting.updatedAt,
      };
    }

    res.json({
      success: true,
      data: settingsObj,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
    });
  }
});

// @route   PUT /api/admin/settings/webview-url
// @desc    Update WebView URL
// @access  Private (Admin)
router.put('/settings/webview-url', [
  verifyAdminToken,
  body('url').notEmpty().withMessage('URL is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { url } = req.body;

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format',
      });
    }

    // Update or create setting
    let setting = await Settings.findOne({ key: 'webViewUrl' });

    if (setting) {
      setting.value = url;
      setting.updatedBy = req.admin._id;
      await setting.save();
    } else {
      setting = await Settings.create({
        key: 'webViewUrl',
        value: url,
        description: 'URL shown in mobile app WebView after login',
        updatedBy: req.admin._id,
      });
    }

    console.log(`WebView URL updated to ${url} by admin ${req.admin.username}`);

    res.json({
      success: true,
      message: 'WebView URL updated successfully',
      data: {
        url: setting.value,
        updatedAt: setting.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update WebView URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating WebView URL',
    });
  }
});

// @route   GET /api/admin/verify
// @desc    Verify admin token
// @access  Private (Admin)
router.get('/verify', verifyAdminToken, (req, res) => {
  res.json({
    success: true,
    data: {
      admin: {
        id: req.admin._id,
        username: req.admin.username,
        email: req.admin.email,
        role: req.admin.role,
      },
    },
  });
});

module.exports = router;