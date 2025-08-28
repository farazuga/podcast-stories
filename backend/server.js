const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const path = require('path');

// Load environment variables
dotenv.config();

// Import centralized configuration
const config = require('./config/environment');
const db = require('./config/database');

const app = express();
const PORT = config.PORT;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const storiesRoutes = require('./routes/stories');
const tagsRoutes = require('./routes/tags');
const schoolsRoutes = require('./routes/schools');
const teacherRequestsRoutes = require('./routes/teacher-requests');
const adminTeachersRoutes = require('./routes/adminTeachers');
const favoritesRoutes = require('./routes/favorites');
const analyticsRoutes = require('./routes/analytics');
const classesRoutes = require('./routes/classes');
const passwordResetRoutes = require('./routes/password-reset');
const studentRegistrationRoutes = require('./routes/student-registration');
const testConstraintsRoutes = require('./routes/test-constraints');
const migrationRoutes = require('./routes/run-migration');
const debugRoutes = require('./routes/debug');
const tempDebugRoutes = require('./routes/temp-debug');
const tokenDebugRoutes = require('./routes/token-debug');
const testEmailRoutes = require('./routes/test-email-simple');
const updatePasswordsRoutes = require('./routes/update-passwords');
const userManagementRoutes = require('./routes/userManagement');
const adminMigrateRoutes = require('./routes/admin-migrate');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/teacher-requests', teacherRequestsRoutes);
app.use('/api/admin/teachers', adminTeachersRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/students', studentRegistrationRoutes);
app.use('/api/test', testConstraintsRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/temp-debug', tempDebugRoutes);
app.use('/api/token-debug', tokenDebugRoutes);
app.use('/api/test-email', testEmailRoutes);
app.use('/api/admin/update-passwords', updatePasswordsRoutes);
app.use('/api/user-management', userManagementRoutes);
app.use('/api/admin', adminMigrateRoutes);

// Serve static files from the frontend directory (after API routes)
app.use(express.static(path.join(__dirname, 'frontend')));

// API root endpoint  
app.get('/api', (req, res) => {
  res.json({ message: 'Podcast Stories API is running!' });
});

// 404 handler - serve custom 404 page for all non-API routes
app.get('*', (req, res) => {
  // Don't serve 404 page for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Serve custom 404 page for all other routes
  res.status(404).sendFile(path.join(__dirname, 'frontend', '404.html'));
});

// Explicit routes for main pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
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
    const adminCheck = await db.query(
      'SELECT * FROM users WHERE username = $1',
      [process.env.ADMIN_USERNAME || 'admin']
    );

    if (adminCheck.rows.length === 0) {
      // Create admin user
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      
      // First ensure a default school exists
      const schoolResult = await db.query(
        'INSERT INTO schools (school_name, created_by) VALUES ($1, NULL) ON CONFLICT (school_name) DO NOTHING RETURNING id',
        [process.env.ADMIN_SCHOOL || 'Podcast Central HS']
      );
      
      // Get school id
      const school = await db.query('SELECT id FROM schools WHERE school_name = $1', [process.env.ADMIN_SCHOOL || 'Podcast Central HS']);
      const schoolId = school.rows[0]?.id;
      
      const userResult = await db.query(
        'INSERT INTO users (username, password, email, role, name, school_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [
          process.env.ADMIN_USERNAME || 'admin',
          hashedPassword,
          process.env.ADMIN_EMAIL || 'admin@podcaststories.com',
          'amitrace_admin',
          'System Administrator',
          schoolId
        ]
      );
      
      // Update school to have the admin as creator
      if (schoolId) {
        await db.query('UPDATE schools SET created_by = $1 WHERE id = $2', [userResult.rows[0].id, schoolId]);
      }
      
      console.log('Admin user created successfully');
    }

    // Create default tags
    const defaultTags = ['Health', 'Education', 'Politics', 'Technology', 'Environment', 
                         'Community', 'Sports', 'Business', 'Arts & Culture', 'Safety'];
    
    const adminUser = await db.query('SELECT id FROM users WHERE role IN ($1, $2) LIMIT 1', ['admin', 'amitrace_admin']);
    if (adminUser.rows.length > 0) {
      const adminId = adminUser.rows[0].id;
      
      for (const tag of defaultTags) {
        await db.query(
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

module.exports = { app, db };