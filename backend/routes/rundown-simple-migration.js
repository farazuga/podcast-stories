const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { verifyToken } = require('../middleware/auth');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const router = express.Router();

// Simple migration route
router.post('/run-simple', verifyToken, async (req, res) => {
  try {
    // Only allow admin
    if (req.user.role !== 'amitrace_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('🚀 Running simple rundown migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '014_create_rundown_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');

    // Execute the entire migration SQL
    await pool.query(migrationSQL);

    console.log('✅ Migration completed');

    // Verify tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rundowns', 'rundown_segments', 'rundown_talent', 'rundown_stories')
      ORDER BY table_name;
    `);

    const tables = tablesCheck.rows.map(row => row.table_name);

    res.json({
      success: true,
      message: 'Simple rundown migration completed!',
      tablesCreated: tables,
      totalTables: tables.length
    });

  } catch (error) {
    console.error('❌ Simple migration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check server logs for details'
    });
  }
});

module.exports = router;