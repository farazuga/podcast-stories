const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

/**
 * VidPOD Rundown Creator Server
 * 
 * Independent Express application for rundown management.
 * Runs on separate port to avoid conflicts with main VidPOD.
 * Integrates with main VidPOD via API proxy for auth and data.
 */

const app = express();
const PORT = process.env.RUNDOWN_PORT || 3001;

// Import middleware
const { verifyToken, addVidPodHelpers } = require('./middleware/auth-proxy');

// Import routes
const rundownRoutes = require('./routes/rundowns');
const segmentRoutes = require('./routes/segments');
const integrationRoutes = require('./routes/integration');

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',  // Main VidPOD frontend
    'http://localhost:3001',  // Rundown creator frontend
    'https://frontend-production-b75b.up.railway.app', // Production frontend
    'https://podcast-stories-production.up.railway.app' // Production backend
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'VidPOD Rundown Creator',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// API status endpoint
app.get('/api', (req, res) => {
  res.json({
    service: 'VidPOD Rundown Creator API',
    version: '1.0.0',
    endpoints: {
      rundowns: '/api/rundowns',
      segments: '/api/segments',
      integration: '/api/integration',
      health: '/health'
    },
    documentation: 'See README.md for full API documentation'
  });
});

// Protected API routes (require authentication)
app.use('/api/rundowns', verifyToken, addVidPodHelpers, rundownRoutes);
app.use('/api/segments', verifyToken, addVidPodHelpers, segmentRoutes);
app.use('/api/integration', verifyToken, addVidPodHelpers, integrationRoutes);

// Catch-all route for frontend SPA routing
app.get('*', (req, res) => {
  // If it's an API request, return 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'API endpoint not found',
      service: 'rundown-creator'
    });
  }
  
  // Otherwise serve the main HTML file
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('[SERVER ERROR]', error);
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    service: 'rundown-creator',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    service: 'rundown-creator',
    path: req.path,
    method: req.method
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('🎙️  VidPOD Rundown Creator Server Started');
  console.log('=====================================');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend: http://localhost:${PORT}`);
  console.log(`⚡ API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log('=====================================');
  
  // Test connection to main VidPOD API
  const testMainAPI = async () => {
    try {
      const axios = require('axios');
      const vidpodUrl = process.env.VIDPOD_API_URL || 'http://localhost:3000/api';
      const response = await axios.get(`${vidpodUrl.replace('/api', '')}/health`, { timeout: 3000 });
      console.log(`✅ Main VidPOD API connection successful: ${vidpodUrl}`);
    } catch (error) {
      console.log(`⚠️  Main VidPOD API not reachable: ${error.message}`);
      console.log('   Make sure the main VidPOD server is running on port 3000');
    }
  };
  
  setTimeout(testMainAPI, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Rundown Creator server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('✅ Rundown Creator server closed');
    process.exit(0);
  });
});

module.exports = app;