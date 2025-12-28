const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Simple admin authentication middleware
const adminAuth = (req, res, next) => {
  const { username, password } = req.headers;

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({
      success: false,
      message: 'Unauthorized - Admin credentials required',
    });
  }
};

// @route   GET /api/admin/users
// @desc    Get all users (with filter)
// @access  Admin only
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    
    const filter = status ? { status } : {};
    const users = await User.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/admin/users/pending
// @desc    Get pending users
// @access  Admin only
router.get('/users/pending', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   PUT /api/admin/users/:userId/approve
// @desc    Approve a user
// @access  Admin only
router.put('/users/:userId/approve', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { balance } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.status = 'approved';
    user.isActive = true;
    
    // Optionally set initial balance
    if (balance !== undefined) {
      user.balance = balance;
    }

    await user.save();

    res.json({
      success: true,
      message: 'User approved successfully',
      data: user,
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   PUT /api/admin/users/:userId/reject
// @desc    Reject a user
// @access  Admin only
router.put('/users/:userId/reject', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.status = 'rejected';
    user.isActive = false;
    
    if (reason) {
      user.rejectionReason = reason;
    }

    await user.save();

    res.json({
      success: true,
      message: 'User rejected',
      data: user,
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   PUT /api/admin/users/:userId/balance
// @desc    Update user balance
// @access  Admin only
router.put('/users/:userId/balance', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { balance } = req.body;

    if (balance === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Balance amount is required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.balance = balance;
    await user.save();

    res.json({
      success: true,
      message: 'Balance updated successfully',
      data: {
        userId: user._id,
        phone: user.phone,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   DELETE /api/admin/users/:userId
// @desc    Delete a user
// @access  Admin only
router.delete('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/admin/stats
// @desc    Get user statistics
// @access  Admin only
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingUsers = await User.countDocuments({ status: 'pending' });
    const approvedUsers = await User.countDocuments({ status: 'approved' });
    const rejectedUsers = await User.countDocuments({ status: 'rejected' });
    const activeUsers = await User.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        total: totalUsers,
        pending: pendingUsers,
        approved: approvedUsers,
        rejected: rejectedUsers,
        active: activeUsers,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;
