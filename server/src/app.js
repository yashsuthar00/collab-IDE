const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Route imports
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const sharedCodeRoutes = require('./routes/sharedCodeRoutes');
const emailRoutes = require('./routes/emailRoutes');
const { checkClientVersion } = require('./middleware/versionMiddleware');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add version checking middleware
app.use(checkClientVersion);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/shared', sharedCodeRoutes);
app.use('/api/email', emailRoutes);

// Health check route
app.get('/ping', (req, res) => {
  res.status(200).send('Pong');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;
