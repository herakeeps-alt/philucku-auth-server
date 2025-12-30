const express = require('express');
const router = express.Router();
const Game = require('../models/Game');

// @route   GET /api/games
// @desc    Get all active games (for guide mode)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const games = await Game.find({ isActive: true }).sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      count: games.length,
      data: games,
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/games/:gameId
// @desc    Get single game details
// @access  Public
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found',
      });
    }

    res.json({
      success: true,
      data: game,
    });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   POST /api/games
// @desc    Create a new game (admin only - for testing)
// @access  Admin
router.post('/', async (req, res) => {
  try {
    const { name, description, rules, imageUrl, category, playUrl, order } = req.body;

    const game = await Game.create({
      name,
      description,
      rules,
      imageUrl,
      category,
      playUrl: playUrl || 'https://google.com',
      order: order || 0,
    });

    res.status(201).json({
      success: true,
      message: 'Game created successfully',
      data: game,
    });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   PUT /api/games/:gameId
// @desc    Update game
// @access  Admin
router.put('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const updates = req.body;

    const game = await Game.findByIdAndUpdate(gameId, updates, { new: true });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found',
      });
    }

    res.json({
      success: true,
      message: 'Game updated successfully',
      data: game,
    });
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   DELETE /api/games/:gameId
// @desc    Delete game
// @access  Admin
router.delete('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = await Game.findByIdAndDelete(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found',
      });
    }

    res.json({
      success: true,
      message: 'Game deleted successfully',
    });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;
