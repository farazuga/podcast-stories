const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const storiesRoutes = require('./routes/stories');
const tagsRoutes = require('./routes/tags');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/tags', tagsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Podcast Stories API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and create admin user
async function initializeDatabase() {
  try {
    // Check if admin user exists
    const adminCheck = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [process.env.ADMIN_USERNAME || 'admin']
    );

    if (adminCheck.rows.length === 0) {
      // Create admin user
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      await pool.query(
        'INSERT INTO users (username, password, email, school, role) VALUES ($1, $2, $3, $4, $5)',
        [
          process.env.ADMIN_USERNAME || 'admin',
          hashedPassword,
          process.env.ADMIN_EMAIL || 'admin@podcaststories.com',
          process.env.ADMIN_SCHOOL || 'Podcast Central',
          'admin'
        ]
      );
      console.log('Admin user created successfully');
    }

    // Create default tags
    const defaultTags = ['Health', 'Education', 'Politics', 'Technology', 'Environment', 
                         'Community', 'Sports', 'Business', 'Arts & Culture', 'Safety'];
    
    const adminUser = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    if (adminUser.rows.length > 0) {
      const adminId = adminUser.rows[0].id;
      
      for (const tag of defaultTags) {
        await pool.query(
          'INSERT INTO tags (tag_name, created_by) VALUES ($1, $2) ON CONFLICT (tag_name) DO NOTHING',
          [tag, adminId]
        );
      }
      console.log('Default tags created');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await initializeDatabase();
});

module.exports = { pool };