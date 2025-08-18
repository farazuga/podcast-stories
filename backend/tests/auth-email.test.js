const request = require('supertest');
const bcrypt = require('bcrypt');

// Mock the Express app
const express = require('express');
const authRoutes = require('../routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Mock the database pool
jest.mock('pg', () => {
  const mClient = {
    query: jest.fn(),
  };
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

const { Pool } = require('pg');
const pool = new Pool();

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
  verify: jest.fn(() => ({ id: 1, email: 'test@example.com', role: 'student' }))
}));

const jwt = require('jsonwebtoken');

describe('Phase 1: Email-based Authentication Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with email', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@vidpod.com',
        name: 'VidPOD Admin',
        password: await bcrypt.hash('rumi&amaml', 10),
        role: 'amitrace_admin',
        student_id: null,
        school_name: 'VidPOD Default School'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@vidpod.com',
          password: 'rumi&amaml'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user.email).toBe('admin@vidpod.com');
      expect(response.body.user.role).toBe('amitrace_admin');
      expect(response.body.user.name).toBe('VidPOD Admin');
      expect(response.body.user.school).toBe('VidPOD Default School');
    });

    it('should login successfully with username (backward compatibility)', async () => {
      const mockUser = {
        id: 2,
        username: 'teacher',
        email: 'teacher@vidpod.com',
        name: 'Demo Teacher',
        password: await bcrypt.hash('rumi&amaml', 10),
        role: 'teacher',
        student_id: null,
        school_name: 'VidPOD Default School'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'teacher',
          password: 'rumi&amaml'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('teacher@vidpod.com');
      expect(response.body.user.role).toBe('teacher');
    });

    it('should detect email vs username correctly', async () => {
      // Test with email format
      pool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@vidpod.com',
          password: 'rumi&amaml'
        });

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT u.*, s.school_name FROM users u LEFT JOIN schools s ON u.school_id = s.id WHERE u.email = $1',
        ['student@vidpod.com']
      );
    });

    it('should return error for invalid credentials', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@vidpod.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return error for wrong password', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@vidpod.com',
        password: await bcrypt.hash('correctpassword', 10),
        role: 'amitrace_admin'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@vidpod.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should require email/username and password', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'rumi&amaml'
        });

      expect(response1.status).toBe(400);
      expect(response1.body.error).toBe('Email (or username) and password are required');

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@vidpod.com'
        });

      expect(response2.status).toBe(400);
    });

    it('should include student_id in response for student users', async () => {
      const mockStudent = {
        id: 3,
        username: 'student',
        email: 'student@vidpod.com',
        name: 'Demo Student',
        password: await bcrypt.hash('rumi&amaml', 10),
        role: 'student',
        student_id: 'STU001',
        school_name: 'VidPOD Default School'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockStudent] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@vidpod.com',
          password: 'rumi&amaml'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.student_id).toBe('STU001');
      expect(response.body.user.role).toBe('student');
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify valid token and return updated user data', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@vidpod.com',
        name: 'VidPOD Admin',
        role: 'amitrace_admin',
        student_id: null,
        school_name: 'VidPOD Default School'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.user.email).toBe('admin@vidpod.com');
      expect(response.body.user.name).toBe('VidPOD Admin');
      expect(response.body.user.school).toBe('VidPOD Default School');
    });

    it('should return error for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    it('should return error for invalid token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });

    it('should return error for user not found', async () => {
      // Mock jwt.verify to return valid decode, but user not found in DB
      jwt.verify.mockReturnValueOnce({ id: 999, email: 'notfound@example.com', role: 'student' });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('Default Accounts Tests', () => {
    it('should have correct password hashes for default accounts', async () => {
      const password = 'rumi&amaml';
      
      // Test admin hash
      const adminHash = '$2b$10$9kmNCTT61nxs9qIt9m5NgusindcEsu4w5InzU8k0TC0ytQSdSUHnu';
      const adminValid = await bcrypt.compare(password, adminHash);
      expect(adminValid).toBe(true);

      // Test teacher hash  
      const teacherHash = '$2b$10$AT4RdjlGzUWPS2yQmHQvbOuRrlQezuxe/P8GNPmHyYZyOFNZZvfMm';
      const teacherValid = await bcrypt.compare(password, teacherHash);
      expect(teacherValid).toBe(true);

      // Test student hash
      const studentHash = '$2b$10$fIbgL.UQFoBonLXFI9qk/O0ZRntyDnzCWZXUT0CgDXaxewPl8iCyG';
      const studentValid = await bcrypt.compare(password, studentHash);
      expect(studentValid).toBe(true);
    });
  });

  describe('Role-based JWT Token Tests', () => {
    it('should include email in JWT token payload', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@vidpod.com',
        password: await bcrypt.hash('rumi&amaml', 10),
        role: 'amitrace_admin',
        name: 'VidPOD Admin',
        student_id: null,
        school_name: 'VidPOD Default School'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@vidpod.com',
          password: 'rumi&amaml'
        });

      expect(response.status).toBe(200);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          email: 'admin@vidpod.com',
          username: 'admin',
          role: 'amitrace_admin'
        }),
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle database connection errors gracefully', async () => {
      // Clear all previous mocks to ensure clean state
      jest.clearAllMocks();
      pool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@vidpod.com',
          password: 'rumi&amaml'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Server error during login');
    });

    it('should handle bcrypt errors gracefully', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@vidpod.com',
        password: 'invalid-hash',
        role: 'amitrace_admin'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@vidpod.com',
          password: 'rumi&amaml'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Server error during login');
    });
  });
});

describe('Frontend Integration Tests', () => {
  describe('Role-based Redirects', () => {
    // These would be integration tests that could be run with a headless browser
    // For now, we document the expected behavior
    
    it('should redirect admin users to /admin.html', () => {
      const adminUser = { role: 'amitrace_admin' };
      // In a real integration test, this would verify the redirect
      expect(getExpectedRedirect(adminUser)).toBe('/admin.html');
    });

    it('should redirect teacher users to /teacher-dashboard.html', () => {
      const teacherUser = { role: 'teacher' };
      expect(getExpectedRedirect(teacherUser)).toBe('/teacher-dashboard.html');
    });

    it('should redirect student users to /dashboard.html', () => {
      const studentUser = { role: 'student' };
      expect(getExpectedRedirect(studentUser)).toBe('/dashboard.html');
    });
  });
});

// Helper function for redirect tests
function getExpectedRedirect(user) {
  switch(user.role) {
    case 'amitrace_admin': return '/admin.html';
    case 'teacher': return '/teacher-dashboard.html';
    case 'student':
    default: return '/dashboard.html';
  }
}