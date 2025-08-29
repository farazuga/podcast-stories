// Test Schema Integration Without API Server
// Purpose: Verify database schema fixes work for course/lesson creation
// Usage: node test-schema-integration.js

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/podcast_stories',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testSchemaIntegration() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Database Schema Integration...\n');
    
    // Test 1: Verify all required tables exist
    console.log('📋 Test 1: Table Existence Check');
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('courses', 'lessons', 'quizzes', 'schools', 'course_enrollments', 'student_progress')
      ORDER BY tablename
    `);
    
    const requiredTables = ['courses', 'lessons', 'quizzes', 'schools', 'course_enrollments', 'student_progress'];
    const existingTables = tables.rows.map(r => r.tablename);
    
    requiredTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`   ${exists ? '✅' : '❌'} ${table} table`);
    });
    
    // Test 2: Verify new schema columns exist
    console.log('\n📊 Test 2: New Schema Columns Check');
    
    const columnChecks = [
      { table: 'courses', columns: ['total_weeks', 'difficulty_level', 'prerequisites', 'enrollment_limit'] },
      { table: 'lessons', columns: ['lesson_number', 'difficulty_level', 'requires_completion_of', 'vocabulary_terms'] },
      { table: 'quizzes', columns: ['attempts_allowed', 'time_limit'] },
      { table: 'schools', columns: ['name'] }
    ];
    
    for (const check of columnChecks) {
      console.log(`   📄 ${check.table}:`);
      
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = ANY($2)
        ORDER BY column_name
      `, [check.table, check.columns]);
      
      check.columns.forEach(expectedCol => {
        const found = columns.rows.find(r => r.column_name === expectedCol);
        console.log(`     ${found ? '✅' : '❌'} ${expectedCol} ${found ? `(${found.data_type})` : ''}`);
      });
    }
    
    // Test 3: Test course creation with new schema
    console.log('\n🆕 Test 3: Course Creation with New Schema');
    
    // First ensure we have a school
    await client.query(`
      INSERT INTO schools (school_name, name) 
      VALUES ('Test School', 'Test School')
      ON CONFLICT (school_name) DO NOTHING
    `);
    
    const school = await client.query('SELECT id FROM schools LIMIT 1');
    const schoolId = school.rows[0]?.id;
    
    if (schoolId) {
      try {
        const courseResult = await client.query(`
          INSERT INTO courses (
            title, description, teacher_id, school_id,
            total_weeks, difficulty_level, prerequisites, enrollment_limit
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8
          ) RETURNING id, title, total_weeks, difficulty_level, enrollment_limit
        `, [
          'Schema Test Course', 
          'Testing new schema fields',
          1, // teacher_id
          schoolId,
          12, // total_weeks
          'intermediate', // difficulty_level  
          '["Basic Programming"]', // prerequisites
          25 // enrollment_limit
        ]);
        
        const course = courseResult.rows[0];
        console.log('   ✅ Course created successfully');
        console.log(`   📊 Course ID: ${course.id}`);
        console.log(`   📋 Fields: total_weeks=${course.total_weeks}, difficulty=${course.difficulty_level}, limit=${course.enrollment_limit}`);
        
        // Test 4: Test lesson creation with new schema
        console.log('\n📚 Test 4: Lesson Creation with New Schema');
        
        const lessonResult = await client.query(`
          INSERT INTO lessons (
            title, description, content, course_id, week_number,
            lesson_number, difficulty_level, is_quiz_required, vocabulary_terms
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          ) RETURNING id, title, lesson_number, difficulty_level
        `, [
          'Schema Test Lesson',
          'Testing lesson schema',
          'This lesson tests new schema fields',
          course.id,
          1, // week_number
          1, // lesson_number
          'beginner', // difficulty_level
          false, // is_quiz_required
          JSON.stringify({ terms: ['variable', 'function'] }) // vocabulary_terms
        ]);
        
        const lesson = lessonResult.rows[0];
        console.log('   ✅ Lesson created successfully');
        console.log(`   📊 Lesson ID: ${lesson.id}`);
        console.log(`   📋 Fields: lesson_number=${lesson.lesson_number}, difficulty=${lesson.difficulty_level}`);
        
        // Clean up test data
        await client.query('DELETE FROM lessons WHERE id = $1', [lesson.id]);
        await client.query('DELETE FROM courses WHERE id = $1', [course.id]);
        console.log('   🧹 Test data cleaned up');
        
      } catch (error) {
        console.log('   ❌ Course/Lesson creation failed:', error.message);
      }
    } else {
      console.log('   ❌ No school found for testing');
    }
    
    // Test 5: Test constraints
    console.log('\n🔒 Test 5: Constraint Validation');
    
    try {
      await client.query(`
        INSERT INTO courses (title, description, teacher_id, school_id, total_weeks)
        VALUES ('Invalid Course', 'Test', 1, $1, 0)
      `, [schoolId]);
      console.log('   ❌ Constraint failed - should not allow total_weeks = 0');
    } catch (error) {
      console.log('   ✅ total_weeks constraint working:', error.message.includes('courses_total_weeks_positive'));
    }
    
    console.log('\n🎉 Schema integration testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  testSchemaIntegration().catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  });
}

module.exports = { testSchemaIntegration };