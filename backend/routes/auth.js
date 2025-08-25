const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { password, email, name, school } = req.body;

    // Validate input
    if (!password || !email) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await pool.query(
      'INSERT INTO users (password, email, name, school, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, school, role',
      [hashedPassword, email, name || null, school || null, 'user']
    );

    // Create token
    const token = jwt.sign(
      { 
        id: newUser.rows[0].id, 
        email: newUser.rows[0].email,
        role: newUser.rows[0].role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
        name: newUser.rows[0].name,
        school: newUser.rows[0].school,
        role: newUser.rows[0].role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login - Email-based authentication only
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await pool.query(
      'SELECT u.*, s.school_name FROM users u LEFT JOIN schools s ON u.school_id = s.id WHERE u.email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userData = user.rows[0];

    // Create token with email as primary identifier
    const token = jwt.sign(
      { 
        id: userData.id, 
        email: userData.email,
        role: userData.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        first_name: userData.first_name,
        last_name: userData.last_name,
        school: userData.school_name,
        role: userData.role,
        student_id: userData.student_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data with school information
    const user = await pool.query(
      'SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.role, u.student_id, s.school_name FROM users u LEFT JOIN schools s ON u.school_id = s.id WHERE u.id = $1',
      [verified.id]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const userData = user.rows[0];

    res.json({
      valid: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        first_name: userData.first_name,
        last_name: userData.last_name,
        school: userData.school_name,
        role: userData.role,
        student_id: userData.student_id
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;