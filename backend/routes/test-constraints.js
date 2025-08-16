const express = require('express');
const { Pool } = require('pg');
const { verifyToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test endpoint for database constraints
router.post('/run-constraint-tests', verifyToken, isAdmin, async (req, res) => {
  const testResults = {
    foreignKeyConstraints: [],
    checkConstraints: [],
    uniqueConstraints: [],
    cascadeDeletes: [],
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0
    }
  };

  const client = await pool.connect();

  try {
    // Helper function to run a test and record results
    const runTest = async (testName, testFunction, expectedToFail = false) => {
      testResults.summary.totalTests++;
      try {
        await testFunction();
        if (expectedToFail) {
          testResults.summary.failed++;
          return {
            test: testName,
            status: 'FAILED',
            expected: 'Should have failed with constraint violation',
            actual: 'Test passed unexpectedly',
            error: null
          };
        } else {
          testResults.summary.passed++;
          return {
            test: testName,
            status: 'PASSED',
            expected: 'Should succeed',
            actual: 'Test passed as expected',
            error: null
          };
        }
      } catch (error) {
        if (expectedToFail) {
          testResults.summary.passed++;
          return {
            test: testName,
            status: 'PASSED',
            expected: 'Should fail with constraint violation',
            actual: `Failed as expected: ${error.message}`,
            error: error.code
          };
        } else {
          testResults.summary.failed++;
          return {
            test: testName,
            status: 'FAILED',
            expected: 'Should succeed',
            actual: `Unexpected failure: ${error.message}`,
            error: error.code
          };
        }
      }
    };

    // Create test data first
    await client.query('BEGIN');

    // Create a test school
    const schoolResult = await client.query(
      'INSERT INTO schools (school_name, created_by) VALUES ($1, $2) RETURNING id',
      ['Test School for Constraints', req.user.id]
    );
    const testSchoolId = schoolResult.rows[0].id;

    // Create a test teacher user
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    const teacherResult = await client.query(
      'INSERT INTO users (username, password, email, name, role, school_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['test_teacher_constraints', hashedPassword, 'test.teacher@constraints.com', 'Test Teacher', 'teacher', testSchoolId]
    );
    const testTeacherId = teacherResult.rows[0].id;

    // Create a test student user
    const studentResult = await client.query(
      'INSERT INTO users (username, password, email, name, role, school_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['test_student_constraints', hashedPassword, 'test.student@constraints.com', 'Test Student', 'student', testSchoolId]
    );
    const testStudentId = studentResult.rows[0].id;

    // Create a test class
    const classResult = await client.query(
      'INSERT INTO classes (class_name, subject, class_code, teacher_id, school_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Test Class', 'Test Subject', 'T001', testTeacherId, testSchoolId]
    );
    const testClassId = classResult.rows[0].id;

    await client.query('COMMIT');

    // ==== FOREIGN KEY CONSTRAINT TESTS ====

    // Test 1: teacher_requests with non-existent school_id
    testResults.foreignKeyConstraints.push(await runTest(
      'teacher_requests with non-existent school_id',
      async () => {
        await client.query(
          'INSERT INTO teacher_requests (name, email, school_id, message) VALUES ($1, $2, $3, $4)',
          ['Test Teacher', 'test1@example.com', 99999, 'Test message']
        );
      },
      true // Expected to fail
    ));

    // Test 2: classes with non-existent teacher_id
    testResults.foreignKeyConstraints.push(await runTest(
      'classes with non-existent teacher_id',
      async () => {
        await client.query(
          'INSERT INTO classes (class_name, subject, class_code, teacher_id, school_id) VALUES ($1, $2, $3, $4, $5)',
          ['Invalid Class', 'Test Subject', 'I001', 99999, testSchoolId]
        );
      },
      true // Expected to fail
    ));

    // Test 3: user_classes with non-existent user_id
    testResults.foreignKeyConstraints.push(await runTest(
      'user_classes with non-existent user_id',
      async () => {
        await client.query(
          'INSERT INTO user_classes (user_id, class_id) VALUES ($1, $2)',
          [99999, testClassId]
        );
      },
      true // Expected to fail
    ));

    // Test 4: user_classes with non-existent class_id
    testResults.foreignKeyConstraints.push(await runTest(
      'user_classes with non-existent class_id',
      async () => {
        await client.query(
          'INSERT INTO user_classes (user_id, class_id) VALUES ($1, $2)',
          [testStudentId, 99999]
        );
      },
      true // Expected to fail
    ));

    // Test 5: Valid foreign key relationships (should succeed)
    testResults.foreignKeyConstraints.push(await runTest(
      'Valid teacher_request with existing school_id',
      async () => {
        await client.query(
          'INSERT INTO teacher_requests (name, email, school_id, message) VALUES ($1, $2, $3, $4)',
          ['Valid Teacher', 'valid.teacher@example.com', testSchoolId, 'Valid request']
        );
      },
      false // Expected to succeed
    ));

    testResults.foreignKeyConstraints.push(await runTest(
      'Valid user_classes with existing user_id and class_id',
      async () => {
        await client.query(
          'INSERT INTO user_classes (user_id, class_id) VALUES ($1, $2)',
          [testStudentId, testClassId]
        );
      },
      false // Expected to succeed
    ));

    // ==== CHECK CONSTRAINT TESTS ====

    // Test 6: teacher_requests with invalid status
    testResults.checkConstraints.push(await runTest(
      'teacher_requests with invalid status',
      async () => {
        await client.query(
          'INSERT INTO teacher_requests (name, email, school_id, status) VALUES ($1, $2, $3, $4)',
          ['Test Teacher 2', 'test2@example.com', testSchoolId, 'invalid_status']
        );
      },
      true // Expected to fail
    ));

    // Test 7: users with invalid role
    testResults.checkConstraints.push(await runTest(
      'users with invalid role',
      async () => {
        await client.query(
          'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4)',
          ['invalid_user', hashedPassword, 'invalid@example.com', 'invalid_role']
        );
      },
      true // Expected to fail
    ));

    // Test 8: Valid check constraint values (should succeed)
    testResults.checkConstraints.push(await runTest(
      'teacher_requests with valid status (pending)',
      async () => {
        await client.query(
          'INSERT INTO teacher_requests (name, email, school_id, status) VALUES ($1, $2, $3, $4)',
          ['Valid Teacher Status', 'valid.status@example.com', testSchoolId, 'pending']
        );
      },
      false // Expected to succeed
    ));

    testResults.checkConstraints.push(await runTest(
      'teacher_requests with valid status (approved)',
      async () => {
        await client.query(
          'INSERT INTO teacher_requests (name, email, school_id, status) VALUES ($1, $2, $3, $4)',
          ['Valid Teacher Approved', 'valid.approved@example.com', testSchoolId, 'approved']
        );
      },
      false // Expected to succeed
    ));

    testResults.checkConstraints.push(await runTest(
      'teacher_requests with valid status (rejected)',
      async () => {
        await client.query(
          'INSERT INTO teacher_requests (name, email, school_id, status) VALUES ($1, $2, $3, $4)',
          ['Valid Teacher Rejected', 'valid.rejected@example.com', testSchoolId, 'rejected']
        );
      },
      false // Expected to succeed
    ));

    testResults.checkConstraints.push(await runTest(
      'users with valid role (amitrace_admin)',
      async () => {
        await client.query(
          'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4)',
          ['valid_amitrace_admin', hashedPassword, 'amitrace.admin@example.com', 'amitrace_admin']
        );
      },
      false // Expected to succeed
    ));

    testResults.checkConstraints.push(await runTest(
      'users with valid role (teacher)',
      async () => {
        await client.query(
          'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4)',
          ['valid_teacher_role', hashedPassword, 'teacher.role@example.com', 'teacher']
        );
      },
      false // Expected to succeed
    ));

    testResults.checkConstraints.push(await runTest(
      'users with valid role (student)',
      async () => {
        await client.query(
          'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4)',
          ['valid_student_role', hashedPassword, 'student.role@example.com', 'student']
        );
      },
      false // Expected to succeed
    ));

    // ==== UNIQUE CONSTRAINT TESTS ====

    // Test 9: Duplicate class_code in classes table
    testResults.uniqueConstraints.push(await runTest(
      'Duplicate class_code in classes table',
      async () => {
        await client.query(
          'INSERT INTO classes (class_name, subject, class_code, teacher_id, school_id) VALUES ($1, $2, $3, $4, $5)',
          ['Duplicate Class', 'Test Subject', 'T001', testTeacherId, testSchoolId] // T001 already exists
        );
      },
      true // Expected to fail
    ));

    // Test 10: Duplicate email in teacher_requests table
    testResults.uniqueConstraints.push(await runTest(
      'Duplicate email in teacher_requests table',
      async () => {
        await client.query(
          'INSERT INTO teacher_requests (name, email, school_id) VALUES ($1, $2, $3)',
          ['Duplicate Email Teacher', 'valid.teacher@example.com', testSchoolId] // Email already exists
        );
      },
      true // Expected to fail
    ));

    // Test 11: Unique class_code (should succeed)
    testResults.uniqueConstraints.push(await runTest(
      'Unique class_code in classes table',
      async () => {
        await client.query(
          'INSERT INTO classes (class_name, subject, class_code, teacher_id, school_id) VALUES ($1, $2, $3, $4, $5)',
          ['Unique Class', 'Test Subject', 'U001', testTeacherId, testSchoolId]
        );
      },
      false // Expected to succeed
    ));

    // Test 12: Unique email in teacher_requests (should succeed)
    testResults.uniqueConstraints.push(await runTest(
      'Unique email in teacher_requests table',
      async () => {
        await client.query(
          'INSERT INTO teacher_requests (name, email, school_id) VALUES ($1, $2, $3)',
          ['Unique Email Teacher', 'unique.teacher@example.com', testSchoolId]
        );
      },
      false // Expected to succeed
    ));

    // ==== CASCADE DELETE TESTS ====

    // Create test records for cascade delete testing
    await client.query('BEGIN');

    // Create a test user for cascade delete
    const cascadeUserResult = await client.query(
      'INSERT INTO users (username, password, email, name, role, school_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['cascade_test_user', hashedPassword, 'cascade.test@example.com', 'Cascade Test User', 'student', testSchoolId]
    );
    const cascadeUserId = cascadeUserResult.rows[0].id;

    // Create a test class for cascade delete
    const cascadeClassResult = await client.query(
      'INSERT INTO classes (class_name, subject, class_code, teacher_id, school_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Cascade Test Class', 'Test Subject', 'C001', testTeacherId, testSchoolId]
    );
    const cascadeClassId = cascadeClassResult.rows[0].id;

    // Create user_classes relationship
    await client.query(
      'INSERT INTO user_classes (user_id, class_id) VALUES ($1, $2)',
      [cascadeUserId, cascadeClassId]
    );

    // Create password reset token for cascade delete test
    await client.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [cascadeUserId, 'test_token_cascade', new Date(Date.now() + 3600000)]
    );

    await client.query('COMMIT');

    // Test 13: Delete user and verify user_classes records are deleted (CASCADE)
    testResults.cascadeDeletes.push(await runTest(
      'Cascade delete user_classes when user is deleted',
      async () => {
        // Verify relationship exists before delete
        const beforeDelete = await client.query(
          'SELECT COUNT(*) FROM user_classes WHERE user_id = $1',
          [cascadeUserId]
        );
        
        if (beforeDelete.rows[0].count === '0') {
          throw new Error('Test setup failed: No user_classes relationship found');
        }

        // Delete the user
        await client.query('DELETE FROM users WHERE id = $1', [cascadeUserId]);

        // Verify user_classes records are deleted
        const afterDelete = await client.query(
          'SELECT COUNT(*) FROM user_classes WHERE user_id = $1',
          [cascadeUserId]
        );

        if (afterDelete.rows[0].count !== '0') {
          throw new Error('Cascade delete failed: user_classes records still exist');
        }

        // Verify password reset tokens are also deleted
        const tokensAfterDelete = await client.query(
          'SELECT COUNT(*) FROM password_reset_tokens WHERE user_id = $1',
          [cascadeUserId]
        );

        if (tokensAfterDelete.rows[0].count !== '0') {
          throw new Error('Cascade delete failed: password_reset_tokens still exist');
        }
      },
      false // Expected to succeed
    ));

    // Test 14: Delete class and verify user_classes records are deleted (CASCADE)
    // First recreate the user for this test
    await client.query('BEGIN');
    const cascadeUser2Result = await client.query(
      'INSERT INTO users (username, password, email, name, role, school_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['cascade_test_user2', hashedPassword, 'cascade.test2@example.com', 'Cascade Test User 2', 'student', testSchoolId]
    );
    const cascadeUser2Id = cascadeUser2Result.rows[0].id;

    // Create user_classes relationship with the existing cascade class
    await client.query(
      'INSERT INTO user_classes (user_id, class_id) VALUES ($1, $2)',
      [cascadeUser2Id, cascadeClassId]
    );
    await client.query('COMMIT');

    testResults.cascadeDeletes.push(await runTest(
      'Cascade delete user_classes when class is deleted',
      async () => {
        // Verify relationship exists before delete
        const beforeDelete = await client.query(
          'SELECT COUNT(*) FROM user_classes WHERE class_id = $1',
          [cascadeClassId]
        );
        
        if (beforeDelete.rows[0].count === '0') {
          throw new Error('Test setup failed: No user_classes relationship found');
        }

        // Delete the class
        await client.query('DELETE FROM classes WHERE id = $1', [cascadeClassId]);

        // Verify user_classes records are deleted
        const afterDelete = await client.query(
          'SELECT COUNT(*) FROM user_classes WHERE class_id = $1',
          [cascadeClassId]
        );

        if (afterDelete.rows[0].count !== '0') {
          throw new Error('Cascade delete failed: user_classes records still exist');
        }
      },
      false // Expected to succeed
    ));

    // Test 15: Test story cascade deletes (from existing schema)
    // Create test story and related records
    await client.query('BEGIN');
    
    const storyResult = await client.query(
      'INSERT INTO story_ideas (idea_title, idea_description, uploaded_by) VALUES ($1, $2, $3) RETURNING id',
      ['Cascade Test Story', 'Test story for cascade delete', testTeacherId]
    );
    const testStoryId = storyResult.rows[0].id;

    // Create interviewee and link to story
    const intervieweeResult = await client.query(
      'INSERT INTO interviewees (name) VALUES ($1) RETURNING id',
      ['Test Cascade Interviewee']
    );
    const testIntervieweeId = intervieweeResult.rows[0].id;

    await client.query(
      'INSERT INTO story_interviewees (story_id, interviewee_id) VALUES ($1, $2)',
      [testStoryId, testIntervieweeId]
    );

    // Create tag and link to story
    const tagResult = await client.query(
      'INSERT INTO tags (tag_name, created_by) VALUES ($1, $2) RETURNING id',
      ['CascadeTestTag', testTeacherId]
    );
    const testTagId = tagResult.rows[0].id;

    await client.query(
      'INSERT INTO story_tags (story_id, tag_id) VALUES ($1, $2)',
      [testStoryId, testTagId]
    );

    await client.query('COMMIT');

    testResults.cascadeDeletes.push(await runTest(
      'Cascade delete story relationships when story is deleted',
      async () => {
        // Verify relationships exist before delete
        const beforeDeleteInterviewees = await client.query(
          'SELECT COUNT(*) FROM story_interviewees WHERE story_id = $1',
          [testStoryId]
        );
        const beforeDeleteTags = await client.query(
          'SELECT COUNT(*) FROM story_tags WHERE story_id = $1',
          [testStoryId]
        );
        
        if (beforeDeleteInterviewees.rows[0].count === '0' || beforeDeleteTags.rows[0].count === '0') {
          throw new Error('Test setup failed: Story relationships not found');
        }

        // Delete the story
        await client.query('DELETE FROM story_ideas WHERE id = $1', [testStoryId]);

        // Verify relationships are deleted
        const afterDeleteInterviewees = await client.query(
          'SELECT COUNT(*) FROM story_interviewees WHERE story_id = $1',
          [testStoryId]
        );
        const afterDeleteTags = await client.query(
          'SELECT COUNT(*) FROM story_tags WHERE story_id = $1',
          [testStoryId]
        );

        if (afterDeleteInterviewees.rows[0].count !== '0' || afterDeleteTags.rows[0].count !== '0') {
          throw new Error('Cascade delete failed: Story relationships still exist');
        }
      },
      false // Expected to succeed
    ));

    // Clean up test data
    await client.query('BEGIN');
    await client.query('DELETE FROM tags WHERE tag_name = $1', ['CascadeTestTag']);
    await client.query('DELETE FROM interviewees WHERE name = $1', ['Test Cascade Interviewee']);
    await client.query('DELETE FROM users WHERE username LIKE $1', ['%cascade%']);
    await client.query('DELETE FROM users WHERE username LIKE $1', ['%test_%constraints%']);
    await client.query('DELETE FROM users WHERE username LIKE $1', ['%valid_%']);
    await client.query('DELETE FROM teacher_requests WHERE email LIKE $1', ['%example.com']);
    await client.query('DELETE FROM classes WHERE class_name LIKE $1', ['%Test%']);
    await client.query('DELETE FROM schools WHERE school_name = $1', ['Test School for Constraints']);
    await client.query('COMMIT');

    res.json({
      message: 'Database constraint tests completed',
      results: testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Constraint test error:', error);
    res.status(500).json({ 
      error: 'Failed to run constraint tests',
      details: error.message,
      results: testResults
    });
  } finally {
    client.release();
  }
});

// Simple test endpoint to verify API is working
router.get('/health', (req, res) => {
  res.json({ 
    message: 'Constraint testing API is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;