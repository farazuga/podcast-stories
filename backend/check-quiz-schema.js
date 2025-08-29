#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkQuizSchema() {
  try {
    console.log('🔍 Checking current quizzes table schema...');
    
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'quizzes'
      ORDER BY ordinal_position
    `;

    const result = await pool.query(schemaQuery);
    
    console.log('\n📋 Current quizzes table columns:');
    console.log('===============================');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      if (row.column_default) {
        console.log(`   Default: ${row.column_default}`);
      }
    });

    console.log('\n🔍 Looking for lesson_material_id column...');
    const hasLessonMaterialId = result.rows.some(row => row.column_name === 'lesson_material_id');
    
    if (hasLessonMaterialId) {
      console.log('✅ lesson_material_id column exists');
    } else {
      console.log('❌ lesson_material_id column is MISSING');
      console.log('🔧 This column is required by the quizzes API routes');
    }

    // Check what foreign key columns do exist
    console.log('\n🔗 Foreign key columns found:');
    const foreignKeyColumns = result.rows.filter(row => 
      row.column_name.includes('_id') && row.column_name !== 'id'
    );
    foreignKeyColumns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    return hasLessonMaterialId;

  } catch (error) {
    console.error('❌ Error checking quiz schema:', error.message);
    return false;
  }
}

async function main() {
  try {
    const hasRequiredColumn = await checkQuizSchema();
    
    if (!hasRequiredColumn) {
      console.log('\n⚠️  ISSUE IDENTIFIED:');
      console.log('The quizzes table is missing the lesson_material_id column');
      console.log('that is required by the API routes in quizzes.js');
      console.log('\nThis needs to be fixed in the database schema migration.');
    } else {
      console.log('\n✅ Quizzes table schema looks correct for API integration');
    }

  } finally {
    await pool.end();
  }
}

main();