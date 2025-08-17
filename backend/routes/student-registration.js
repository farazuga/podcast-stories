const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Student registration endpoint
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, name, student_id, school_id } = req.body;

    // Validate required fields
    if (!username || !password || !email || !name) {
      return res.status(400).json({ 
        error: 'Username, password, email, and name are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user already exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Username or email already exists' 
      });
    }

    // Validate school_id if provided
    if (school_id) {
      const schoolExists = await pool.query('SELECT id FROM schools WHERE id = $1', [school_id]);
      if (schoolExists.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid school selected' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student user
    const newUser = await pool.query(`
      INSERT INTO users (username, password, email, name, student_id, school_id, role) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, username, email, name, student_id, school_id, role
    `, [
      username, 
      hashedPassword, 
      email, 
      name,
      student_id || null,
      school_id || null,
      'student'
    ]);

    // Create token
    const token = jwt.sign(
      { 
        id: newUser.rows[0].id, 
        username: newUser.rows[0].username,
        role: newUser.rows[0].role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Student account created successfully',
      token,
      user: {
        id: newUser.rows[0].id,
        username: newUser.rows[0].username,
        email: newUser.rows[0].email,
        name: newUser.rows[0].name,
        student_id: newUser.rows[0].student_id,
        school_id: newUser.rows[0].school_id,
        role: newUser.rows[0].role
      }
    });
  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({ error: 'Server error during student registration' });
  }
});

// Get available schools for student registration
router.get('/schools', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, school_name 
      FROM schools 
      ORDER BY school_name ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

module.exports = router;