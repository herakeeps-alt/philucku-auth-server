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

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Middleware to inject environment variables into HTML files
const injectEnvToHtml = (req, res, next) => {
  const originalSendFile = res.sendFile;

  res.sendFile = function(filePath, options, callback) {
    // Only process HTML files
    if (!filePath.endsWith('.html')) {
      return originalSendFile.call(this, filePath, options, callback);
    }

    const fs = require('fs');
    
    // Read the HTML file
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading HTML file:', err);
        return res.status(500).send('Error loading page');
      }

      // Get API URL from environment or construct from request
      const apiUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}/api`;

      // Inject API_URL before the first <script> tag
      let injectedData = data.replace(
        /<script>/,
        `<script>
          // Injected from server environment
          window.ENV = {
            API_URL: '${apiUrl}'
          };
        </script>
        <script>`
      );

      // Send the modified HTML with correct content type
      res.type('html').send(injectedData);
    });
  };

  next();
};

// Apply env injection middleware
app.use(injectEnvToHtml);

// Serve static files from 'public' directory (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // Don't serve HTML files through static middleware
    // They'll be handled by specific routes with env injection
    if (filePath.endsWith('.html')) {
      res.status(404);
    }
  }
}));

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
        landingPage: `${req.protocol}://${req.get('host')}/`,
        appGuide: `${req.protocol}://${req.get('host')}/app-guide`,
        adminLogin: `${req.protocol}://${req.get('host')}/admin`,
        adminDashboard: `${req.protocol}://${req.get('host')}/admin/dashboard`,
      },
      note: 'Admin endpoints require JWT token in Authorization header',
    });
  }
});

// App guide route (for mobile WebView)
app.get('/app-guide', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app-guide.html'));
});

// Privacy policy route
app.get('/privacypolicy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacypolicy.html'));
});

// Terms and conditions route
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

// Admin panel routes (serve HTML files with env injection)
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
  console.log(`📍 API URL: ${process.env.API_URL || `http://localhost:${PORT}/api`}`);
  console.log(`🌐 Landing Page: http://localhost:${PORT}`);
  console.log(`📱 App Guide: http://localhost:${PORT}/app-guide`);
  console.log(`🔐 Admin Login: http://localhost:${PORT}/admin`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin/dashboard`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📚 API Documentation: http://localhost:${PORT}\n`);
});