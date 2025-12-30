const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' directory for admin panel
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📦 Database: ${mongoose.connection.name}`);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    if (error.message.includes('IP')) {
      console.log('\n🔧 FIX: Whitelist your IP in MongoDB Atlas Network Access');
      console.log('Visit: https://cloud.mongodb.com\n');
    }
    process.exit(1);
  });

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/games', require('./routes/games'));

// Landing page route (serves index.html from public folder)
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  
  // Check if index.html exists, otherwise show API info
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Fallback API info if no landing page
    res.json({
      success: true,
      message: 'Philucky Authentication Server',
      version: '1.0.0',
      endpoints: {
        auth: {
          signup: 'POST /api/auth/signup',
          login: 'POST /api/auth/login',
          checkStatus: 'GET /api/auth/check-status/:identifier',
        },
        admin: {
          login: 'POST /api/admin/login',
          verify: 'GET /api/admin/verify',
          getUsers: 'GET /api/admin/users',
          getStats: 'GET /api/admin/stats',
          approveUser: 'PUT /api/admin/users/:userId/approve',
          rejectUser: 'PUT /api/admin/users/:userId/reject',
          toggleActive: 'PUT /api/admin/users/:userId/toggle-active',
          deleteUser: 'DELETE /api/admin/users/:userId',
        },
        games: {
          getGames: 'GET /api/games',
          getGame: 'GET /api/games/:gameId',
          createGame: 'POST /api/games',
          updateGame: 'PUT /api/games/:gameId',
          deleteGame: 'DELETE /api/games/:gameId',
        },
      },
      pages: {
        landingPage: 'http://localhost:3332/',
        appGuide: 'http://localhost:3332/app-guide',
        adminLogin: 'http://localhost:3332/admin',
        adminDashboard: 'http://localhost:3332/admin/dashboard',
      },
      note: 'Admin endpoints require JWT token in Authorization header',
    });
  }
});

// App guide route (for mobile WebView)
app.get('/app-guide', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app-guide.html'));
});

// Admin panel routes (serve HTML files)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
const PORT = process.env.PORT || 3332;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}`);
  console.log(`🌐 Landing Page: http://localhost:${PORT}`);
  console.log(`📱 App Guide: http://localhost:${PORT}/app-guide`);
  console.log(`🔐 Admin Login: http://localhost:${PORT}/admin`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin/dashboard`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📚 API Documentation: http://localhost:${PORT}\n`);
});