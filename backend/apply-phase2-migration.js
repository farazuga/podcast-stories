#!/usr/bin/env node

// Apply Phase 2 Migration: Story Approval System
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_PUBLIC_URL = 'postgresql://postgres:nKDDalkMNysRUnZPHifzWPvgxoxvzXSp@maglev.proxy.rlwy.net:32294/railway';

const pool = new Pool({
  connectionString: DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyPhase2Migration() {
  console.log('🚀 VidPOD Phase 2: Story Approval System Migration');
  console.log('📝 Adding approval workflow to stories...');
  console.log('📊 Proceeding in 3 seconds...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const client = await pool.connect();
  
  try {
    // Read and execute the migration
    const migrationPath = path.join(__dirname, 'migrations', '010_phase2_story_approval.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📁 Applying Phase 2 migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Phase 2 migration completed successfully!');
    
    // Verify the changes
    console.log('\n🔍 Verifying migration results...');
    
    // Check if approval_status field was added
    const columns = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'story_ideas' 
      AND column_name LIKE '%approval%'
      ORDER BY column_name
    `);
    
    console.log('📋 New approval fields added:');
    columns.rows.forEach(col => {
      console.log(`  ✓ ${col.column_name}: ${col.data_type} ${col.column_default ? `(default: ${col.column_default})` : ''}`);
    });
    
    // Check if approval history table was created
    const historyTable = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'story_approval_history'
    `);
    
    if (historyTable.rows.length > 0) {
      console.log('  ✓ story_approval_history table created');
    }
    
    // Check if trigger was created
    const triggers = await client.query(`
      SELECT trigger_name FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_log_approval_change'
    `);
    
    if (triggers.rows.length > 0) {
      console.log('  ✓ Approval change trigger created');
    }
    
    // Check schema version
    const version = await client.query('SELECT MAX(version) as version FROM schema_version');
    console.log(`  ✓ Schema version: ${version.rows[0].version}`);
    
    console.log('\n🎉 PHASE 2 DATABASE MIGRATION SUCCESSFUL!');
    console.log('');
    console.log('📋 Story Approval System Ready:');
    console.log('  • 📝 Stories start as "draft" status');
    console.log('  • 📤 Users can submit for review ("pending")');
    console.log('  • ✅ Admins can approve ("approved") or reject ("rejected")');
    console.log('  • 📊 Full audit trail via approval history');
    console.log('  • 🕒 Automatic timestamp tracking');
    console.log('');
    console.log('🔗 Next Steps:');
    console.log('  1. Create approval API endpoints');
    console.log('  2. Update story creation workflow');
    console.log('  3. Add admin approval interface');
    console.log('  4. Test approval workflow end-to-end');
    
  } catch (error) {
    console.error('❌ Phase 2 migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyPhase2Migration()
  .then(() => {
    console.log('\n🏁 Phase 2 Database Ready - Story Approval System Active!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Migration error:', error.message);
    process.exit(1);
  });