const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Secure migration route - only accessible by authenticated admin users
router.post('/run-migration', verifyToken, async (req, res) => {
  try {
    // Only allow amitrace_admin role to run migrations
    if (req.user.role !== 'amitrace_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only administrators can run migrations.'
      });
    }

    console.log('🚀 Starting Rundown System Migration...');
    console.log('👤 Initiated by:', req.user.email);
    
    // Read the rundown migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '014_create_rundown_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found: 014_create_rundown_system.sql');
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded successfully');
    
    // Check if tables already exist
    console.log('🔍 Checking existing tables...');
    const existingTablesCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rundowns', 'rundown_segments', 'rundown_talent', 'rundown_stories')
      ORDER BY table_name;
    `);
    
    const existingTables = existingTablesCheck.rows.map(row => row.table_name);
    console.log('📊 Existing rundown tables:', existingTables);
    
    if (existingTables.length === 4) {
      return res.json({
        success: true,
        message: 'Rundown system tables already exist!',
        existingTables: existingTables,
        status: 'already_migrated'
      });
    }
    
    console.log('⏳ Executing migration...');
    
    // Execute the migration in a transaction
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Split migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      let executedCount = 0;
      const results = [];
      
      for (const statement of statements) {
        try {
          if (statement.toLowerCase().includes('create table')) {
            const tableName = statement.match(/create table (?:if not exists )?(\w+)/i)?.[1];
            console.log(`📋 Creating table: ${tableName}`);
            await client.query(statement);
            results.push(`✅ Created table: ${tableName}`);
            executedCount++;
          } else if (statement.toLowerCase().includes('create index')) {
            const indexName = statement.match(/create index (?:if not exists )?(\w+)/i)?.[1];
            console.log(`🗂️ Creating index: ${indexName}`);
            await client.query(statement);
            results.push(`✅ Created index: ${indexName}`);
            executedCount++;
          } else if (statement.toLowerCase().includes('create trigger')) {
            const triggerName = statement.match(/create trigger (\w+)/i)?.[1];
            console.log(`⚡ Creating trigger: ${triggerName}`);
            await client.query(statement);
            results.push(`✅ Created trigger: ${triggerName}`);
            executedCount++;
          } else if (statement.toLowerCase().includes('create or replace function')) {
            console.log(`🔧 Creating function...`);
            await client.query(statement);
            results.push(`✅ Created function`);
            executedCount++;
          } else if (statement.toLowerCase().includes('comment on')) {
            console.log(`💬 Adding comment...`);
            await client.query(statement);
            results.push(`✅ Added comment`);
            executedCount++;
          } else if (statement.trim().length > 10) {
            console.log(`🔄 Executing: ${statement.substring(0, 50)}...`);
            await client.query(statement);
            results.push(`✅ Executed statement`);
            executedCount++;
          }
        } catch (statementError) {
          console.warn(`⚠️ Statement warning: ${statementError.message}`);
          results.push(`⚠️ Warning: ${statementError.message.substring(0, 100)}`);
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ Migration transaction committed successfully');
      
    } catch (transactionError) {
      await client.query('ROLLBACK');
      console.error('❌ Migration transaction failed, rolled back');
      throw transactionError;
    } finally {
      client.release();
    }
    
    // Verify tables were created
    console.log('🔍 Verifying migration results...');
    const verificationCheck = await db.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('rundowns', 'rundown_segments', 'rundown_talent', 'rundown_stories')
      ORDER BY table_name;
    `);
    
    const createdTables = verificationCheck.rows.map(row => ({
      name: row.table_name,
      columns: parseInt(row.column_count)
    }));
    
    // Check indexes
    const indexCheck = await db.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename LIKE 'rundown%' 
      ORDER BY tablename, indexname
    `);
    
    const createdIndexes = indexCheck.rows.length;
    
    console.log('🎉 Migration completed successfully!');
    console.log(`📊 Created tables: ${createdTables.length}`);
    console.log(`📊 Created indexes: ${createdIndexes}`);
    
    res.json({
      success: true,
      message: 'Rundown System Migration completed successfully!',
      tablesCreated: createdTables,
      indexesCreated: createdIndexes,
      statementsExecuted: executedCount,
      migrationResults: results
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.detail || 'No additional details',
      hint: error.hint || 'Check server logs for more information'
    });
  }
});

// Route to check migration status
router.get('/status', verifyToken, async (req, res) => {
  try {
    // Check if rundown tables exist
    const tablesCheck = await db.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('rundowns', 'rundown_segments', 'rundown_talent', 'rundown_stories')
      ORDER BY table_name;
    `);
    
    const existingTables = tablesCheck.rows.map(row => ({
      name: row.table_name,
      columns: parseInt(row.column_count)
    }));
    
    // Check indexes
    const indexCheck = await db.query(`
      SELECT COUNT(*) as index_count
      FROM pg_indexes 
      WHERE tablename LIKE 'rundown%'
    `);
    
    const indexCount = parseInt(indexCheck.rows[0].index_count);
    
    // Check if we have any rundowns
    let rundownCount = 0;
    if (existingTables.some(t => t.name === 'rundowns')) {
      try {
        const countCheck = await db.query('SELECT COUNT(*) as count FROM rundowns');
        rundownCount = parseInt(countCheck.rows[0].count);
      } catch (e) {
        console.warn('Could not count rundowns:', e.message);
      }
    }
    
    const isFullyMigrated = existingTables.length === 4 && indexCount > 0;
    
    res.json({
      success: true,
      isMigrated: isFullyMigrated,
      tablesFound: existingTables,
      totalTables: existingTables.length,
      expectedTables: 4,
      indexesFound: indexCount,
      rundownCount: rundownCount,
      status: isFullyMigrated ? 'migrated' : 'not_migrated'
    });
    
  } catch (error) {
    console.error('❌ Status check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;