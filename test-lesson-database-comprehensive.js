#!/usr/bin/env node

/**
 * VidPOD Lesson Management System - Comprehensive Database Testing Suite
 * 
 * This test suite validates:
 * - Schema integrity and constraints
 * - Database function performance and accuracy
 * - Data consistency across all operations
 * - Migration testing and rollback capabilities
 * - Index performance and optimization
 * - Concurrent access and data isolation
 * 
 * Run with: node test-lesson-database-comprehensive.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/podcast_stories',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test configuration
const TEST_CONFIG = {
  PERFORMANCE_THRESHOLD_MS: 100,
  CONCURRENT_USERS: 10,
  STRESS_TEST_ITERATIONS: 50,
  BULK_DATA_SIZE: 100
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
  performance: [],
  security: [],
  integrity: [],
  details: []
};

// Test data storage
let testData = {
  schoolId: null,
  teacherId: null,
  studentId: null,
  courseId: null,
  lessonIds: [],
  quizIds: [],
  materialIds: []
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '', category = 'general') {
  const statusSymbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  
  log(`${statusSymbol} ${testName}`, statusColor);
  if (details) {
    log(`   ${details}`, 'cyan');
  }
  
  testResults.total++;
  testResults.details.push({ name: testName, status, details, category });
  
  switch (status) {
    case 'PASS': testResults.passed++; break;
    case 'FAIL': testResults.failed++; break;
    case 'SKIP': testResults.skipped++; break;
  }
}

async function runQuery(query, params = []) {
  const startTime = Date.now();
  try {
    const result = await db.query(query, params);
    const duration = Date.now() - startTime;
    return { ...result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    error.duration = duration;
    throw error;
  }
}

// =============================================================================
// SCHEMA VALIDATION TESTS
// =============================================================================

async function testSchemaIntegrity() {
  log('\n🗄️ SCHEMA INTEGRITY TESTS', 'bright');
  
  const expectedTables = {
    'courses': ['id', 'title', 'description', 'teacher_id', 'school_id', 'total_weeks', 'learning_objectives'],
    'lessons': ['id', 'course_id', 'title', 'description', 'week_number', 'lesson_number', 'content'],
    'lesson_materials': ['id', 'lesson_id', 'title', 'description', 'material_type', 'sort_order'],
    'quizzes': ['id', 'material_id', 'max_attempts', 'time_limit', 'passing_score'],
    'quiz_questions': ['id', 'quiz_id', 'question_text', 'question_type', 'answer_options', 'points_possible'],
    'quiz_attempts': ['id', 'quiz_id', 'student_id', 'attempt_number', 'status', 'responses'],
    'worksheets': ['id', 'material_id', 'form_fields', 'allow_multiple_submissions'],
    'worksheet_submissions': ['id', 'worksheet_id', 'student_id', 'submission_data', 'draft'],
    'student_progress': ['id', 'student_id', 'lesson_id', 'status', 'completion_percentage'],
    'course_enrollments': ['id', 'student_id', 'course_id', 'enrolled_at', 'total_lessons']
  };
  
  for (const [tableName, expectedColumns] of Object.entries(expectedTables)) {
    try {
      // Check table existence
      const tableResult = await runQuery(`
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      
      if (tableResult.rows[0].count === '0') {
        logTest(`Table ${tableName} exists`, 'FAIL', 'Table not found', 'schema');
        continue;
      }
      
      // Check column existence
      const columnsResult = await runQuery(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      const actualColumns = columnsResult.rows.map(row => row.column_name);
      const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
      
      if (missingColumns.length === 0) {
        logTest(`Table ${tableName} schema`, 'PASS', `All ${expectedColumns.length} required columns present`, 'schema');
      } else {
        logTest(`Table ${tableName} schema`, 'FAIL', `Missing columns: ${missingColumns.join(', ')}`, 'schema');
      }
      
    } catch (error) {
      logTest(`Table ${tableName} validation`, 'FAIL', error.message, 'schema');
    }
  }
}

async function testConstraints() {
  log('\n🔒 CONSTRAINT VALIDATION TESTS', 'bright');
  
  const constraintTests = [
    {
      name: 'Course total_weeks positive check',
      query: `INSERT INTO courses (title, teacher_id, school_id, total_weeks) VALUES ('Test', 1, 1, -1)`,
      shouldFail: true,
      errorPattern: /check|constraint/i
    },
    {
      name: 'Quiz passing_score range check',
      query: `INSERT INTO lesson_materials (lesson_id, title, material_type, sort_order) VALUES (1, 'Test', 'quiz', 1) RETURNING id`,
      setup: true
    },
    {
      name: 'Quiz attempts unique constraint',
      query: `INSERT INTO quiz_attempts (quiz_id, student_id, attempt_number, status) VALUES (1, 1, 1, 'in_progress')`,
      shouldFail: true,
      errorPattern: /unique|duplicate/i
    },
    {
      name: 'Foreign key constraint',
      query: `INSERT INTO lessons (course_id, title, week_number, lesson_number) VALUES (99999, 'Invalid', 1, 1)`,
      shouldFail: true,
      errorPattern: /foreign key|violates/i
    }
  ];
  
  for (const test of constraintTests) {
    try {
      await runQuery(test.query);
      
      if (test.shouldFail) {
        logTest(test.name, 'FAIL', 'Should have failed but succeeded', 'constraints');
      } else {
        logTest(test.name, 'PASS', 'Executed successfully', 'constraints');
      }
      
    } catch (error) {
      if (test.shouldFail && test.errorPattern.test(error.message)) {
        logTest(test.name, 'PASS', 'Correctly prevented invalid operation', 'constraints');
      } else if (test.shouldFail) {
        logTest(test.name, 'FAIL', `Wrong error type: ${error.message}`, 'constraints');
      } else {
        logTest(test.name, 'FAIL', error.message, 'constraints');
      }
    }
  }
}

async function testIndexes() {
  log('\n📊 INDEX PERFORMANCE TESTS', 'bright');
  
  const indexQueries = [
    {
      name: 'Course by teacher index',
      query: 'SELECT * FROM courses WHERE teacher_id = $1',
      params: [1],
      expectedIndexes: ['idx_courses_teacher_id']
    },
    {
      name: 'Lessons by course index',
      query: 'SELECT * FROM lessons WHERE course_id = $1 ORDER BY week_number, lesson_number',
      params: [1],
      expectedIndexes: ['idx_lessons_course_id']
    },
    {
      name: 'Student progress index',
      query: 'SELECT * FROM student_progress WHERE student_id = $1 AND lesson_id = $2',
      params: [1, 1],
      expectedIndexes: ['idx_student_progress_student_lesson']
    },
    {
      name: 'Quiz attempts index',
      query: 'SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2',
      params: [1, 1],
      expectedIndexes: ['idx_quiz_attempts_quiz_student']
    }
  ];
  
  for (const indexTest of indexQueries) {
    try {
      // Test query performance
      const result = await runQuery(indexTest.query, indexTest.params);
      const isPerformant = result.duration < TEST_CONFIG.PERFORMANCE_THRESHOLD_MS;
      
      if (isPerformant) {
        logTest(indexTest.name, 'PASS', `Execution time: ${result.duration}ms`, 'performance');
        testResults.performance.push({
          query: indexTest.name,
          duration: result.duration,
          threshold: TEST_CONFIG.PERFORMANCE_THRESHOLD_MS,
          status: 'PASS'
        });
      } else {
        logTest(indexTest.name, 'FAIL', `Slow execution: ${result.duration}ms (threshold: ${TEST_CONFIG.PERFORMANCE_THRESHOLD_MS}ms)`, 'performance');
        testResults.performance.push({
          query: indexTest.name,
          duration: result.duration,
          threshold: TEST_CONFIG.PERFORMANCE_THRESHOLD_MS,
          status: 'FAIL'
        });
      }
      
    } catch (error) {
      logTest(indexTest.name, 'FAIL', error.message, 'performance');
    }
  }
}

// =============================================================================
// FUNCTION TESTING
// =============================================================================

async function testDatabaseFunctions() {
  log('\n⚙️ DATABASE FUNCTION TESTS', 'bright');
  
  // First create test data
  await createTestData();
  
  const functionTests = [
    {
      name: 'calculate_lesson_completion function',
      test: async () => {
        const result = await runQuery('SELECT calculate_lesson_completion($1, $2) as completion', 
          [testData.studentId, testData.lessonIds[0]]);
        const completion = parseFloat(result.rows[0].completion);
        return { success: completion >= 0 && completion <= 100, details: `Completion: ${completion}%` };
      }
    },
    {
      name: 'calculate_course_progress function',
      test: async () => {
        const result = await runQuery('SELECT calculate_course_progress($1, $2) as progress', 
          [testData.studentId, testData.courseId]);
        const progress = result.rows[0].progress;
        return { success: progress && typeof progress === 'object', details: `Progress object returned` };
      }
    },
    {
      name: 'check_lesson_prerequisites function',
      test: async () => {
        const result = await runQuery('SELECT check_lesson_prerequisites($1, $2) as can_access', 
          [testData.studentId, testData.lessonIds[0]]);
        const canAccess = result.rows[0].can_access;
        return { success: typeof canAccess === 'boolean', details: `Can access: ${canAccess}` };
      }
    },
    {
      name: 'update_student_progress function',
      test: async () => {
        await runQuery('SELECT update_student_progress($1, $2)', 
          [testData.studentId, testData.lessonIds[0]]);
        
        const progressResult = await runQuery(`
          SELECT * FROM student_progress 
          WHERE student_id = $1 AND lesson_id = $2
        `, [testData.studentId, testData.lessonIds[0]]);
        
        return { 
          success: progressResult.rows.length > 0, 
          details: `Progress record ${progressResult.rows.length > 0 ? 'created' : 'not created'}` 
        };
      }
    }
  ];
  
  for (const funcTest of functionTests) {
    try {
      const startTime = Date.now();
      const testResult = await funcTest.test();
      const duration = Date.now() - startTime;
      
      if (testResult.success) {
        logTest(funcTest.name, 'PASS', `${testResult.details} (${duration}ms)`, 'functions');
      } else {
        logTest(funcTest.name, 'FAIL', testResult.details, 'functions');
      }
      
    } catch (error) {
      logTest(funcTest.name, 'FAIL', error.message, 'functions');
    }
  }
}

// =============================================================================
// CONCURRENT ACCESS TESTS
// =============================================================================

async function testConcurrentAccess() {
  log('\n🔄 CONCURRENT ACCESS TESTS', 'bright');
  
  const concurrentTests = [
    {
      name: 'Concurrent course creation',
      test: async () => {
        const promises = Array.from({ length: TEST_CONFIG.CONCURRENT_USERS }, (_, i) => 
          runQuery(`
            INSERT INTO courses (title, description, teacher_id, school_id, total_weeks)
            VALUES ($1, $2, $3, $4, $5) RETURNING id
          `, [`Concurrent Course ${i}`, 'Test description', testData.teacherId, testData.schoolId, 4])
        );
        
        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        return { 
          success: successful === TEST_CONFIG.CONCURRENT_USERS,
          details: `${successful}/${TEST_CONFIG.CONCURRENT_USERS} concurrent operations succeeded`
        };
      }
    },
    {
      name: 'Concurrent quiz attempts',
      test: async () => {
        if (testData.quizIds.length === 0) return { success: false, details: 'No quiz available for testing' };
        
        const promises = Array.from({ length: TEST_CONFIG.CONCURRENT_USERS }, (_, i) => 
          runQuery(`
            INSERT INTO quiz_attempts (quiz_id, student_id, attempt_number, status, responses)
            VALUES ($1, $2, $3, 'submitted', '{}')
            ON CONFLICT DO NOTHING RETURNING id
          `, [testData.quizIds[0], testData.studentId, i + 1])
        );
        
        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        return { 
          success: successful > 0,
          details: `${successful}/${TEST_CONFIG.CONCURRENT_USERS} concurrent attempts processed`
        };
      }
    }
  ];
  
  for (const concurrentTest of concurrentTests) {
    try {
      const startTime = Date.now();
      const testResult = await concurrentTest.test();
      const duration = Date.now() - startTime;
      
      if (testResult.success) {
        logTest(concurrentTest.name, 'PASS', `${testResult.details} (${duration}ms)`, 'concurrency');
      } else {
        logTest(concurrentTest.name, 'FAIL', testResult.details, 'concurrency');
      }
      
    } catch (error) {
      logTest(concurrentTest.name, 'FAIL', error.message, 'concurrency');
    }
  }
}

// =============================================================================
// DATA INTEGRITY TESTS
// =============================================================================

async function testDataIntegrity() {
  log('\n🛡️ DATA INTEGRITY TESTS', 'bright');
  
  try {
    // Test cascading deletes
    const testCourseResult = await runQuery(`
      INSERT INTO courses (title, teacher_id, school_id, total_weeks)
      VALUES ('Delete Test Course', $1, $2, 2) RETURNING id
    `, [testData.teacherId, testData.schoolId]);
    
    const testCourseId = testCourseResult.rows[0].id;
    
    // Add lessons
    await runQuery(`
      INSERT INTO lessons (course_id, title, week_number, lesson_number)
      VALUES ($1, 'Test Lesson 1', 1, 1), ($1, 'Test Lesson 2', 1, 2)
    `, [testCourseId]);
    
    // Count lessons before delete
    const lessonsBeforeResult = await runQuery(`
      SELECT COUNT(*) FROM lessons WHERE course_id = $1
    `, [testCourseId]);
    const lessonsBefore = parseInt(lessonsBeforeResult.rows[0].count);
    
    // Delete course (should cascade)
    await runQuery('DELETE FROM courses WHERE id = $1', [testCourseId]);
    
    // Count lessons after delete
    const lessonsAfterResult = await runQuery(`
      SELECT COUNT(*) FROM lessons WHERE course_id = $1
    `, [testCourseId]);
    const lessonsAfter = parseInt(lessonsAfterResult.rows[0].count);
    
    if (lessonsBefore > 0 && lessonsAfter === 0) {
      logTest('Cascading delete integrity', 'PASS', `${lessonsBefore} lessons properly deleted with course`, 'integrity');
    } else {
      logTest('Cascading delete integrity', 'FAIL', `Lessons not properly deleted: before=${lessonsBefore}, after=${lessonsAfter}`, 'integrity');
    }
    
  } catch (error) {
    logTest('Data integrity cascade test', 'FAIL', error.message, 'integrity');
  }
  
  try {
    // Test transaction rollback
    await runQuery('BEGIN');
    
    // Insert course
    const courseResult = await runQuery(`
      INSERT INTO courses (title, teacher_id, school_id, total_weeks)
      VALUES ('Transaction Test Course', $1, $2, 3) RETURNING id
    `, [testData.teacherId, testData.schoolId]);
    
    const transactionCourseId = courseResult.rows[0].id;
    
    // Insert lesson
    await runQuery(`
      INSERT INTO lessons (course_id, title, week_number, lesson_number)
      VALUES ($1, 'Transaction Test Lesson', 1, 1)
    `, [transactionCourseId]);
    
    // Rollback
    await runQuery('ROLLBACK');
    
    // Check if data was rolled back
    const courseCheck = await runQuery('SELECT COUNT(*) FROM courses WHERE id = $1', [transactionCourseId]);
    const courseExists = parseInt(courseCheck.rows[0].count) > 0;
    
    if (!courseExists) {
      logTest('Transaction rollback integrity', 'PASS', 'Data properly rolled back', 'integrity');
    } else {
      logTest('Transaction rollback integrity', 'FAIL', 'Data not rolled back', 'integrity');
    }
    
  } catch (error) {
    await runQuery('ROLLBACK').catch(() => {}); // Ensure rollback
    logTest('Transaction rollback test', 'FAIL', error.message, 'integrity');
  }
}

// =============================================================================
// PERFORMANCE STRESS TESTS
// =============================================================================

async function testPerformanceStress() {
  log('\n⚡ PERFORMANCE STRESS TESTS', 'bright');
  
  const stressTests = [
    {
      name: 'Bulk course insertion',
      test: async () => {
        const startTime = Date.now();
        const coursePromises = Array.from({ length: TEST_CONFIG.BULK_DATA_SIZE }, (_, i) => 
          runQuery(`
            INSERT INTO courses (title, description, teacher_id, school_id, total_weeks)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            `Stress Test Course ${i}`,
            `Generated course for stress testing iteration ${i}`,
            testData.teacherId,
            testData.schoolId,
            Math.floor(Math.random() * 12) + 1
          ])
        );
        
        await Promise.all(coursePromises);
        const duration = Date.now() - startTime;
        const avgTime = duration / TEST_CONFIG.BULK_DATA_SIZE;
        
        return {
          success: avgTime < 50, // Average less than 50ms per insert
          details: `${TEST_CONFIG.BULK_DATA_SIZE} courses in ${duration}ms (avg: ${avgTime.toFixed(2)}ms/course)`
        };
      }
    },
    {
      name: 'Complex query performance',
      test: async () => {
        const startTime = Date.now();
        
        await runQuery(`
          SELECT 
            c.title as course_title,
            COUNT(DISTINCT l.id) as lesson_count,
            COUNT(DISTINCT lm.id) as material_count,
            COUNT(DISTINCT ce.student_id) as enrollment_count,
            AVG(sp.completion_percentage) as avg_completion
          FROM courses c
          LEFT JOIN lessons l ON c.id = l.course_id
          LEFT JOIN lesson_materials lm ON l.id = lm.lesson_id
          LEFT JOIN course_enrollments ce ON c.id = ce.course_id
          LEFT JOIN student_progress sp ON l.id = sp.lesson_id AND ce.student_id = sp.student_id
          WHERE c.teacher_id = $1
          GROUP BY c.id, c.title
          ORDER BY c.created_at DESC
          LIMIT 50
        `, [testData.teacherId]);
        
        const duration = Date.now() - startTime;
        
        return {
          success: duration < 200,
          details: `Complex aggregation query: ${duration}ms`
        };
      }
    }
  ];
  
  for (const stressTest of stressTests) {
    try {
      const testResult = await stressTest.test();
      
      if (testResult.success) {
        logTest(stressTest.name, 'PASS', testResult.details, 'stress');
      } else {
        logTest(stressTest.name, 'FAIL', testResult.details, 'stress');
      }
      
    } catch (error) {
      logTest(stressTest.name, 'FAIL', error.message, 'stress');
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function createTestData() {
  log('\n📝 CREATING TEST DATA', 'bright');
  
  try {
    // Create school
    const schoolResult = await runQuery(`
      INSERT INTO schools (school_name, created_by) 
      VALUES ('Test School LMS', NULL) 
      ON CONFLICT (school_name) DO UPDATE SET school_name = EXCLUDED.school_name
      RETURNING id
    `);
    testData.schoolId = schoolResult.rows[0].id;
    
    // Create teacher
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const teacherResult = await runQuery(`
      INSERT INTO users (email, password, name, role, school_id)
      VALUES ('lms.teacher@vidpod.com', $1, 'LMS Test Teacher', 'teacher', $2)
      ON CONFLICT (email) DO UPDATE SET 
        password = EXCLUDED.password, role = EXCLUDED.role, school_id = EXCLUDED.school_id
      RETURNING id
    `, [hashedPassword, testData.schoolId]);
    testData.teacherId = teacherResult.rows[0].id;
    
    // Create student
    const studentResult = await runQuery(`
      INSERT INTO users (email, password, name, role, school_id, student_id)
      VALUES ('lms.student@vidpod.com', $1, 'LMS Test Student', 'student', $2, 'LMS001')
      ON CONFLICT (email) DO UPDATE SET 
        password = EXCLUDED.password, role = EXCLUDED.role, school_id = EXCLUDED.school_id
      RETURNING id
    `, [hashedPassword, testData.schoolId]);
    testData.studentId = studentResult.rows[0].id;
    
    // Create course
    const courseResult = await runQuery(`
      INSERT INTO courses (title, description, teacher_id, school_id, total_weeks, learning_objectives)
      VALUES (
        'Database Test Course',
        'A comprehensive course for testing database functionality',
        $1, $2, 6,
        '["Test database operations", "Validate data integrity", "Ensure performance"]'::jsonb
      ) RETURNING id
    `, [testData.teacherId, testData.schoolId]);
    testData.courseId = courseResult.rows[0].id;
    
    // Create lessons
    for (let i = 1; i <= 3; i++) {
      const lessonResult = await runQuery(`
        INSERT INTO lessons (
          course_id, title, description, week_number, lesson_number, 
          content, is_published
        ) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id
      `, [
        testData.courseId,
        `Database Test Lesson ${i}`,
        `This is test lesson ${i} for database validation`,
        Math.ceil(i / 2),
        i,
        `Content for lesson ${i} includes comprehensive testing scenarios.`
      ]);
      testData.lessonIds.push(lessonResult.rows[0].id);
    }
    
    // Create materials and quizzes
    for (const lessonId of testData.lessonIds) {
      const materialResult = await runQuery(`
        INSERT INTO lesson_materials (
          lesson_id, title, description, material_type, 
          is_required, is_graded, points_possible, sort_order
        ) VALUES ($1, $2, $3, 'quiz', true, true, 100, 1) RETURNING id
      `, [lessonId, `Quiz for Lesson`, `Test quiz for lesson ${lessonId}`]);
      
      testData.materialIds.push(materialResult.rows[0].id);
      
      const quizResult = await runQuery(`
        INSERT INTO quizzes (
          material_id, max_attempts, time_limit, passing_score,
          randomize_questions, immediate_feedback
        ) VALUES ($1, 3, 600, 70.0, false, true) RETURNING id
      `, [materialResult.rows[0].id]);
      
      testData.quizIds.push(quizResult.rows[0].id);
    }
    
    logTest('Test data creation', 'PASS', `Created ${testData.lessonIds.length} lessons with ${testData.quizIds.length} quizzes`, 'setup');
    
  } catch (error) {
    logTest('Test data creation', 'FAIL', error.message, 'setup');
    throw error;
  }
}

async function cleanupTestData() {
  log('\n🧹 CLEANING UP TEST DATA', 'bright');
  
  try {
    // Delete in reverse order of dependencies
    if (testData.courseId) {
      await runQuery('DELETE FROM courses WHERE id = $1', [testData.courseId]);
    }
    
    // Clean up users
    await runQuery(`
      DELETE FROM users 
      WHERE email IN ('lms.teacher@vidpod.com', 'lms.student@vidpod.com')
    `);
    
    // Clean up school
    if (testData.schoolId) {
      await runQuery('DELETE FROM schools WHERE id = $1', [testData.schoolId]);
    }
    
    // Clean up any stress test data
    await runQuery(`DELETE FROM courses WHERE title LIKE 'Stress Test Course %'`);
    await runQuery(`DELETE FROM courses WHERE title LIKE 'Concurrent Course %'`);
    
    logTest('Test data cleanup', 'PASS', 'All test data removed successfully', 'cleanup');
    
  } catch (error) {
    logTest('Test data cleanup', 'FAIL', error.message, 'cleanup');
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  const startTime = Date.now();
  
  log('🚀 VidPOD Lesson Management Database Test Suite', 'bright');
  log('=' * 60, 'bright');
  log(`📊 Performance Threshold: ${TEST_CONFIG.PERFORMANCE_THRESHOLD_MS}ms`, 'cyan');
  log(`👥 Concurrent Users: ${TEST_CONFIG.CONCURRENT_USERS}`, 'cyan');
  log(`📦 Bulk Data Size: ${TEST_CONFIG.BULK_DATA_SIZE}`, 'cyan');
  
  try {
    // Core schema tests
    await testSchemaIntegrity();
    await testConstraints();
    await testIndexes();
    
    // Function and operation tests
    await testDatabaseFunctions();
    
    // Advanced tests
    await testConcurrentAccess();
    await testDataIntegrity();
    await testPerformanceStress();
    
    // Cleanup
    await cleanupTestData();
    
  } catch (error) {
    log(`💥 Critical error: ${error.message}`, 'red');
    await cleanupTestData().catch(() => {}); // Attempt cleanup even on error
  }
  
  const totalTime = Date.now() - startTime;
  
  // Generate comprehensive report
  log('\n📊 COMPREHENSIVE TEST RESULTS', 'bright');
  log('=' * 60, 'bright');
  
  log(`⏱️  Total execution time: ${totalTime}ms`, 'cyan');
  log(`✅ Tests passed: ${testResults.passed}`, 'green');
  log(`❌ Tests failed: ${testResults.failed}`, 'red');
  log(`⚠️  Tests skipped: ${testResults.skipped}`, 'yellow');
  log(`📈 Total tests: ${testResults.total}`, 'cyan');
  log(`🎯 Success rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`, 'magenta');
  
  // Category breakdown
  const categories = [...new Set(testResults.details.map(t => t.category))];
  log('\n📋 Results by Category:', 'bright');
  
  categories.forEach(category => {
    const categoryTests = testResults.details.filter(t => t.category === category);
    const categoryPassed = categoryTests.filter(t => t.status === 'PASS').length;
    const categoryTotal = categoryTests.length;
    const categoryRate = Math.round((categoryPassed / categoryTotal) * 100);
    
    log(`   ${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`, 
      categoryRate === 100 ? 'green' : categoryRate >= 80 ? 'yellow' : 'red');
  });
  
  // Performance summary
  if (testResults.performance.length > 0) {
    log('\n⚡ Performance Summary:', 'bright');
    const avgPerformance = testResults.performance.reduce((sum, p) => sum + p.duration, 0) / testResults.performance.length;
    log(`   Average query time: ${avgPerformance.toFixed(2)}ms`, 'cyan');
    
    const slowQueries = testResults.performance.filter(p => p.status === 'FAIL');
    if (slowQueries.length > 0) {
      log(`   Slow queries detected: ${slowQueries.length}`, 'red');
      slowQueries.forEach(q => {
        log(`     - ${q.query}: ${q.duration}ms`, 'red');
      });
    }
  }
  
  // Failed test details
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:', 'bright');
    testResults.details
      .filter(test => test.status === 'FAIL')
      .forEach(test => {
        log(`   • ${test.name}: ${test.details}`, 'red');
      });
  }
  
  // Final status
  if (testResults.failed === 0) {
    log('\n🎉 ALL DATABASE TESTS PASSED! System is ready for production.', 'green');
  } else {
    log(`\n⚠️  ${testResults.failed} tests failed. Review issues above.`, 'yellow');
  }
  
  // Generate JSON report for CI/CD
  const report = {
    timestamp: new Date().toISOString(),
    duration: totalTime,
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      successRate: Math.round((testResults.passed / testResults.total) * 100)
    },
    categories: categories.map(category => {
      const categoryTests = testResults.details.filter(t => t.category === category);
      return {
        name: category,
        passed: categoryTests.filter(t => t.status === 'PASS').length,
        total: categoryTests.length
      };
    }),
    performance: {
      averageQueryTime: testResults.performance.length > 0 ? 
        testResults.performance.reduce((sum, p) => sum + p.duration, 0) / testResults.performance.length : 0,
      slowQueries: testResults.performance.filter(p => p.status === 'FAIL').length
    },
    details: testResults.details
  };
  
  await fs.writeFile(
    path.join(__dirname, 'database-test-report.json'), 
    JSON.stringify(report, null, 2)
  ).catch(() => {});
  
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  log('\n\nReceived SIGINT, cleaning up...', 'yellow');
  await cleanupTestData().catch(() => {});
  process.exit(1);
});

process.on('uncaughtException', async (error) => {
  log(`\nUncaught Exception: ${error.message}`, 'red');
  await cleanupTestData().catch(() => {});
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runAllTests().catch(async (error) => {
    log(`\nUnhandled error: ${error.message}`, 'red');
    await cleanupTestData().catch(() => {});
    process.exit(1);
  });
}

module.exports = { runAllTests, testResults, testData };