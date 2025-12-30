const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  rules: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    required: true,
    enum: ['slots', 'card', 'roulette', 'dice', 'other'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  playUrl: {
    type: String,
    default: 'https://google.com', // Default URL to render
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Game', gameSchema);
