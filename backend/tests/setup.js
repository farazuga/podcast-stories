// Jest setup file for VidPOD Phase 1 Tests
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-phase1-email-auth';

// Mock console.log in tests to reduce noise
const originalLog = console.log;
console.log = (...args) => {
  if (process.env.VERBOSE_TESTS) {
    originalLog(...args);
  }
};

// Global test helpers
global.API_URL = 'http://localhost:3000/api';

// Default account credentials for testing
global.DEFAULT_ACCOUNTS = {
  admin: {
    email: 'admin@vidpod.com',
    password: 'rumi&amaml',
    role: 'amitrace_admin'
  },
  teacher: {
    email: 'teacher@vidpod.com', 
    password: 'rumi&amaml',
    role: 'teacher'
  },
  student: {
    email: 'student@vidpod.com',
    password: 'rumi&amaml',
    role: 'student'
  }
};

// Jest timeout for async tests
jest.setTimeout(10000);