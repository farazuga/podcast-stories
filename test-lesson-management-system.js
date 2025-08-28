#!/usr/bin/env node

/**
 * Lesson Management System Testing Script
 * Tests all database functions, queries, and API endpoints for the lesson system
 * Run with: node test-lesson-management-system.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Database configuration
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/podcast_stories',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function logTest(testName, passed, details = '') {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  const statusColor = passed ? 'green' : 'red';
  
  log(`${status} ${testName}`, statusColor);
  if (details) {
    log(`     ${details}`, 'cyan');
  }
  
  testResults.tests.push({ name: testName, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function runQuery(query, params = []) {
  try {
    const result = await db.query(query, params);
    return result;
  } catch (error) {
    throw new Error(`Query failed: ${error.message}`);
  }
}

// =============================================================================
// DATABASE SCHEMA TESTS
// =============================================================================

async function testSchemaExists() {
  log('\n=== TESTING SCHEMA EXISTENCE ===', 'bright');
  
  const expectedTables = [
    'courses', 'lessons', 'lesson_materials', 'quizzes', 'quiz_questions',
    'quiz_attempts', 'worksheets', 'worksheet_submissions', 'student_progress', 
    'course_enrollments'
  ];
  
  for (const tableName of expectedTables) {
    try {
      const result = await runQuery(`
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      
      const exists = result.rows[0].count > 0;
      logTest(`Table ${tableName} exists`, exists);
    } catch (error) {
      logTest(`Table ${tableName} exists`, false, error.message);
    }
  }
}

async function testFunctionsExist() {
  log('\n=== TESTING FUNCTIONS EXISTENCE ===', 'bright');
  
  const expectedFunctions = [
    'calculate_lesson_completion',
    'calculate_course_progress', 
    'update_student_progress',
    'check_lesson_prerequisites'
  ];
  
  for (const functionName of expectedFunctions) {
    try {
      const result = await runQuery(`
        SELECT COUNT(*) FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = $1
      `, [functionName]);
      
      const exists = result.rows[0].count > 0;
      logTest(`Function ${functionName} exists`, exists);
    } catch (error) {
      logTest(`Function ${functionName} exists`, false, error.message);
    }
  }
}

// =============================================================================
// DATA CREATION TESTS
// =============================================================================

let testData = {};

async function createTestUsers() {
  log('\n=== CREATING TEST USERS ===', 'bright');
  
  try {
    // Create test school if not exists
    await runQuery(`
      INSERT INTO schools (school_name, created_by) 
      VALUES ('Test School', NULL) 
      ON CONFLICT (school_name) DO NOTHING
    `);
    
    const school = await runQuery('SELECT id FROM schools WHERE school_name = $1', ['Test School']);
    const schoolId = school.rows[0]?.id;
    
    // Create test teacher
    const hashedPassword = await bcrypt.hash('testpass', 10);
    const teacherResult = await runQuery(`
      INSERT INTO users (email, password, name, role, school_id) 
      VALUES ('test.teacher@vidpod.com', $1, 'Test Teacher', 'teacher', $2)
      ON CONFLICT (email) DO UPDATE SET 
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        school_id = EXCLUDED.school_id
      RETURNING id
    `, [hashedPassword, schoolId]);
    
    testData.teacherId = teacherResult.rows[0].id;
    
    // Create test student
    const studentResult = await runQuery(`
      INSERT INTO users (email, password, name, role, school_id, student_id) 
      VALUES ('test.student@vidpod.com', $1, 'Test Student', 'student', $2, 'TS001')
      ON CONFLICT (email) DO UPDATE SET 
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        school_id = EXCLUDED.school_id,
        student_id = EXCLUDED.student_id
      RETURNING id
    `, [hashedPassword, schoolId]);
    
    testData.studentId = studentResult.rows[0].id;
    testData.schoolId = schoolId;
    
    logTest('Test users created', true, `Teacher ID: ${testData.teacherId}, Student ID: ${testData.studentId}`);
    
  } catch (error) {
    logTest('Test users created', false, error.message);
    throw error; // Stop execution if we can't create users
  }
}

async function createTestCourse() {
  log('\n=== CREATING TEST COURSE ===', 'bright');
  
  try {
    const result = await runQuery(`
      INSERT INTO courses (
        title, description, subject, grade_level, total_weeks,
        teacher_id, school_id, learning_objectives, is_active
      ) VALUES (
        'Test Course: Introduction to Digital Media',
        'A comprehensive test course for validating the lesson management system.',
        'Digital Media',
        '9-12',
        4,
        $1, $2,
        '["Learn basic concepts", "Practice skills", "Complete projects"]'::jsonb,
        true
      ) RETURNING id
    `, [testData.teacherId, testData.schoolId]);
    
    testData.courseId = result.rows[0].id;
    logTest('Test course created', true, `Course ID: ${testData.courseId}`);
    
  } catch (error) {
    logTest('Test course created', false, error.message);
    throw error;
  }
}

async function createTestLessons() {
  log('\n=== CREATING TEST LESSONS ===', 'bright');
  
  try {
    // Create Lesson 1
    const lesson1Result = await runQuery(`
      INSERT INTO lessons (
        course_id, title, description, week_number, lesson_number,
        content, learning_objectives, vocabulary_terms, 
        estimated_duration, is_published
      ) VALUES (
        $1, 'Getting Started', 'Introduction to the course and basic concepts',
        1, 1,
        'Welcome to the course! In this lesson we will cover the fundamentals.',
        '["Understand course objectives", "Learn basic terminology"]'::jsonb,
        '[{"term": "Digital Media", "definition": "Content in digital format"}]'::jsonb,
        45, true
      ) RETURNING id
    `, [testData.courseId]);
    
    testData.lesson1Id = lesson1Result.rows[0].id;
    
    // Create Lesson 2 with prerequisites
    const lesson2Result = await runQuery(`
      INSERT INTO lessons (
        course_id, title, description, week_number, lesson_number,
        content, requires_completion_of, is_published
      ) VALUES (
        $1, 'Advanced Concepts', 'Building on the basics from lesson 1',
        2, 1,
        'Now that you understand the basics, lets dive deeper.',
        ARRAY[$2], true
      ) RETURNING id
    `, [testData.courseId, testData.lesson1Id]);
    
    testData.lesson2Id = lesson2Result.rows[0].id;
    
    logTest('Test lessons created', true, `Lesson 1 ID: ${testData.lesson1Id}, Lesson 2 ID: ${testData.lesson2Id}`);
    
  } catch (error) {
    logTest('Test lessons created', false, error.message);
    throw error;
  }
}

async function createTestMaterials() {
  log('\n=== CREATING TEST MATERIALS ===', 'bright');
  
  try {
    // Create quiz material
    const quizMaterialResult = await runQuery(`
      INSERT INTO lesson_materials (
        lesson_id, title, description, material_type,
        is_required, is_graded, points_possible, sort_order
      ) VALUES (
        $1, 'Getting Started Quiz', 'Test your understanding of basic concepts',
        'quiz', true, true, 20, 1
      ) RETURNING id
    `, [testData.lesson1Id]);
    
    testData.quizMaterialId = quizMaterialResult.rows[0].id;
    
    // Create quiz configuration
    const quizResult = await runQuery(`
      INSERT INTO quizzes (
        material_id, max_attempts, time_limit, passing_score,
        randomize_questions, immediate_feedback
      ) VALUES (
        $1, 3, 10, 70.00, false, true
      ) RETURNING id
    `, [testData.quizMaterialId]);
    
    testData.quizId = quizResult.rows[0].id;
    
    // Create quiz questions
    await runQuery(`
      INSERT INTO quiz_questions (
        quiz_id, question_text, question_type, answer_options, 
        points_possible, sort_order
      ) VALUES 
      (
        $1, 'What is digital media?',
        'multiple_choice',
        '[
          {"text": "Content in digital format", "is_correct": true},
          {"text": "Only video content", "is_correct": false},
          {"text": "Print media", "is_correct": false},
          {"text": "Television broadcasts", "is_correct": false}
        ]'::jsonb,
        10.0, 1
      ),
      (
        $1, 'Digital media can include audio content.',
        'true_false',
        '[
          {"text": "True", "is_correct": true},
          {"text": "False", "is_correct": false}
        ]'::jsonb,
        10.0, 2
      )
    `, [testData.quizId]);
    
    // Create worksheet material
    const worksheetMaterialResult = await runQuery(`
      INSERT INTO lesson_materials (
        lesson_id, title, description, material_type,
        is_required, is_graded, points_possible, sort_order
      ) VALUES (
        $1, 'Reflection Worksheet', 'Reflect on your learning goals',
        'worksheet', true, true, 15, 2
      ) RETURNING id
    `, [testData.lesson1Id]);
    
    testData.worksheetMaterialId = worksheetMaterialResult.rows[0].id;
    
    // Create worksheet configuration
    const worksheetResult = await runQuery(`
      INSERT INTO worksheets (
        material_id, form_fields, allow_multiple_submissions
      ) VALUES (
        $1,
        '[
          {"type": "text", "label": "Your Name", "required": true},
          {"type": "textarea", "label": "What do you hope to learn?", "required": true, "max_length": 300},
          {"type": "select", "label": "Experience Level", "required": true, "options": ["Beginner", "Intermediate", "Advanced"]}
        ]'::jsonb,
        false
      ) RETURNING id
    `, [testData.worksheetMaterialId]);
    
    testData.worksheetId = worksheetResult.rows[0].id;
    
    logTest('Test materials created', true, `Quiz ID: ${testData.quizId}, Worksheet ID: ${testData.worksheetId}`);
    
  } catch (error) {
    logTest('Test materials created', false, error.message);
    throw error;
  }
}

async function createCourseEnrollment() {
  log('\n=== CREATING COURSE ENROLLMENT ===', 'bright');
  
  try {
    await runQuery(`
      INSERT INTO course_enrollments (student_id, course_id, total_lessons)
      VALUES ($1, $2, 2)
      ON CONFLICT (student_id, course_id) DO UPDATE SET
        total_lessons = EXCLUDED.total_lessons
    `, [testData.studentId, testData.courseId]);
    
    logTest('Course enrollment created', true);
    
  } catch (error) {
    logTest('Course enrollment created', false, error.message);
  }
}

// =============================================================================
// FUNCTION TESTS
// =============================================================================

async function testLessonCompletionFunction() {
  log('\n=== TESTING LESSON COMPLETION FUNCTION ===', 'bright');
  
  try {
    // Test 1: No completions (should be 0%)
    const result1 = await runQuery(`
      SELECT calculate_lesson_completion($1, $2) as completion
    `, [testData.studentId, testData.lesson1Id]);
    
    const completion1 = parseFloat(result1.rows[0].completion);
    logTest('Completion 0% (no attempts)', completion1 === 0.00, `Expected: 0.00, Got: ${completion1}`);
    
    // Test 2: Add passing quiz attempt
    await runQuery(`
      INSERT INTO quiz_attempts (
        quiz_id, student_id, attempt_number, status, 
        responses, total_points_possible, total_points_earned, percentage_score
      ) VALUES (
        $1, $2, 1, 'submitted',
        '{"1": {"answer": "Content in digital format", "is_correct": true, "points_earned": 10}, "2": {"answer": "True", "is_correct": true, "points_earned": 10}}'::jsonb,
        20.00, 20.00, 100.00
      )
    `, [testData.quizId, testData.studentId]);
    
    const result2 = await runQuery(`
      SELECT calculate_lesson_completion($1, $2) as completion
    `, [testData.studentId, testData.lesson1Id]);
    
    const completion2 = parseFloat(result2.rows[0].completion);
    logTest('Completion 50% (quiz passed)', completion2 === 50.00, `Expected: 50.00, Got: ${completion2}`);
    
    // Test 3: Add worksheet submission
    await runQuery(`
      INSERT INTO worksheet_submissions (
        worksheet_id, student_id, submission_data, 
        draft, submitted_at
      ) VALUES (
        $1, $2,
        '{"1": {"value": "Test Student"}, "2": {"value": "I hope to learn digital media skills"}, "3": {"value": "Beginner"}}'::jsonb,
        false, CURRENT_TIMESTAMP
      )
    `, [testData.worksheetId, testData.studentId]);
    
    const result3 = await runQuery(`
      SELECT calculate_lesson_completion($1, $2) as completion
    `, [testData.studentId, testData.lesson1Id]);
    
    const completion3 = parseFloat(result3.rows[0].completion);
    logTest('Completion 100% (all materials)', completion3 === 100.00, `Expected: 100.00, Got: ${completion3}`);
    
  } catch (error) {
    logTest('Lesson completion function', false, error.message);
  }
}

async function testCourseProgressFunction() {
  log('\n=== TESTING COURSE PROGRESS FUNCTION ===', 'bright');
  
  try {
    // Update progress for lesson 1
    await runQuery(`SELECT update_student_progress($1, $2)`, [testData.studentId, testData.lesson1Id]);
    
    const result = await runQuery(`
      SELECT calculate_course_progress($1, $2) as progress
    `, [testData.studentId, testData.courseId]);
    
    const progress = result.rows[0].progress;
    
    const totalLessons = parseInt(progress.total_lessons);
    const completedLessons = parseInt(progress.completed_lessons);
    const overallProgress = parseFloat(progress.overall_progress);
    
    logTest('Course progress calculation', 
      totalLessons === 2 && completedLessons === 1 && overallProgress === 50.00,
      `Total: ${totalLessons}, Completed: ${completedLessons}, Progress: ${overallProgress}%`
    );
    
  } catch (error) {
    logTest('Course progress function', false, error.message);
  }
}

async function testPrerequisitesFunction() {
  log('\n=== TESTING PREREQUISITES FUNCTION ===', 'bright');
  
  try {
    // Test 1: Lesson 1 has no prerequisites (should return true)
    const result1 = await runQuery(`
      SELECT check_lesson_prerequisites($1, $2) as can_access
    `, [testData.studentId, testData.lesson1Id]);
    
    const canAccess1 = result1.rows[0].can_access;
    logTest('Prerequisites check (no requirements)', canAccess1 === true, `Expected: true, Got: ${canAccess1}`);
    
    // Test 2: Lesson 2 requires lesson 1 completion (should return true since lesson 1 is completed)
    const result2 = await runQuery(`
      SELECT check_lesson_prerequisites($1, $2) as can_access
    `, [testData.studentId, testData.lesson2Id]);
    
    const canAccess2 = result2.rows[0].can_access;
    logTest('Prerequisites check (requirements met)', canAccess2 === true, `Expected: true, Got: ${canAccess2}`);
    
    // Test 3: Create new student and test lesson 2 access (should be false)
    const newStudentResult = await runQuery(`
      INSERT INTO users (email, password, name, role, school_id, student_id)
      VALUES ('new.student@vidpod.com', 'hash', 'New Student', 'student', $1, 'NS001')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [testData.schoolId]);
    
    const newStudentId = newStudentResult.rows[0].id;
    
    const result3 = await runQuery(`
      SELECT check_lesson_prerequisites($1, $2) as can_access
    `, [newStudentId, testData.lesson2Id]);
    
    const canAccess3 = result3.rows[0].can_access;
    logTest('Prerequisites check (requirements not met)', canAccess3 === false, `Expected: false, Got: ${canAccess3}`);
    
  } catch (error) {
    logTest('Prerequisites function', false, error.message);
  }
}

async function testProgressUpdateFunction() {
  log('\n=== TESTING PROGRESS UPDATE FUNCTION ===', 'bright');
  
  try {
    // Update progress should create/update student_progress record
    await runQuery(`SELECT update_student_progress($1, $2)`, [testData.studentId, testData.lesson1Id]);
    
    // Check if progress record exists and is correct
    const result = await runQuery(`
      SELECT status, completion_percentage, completed_at
      FROM student_progress
      WHERE student_id = $1 AND lesson_id = $2
    `, [testData.studentId, testData.lesson1Id]);
    
    if (result.rows.length > 0) {
      const progress = result.rows[0];
      const isCompleted = progress.status === 'completed';
      const isFullCompletion = parseFloat(progress.completion_percentage) === 100.00;
      const hasCompletedDate = progress.completed_at !== null;
      
      logTest('Progress update function',
        isCompleted && isFullCompletion && hasCompletedDate,
        `Status: ${progress.status}, Completion: ${progress.completion_percentage}%, Completed: ${hasCompletedDate}`
      );
    } else {
      logTest('Progress update function', false, 'No progress record created');
    }
    
  } catch (error) {
    logTest('Progress update function', false, error.message);
  }
}

// =============================================================================
// DATA INTEGRITY TESTS  
// =============================================================================

async function testDataIntegrity() {
  log('\n=== TESTING DATA INTEGRITY ===', 'bright');
  
  // Test 1: Unique constraints
  try {
    await runQuery(`
      INSERT INTO quiz_attempts (quiz_id, student_id, attempt_number, status)
      VALUES ($1, $2, 1, 'in_progress')
    `, [testData.quizId, testData.studentId]);
    
    logTest('Unique constraint violation', false, 'Should have failed but succeeded');
  } catch (error) {
    logTest('Unique constraint violation', error.message.includes('unique'), 'Correctly prevented duplicate quiz attempt');
  }
  
  // Test 2: Check constraints
  try {
    await runQuery(`
      INSERT INTO courses (title, teacher_id, total_weeks)
      VALUES ('Invalid Course', $1, -1)
    `, [testData.teacherId]);
    
    logTest('Check constraint violation', false, 'Should have failed but succeeded');
  } catch (error) {
    logTest('Check constraint violation', error.message.includes('check'), 'Correctly prevented negative weeks');
  }
  
  // Test 3: Foreign key constraints
  try {
    await runQuery(`
      INSERT INTO lessons (course_id, title, week_number, lesson_number)
      VALUES (999999, 'Invalid Lesson', 1, 1)
    `);
    
    logTest('Foreign key constraint violation', false, 'Should have failed but succeeded');
  } catch (error) {
    logTest('Foreign key constraint violation', error.message.includes('foreign key'), 'Correctly prevented invalid course reference');
  }
}

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

async function testPerformance() {
  log('\n=== TESTING QUERY PERFORMANCE ===', 'bright');
  
  try {
    // Test index usage on common queries
    const startTime = Date.now();
    
    // Query 1: Get courses by teacher
    await runQuery('SELECT * FROM courses WHERE teacher_id = $1', [testData.teacherId]);
    
    // Query 2: Get lessons for course
    await runQuery('SELECT * FROM lessons WHERE course_id = $1 ORDER BY week_number, lesson_number', [testData.courseId]);
    
    // Query 3: Get student progress
    await runQuery('SELECT * FROM student_progress WHERE student_id = $1', [testData.studentId]);
    
    // Query 4: Get quiz attempts
    await runQuery('SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2', [testData.quizId, testData.studentId]);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Consider performance acceptable if under 100ms for these simple queries
    logTest('Query performance', executionTime < 100, `Execution time: ${executionTime}ms`);
    
  } catch (error) {
    logTest('Query performance', false, error.message);
  }
}

// =============================================================================
// CLEANUP
// =============================================================================

async function cleanupTestData() {
  log('\n=== CLEANING UP TEST DATA ===', 'bright');
  
  try {
    // Delete in reverse order of dependencies
    await runQuery('DELETE FROM courses WHERE id = $1', [testData.courseId]);
    await runQuery('DELETE FROM users WHERE email IN ($1, $2, $3)', 
      ['test.teacher@vidpod.com', 'test.student@vidpod.com', 'new.student@vidpod.com']);
    await runQuery('DELETE FROM schools WHERE school_name = $1', ['Test School']);
    
    logTest('Test data cleanup', true, 'All test data removed');
    
  } catch (error) {
    logTest('Test data cleanup', false, error.message);
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  log('Lesson Management System Test Suite', 'bright');
  log('=====================================', 'bright');
  
  try {
    // Schema tests
    await testSchemaExists();
    await testFunctionsExist();
    
    // Data creation tests
    await createTestUsers();
    await createTestCourse();
    await createTestLessons();
    await createTestMaterials();
    await createCourseEnrollment();
    
    // Function tests
    await testLessonCompletionFunction();
    await testCourseProgressFunction();
    await testPrerequisitesFunction();
    await testProgressUpdateFunction();
    
    // Integrity tests
    await testDataIntegrity();
    
    // Performance tests
    await testPerformance();
    
    // Cleanup
    await cleanupTestData();
    
  } catch (error) {
    log(`\n❌ Critical error: ${error.message}`, 'red');
  }
  
  // Final summary
  log('\n=== TEST SUMMARY ===', 'bright');
  log(`Total tests: ${testResults.passed + testResults.failed}`, 'cyan');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, 'red');
  
  if (testResults.failed === 0) {
    log('\n🎉 All tests passed! Lesson Management System is ready for use.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the output above.', 'yellow');
    log('Failed tests:', 'yellow');
    testResults.tests.filter(t => !t.passed).forEach(test => {
      log(`  - ${test.name}: ${test.details}`, 'red');
    });
  }
  
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  log('\n\nReceived SIGINT, cleaning up...', 'yellow');
  await cleanupTestData();
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\nUnhandled error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runAllTests, testData };