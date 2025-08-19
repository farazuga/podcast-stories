/**
 * Environment Configuration
 * Centralized configuration for all environment variables and settings
 */

const config = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  
  // API Configuration
  API_BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://podcast-stories-production.up.railway.app/api'
    : 'http://localhost:3000/api',
    
  // Frontend Configuration (for client-side use)
  CLIENT_CONFIG: {
    API_URL: process.env.NODE_ENV === 'production' 
      ? 'https://podcast-stories-production.up.railway.app/api'
      : 'http://localhost:3000/api'
  },
  
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'development-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  
  // Email Configuration
  EMAIL: {
    USER: process.env.EMAIL_USER,
    PASS: process.env.EMAIL_PASS,
    GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN
  },
  
  // Admin Configuration
  ADMIN: {
    USERNAME: process.env.ADMIN_USERNAME || 'admin',
    PASSWORD: process.env.ADMIN_PASSWORD,
    EMAIL: process.env.ADMIN_EMAIL || 'admin@vidpod.com',
    SCHOOL: process.env.ADMIN_SCHOOL || 'VidPOD School'
  },
  
  // Application Settings
  APP: {
    NAME: 'VidPOD',
    DESCRIPTION: 'Story Ideas Database',
    VERSION: '2.1.0'
  }
};

module.exports = config;