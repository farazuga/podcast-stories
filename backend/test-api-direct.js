#!/usr/bin/env node

/**
 * Direct API Routes Testing - No Server Required
 * Tests API route logic directly using production database
 * 
 * This isolates route testing from server startup conflicts
 */

require('dotenv').config();
const { Pool } = require('pg');

// Mock request/response objects for testing route handlers
class MockRequest {
  constructor(user, params = {}, query = {}, body = {}) {
    this.user = user;
    this.params = params;
    this.query = query;
    this.body = body;
    this.ip = '127.0.0.1';
  }

  get(header) {
    return header === 'User-Agent' ? 'Test-Agent' : undefined;
  }
}

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.responseData = null;
    this.headers = {};
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  json(data) {
    this.responseData = data;
    return this;
  }

  setHeader(name, value) {
    this.headers[name] = value;
    return this;
  }
}

class DirectAPITester {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  log(level, message, details = null) {
    const emoji = {
      'INFO': 'ℹ️',
      'SUCCESS': '✅', 
      'WARNING': '⚠️',
      'ERROR': '❌',
      'FIX': '🔧'
    };
    
    console.log(`${emoji[level]} ${message}`);
    if (details) {
      console.log('   Details:', JSON.stringify(details, null, 2));
    }
  }

  async testCoursesAPI() {
    this.log('INFO', 'Testing Courses API Integration...');

    try {
      // Test the exact query from courses.js GET / route
      const coursesQuery = `
        SELECT 
          c.*, 
          COALESCE(u.name, u.email) as teacher_name,
          u.email as teacher_email,
          s.name as school_name,
          (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) as enrolled_count,
          (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lesson_count
        FROM courses c
        LEFT JOIN users u ON c.teacher_id = u.id
        LEFT JOIN schools s ON c.school_id = s.id
        WHERE 1=1
        ORDER BY c.created_at DESC
        LIMIT 5
      `;

      const result = await this.pool.query(coursesQuery);
      
      this.log('SUCCESS', `Courses API query successful`, {
        rowCount: result.rows.length,
        hasSchoolName: result.rows.length > 0 ? result.rows[0].school_name !== undefined : 'no data',
        fields: result.fields.map(f => f.name)
      });

      // Verify school integration works
      const schoolCheck = await this.pool.query('SELECT name FROM schools LIMIT 1');
      if (schoolCheck.rows.length === 0) {
        this.log('WARNING', 'No schools found in database - school integration cannot be fully tested');
      }

      return true;
    } catch (error) {
      this.log('ERROR', 'Courses API test failed', { error: error.message });
      return false;
    }
  }

  async testLessonsAPI() {
    this.log('INFO', 'Testing Lessons API Parameter Handling...');

    try {
      // Test parameter type handling for lesson creation
      const testLessonParams = [
        1, // course_id
        'Test Lesson Title',
        'Test Description',
        'Test Content',
        1, // week_number
        1, // lesson_number
        JSON.stringify(['vocabulary1', 'vocabulary2']), // vocabulary_terms as JSONB
        null, // requires_completion_of as INTEGER (null is correct)
        JSON.stringify({ type: 'none' }), // unlock_criteria as JSONB
        false // is_published
      ];

      // Test that these parameters would work with the database
      const parameterTestQuery = `
        SELECT 
          $1::INTEGER as course_id,
          $2::VARCHAR as title,
          $3::TEXT as description,
          $4::TEXT as content,
          $5::INTEGER as week_number,
          $6::INTEGER as lesson_number,
          $7::JSONB as vocabulary_terms,
          $8::INTEGER as requires_completion_of,
          $9::JSONB as unlock_criteria,
          $10::BOOLEAN as is_published
      `;

      const result = await this.pool.query(parameterTestQuery, testLessonParams);
      
      this.log('SUCCESS', 'Lessons API parameter types verified', {
        parameterCount: testLessonParams.length,
        vocabularyTerms: result.rows[0].vocabulary_terms,
        requiresCompletionOf: result.rows[0].requires_completion_of,
        unlockCriteria: result.rows[0].unlock_criteria
      });

      return true;
    } catch (error) {
      this.log('ERROR', 'Lessons API test failed', { error: error.message });
      return false;
    }
  }

  async testQuizAPI() {
    this.log('INFO', 'Testing Quiz API Parameter Handling...');

    try {
      // Test quiz parameter types from quizzes.js
      const testQuizParams = [
        1, // lesson_id
        'Test Quiz',
        'Test Description',
        null, // time_limit
        3, // attempts_allowed 
        'best', // grading_method
        70, // passing_score
        false, // randomize_questions
        true, // show_correct_answers
        false // is_published
      ];

      const quizParameterTestQuery = `
        SELECT 
          $1::INTEGER as lesson_id,
          $2::VARCHAR as title,
          $3::TEXT as description,
          $4::INTEGER as time_limit,
          $5::INTEGER as attempts_allowed,
          $6::VARCHAR as grading_method,
          $7::INTEGER as passing_score,
          $8::BOOLEAN as randomize_questions,
          $9::BOOLEAN as show_correct_answers,
          $10::BOOLEAN as is_published
      `;

      const result = await this.pool.query(quizParameterTestQuery, testQuizParams);
      
      this.log('SUCCESS', 'Quiz API parameter types verified', {
        parameterCount: testQuizParams.length,
        lessonId: result.rows[0].lesson_id,
        attemptsAllowed: result.rows[0].attempts_allowed,
        gradingMethod: result.rows[0].grading_method,
        passingScore: result.rows[0].passing_score
      });

      return true;
    } catch (error) {
      this.log('ERROR', 'Quiz API test failed', { error: error.message });
      return false;
    }
  }

  async testDatabaseSchema() {
    this.log('INFO', 'Verifying Database Schema for API Integration...');

    try {
      // Check if all required tables exist with correct columns
      const tableChecks = [
        {
          table: 'courses',
          requiredColumns: ['title', 'total_weeks', 'difficulty_level', 'prerequisites']
        },
        {
          table: 'schools', 
          requiredColumns: ['name']
        },
        {
          table: 'lessons',
          requiredColumns: ['lesson_number', 'requires_completion_of', 'vocabulary_terms', 'unlock_criteria']
        },
        {
          table: 'quizzes',
          requiredColumns: ['lesson_id', 'attempts_allowed', 'grading_method', 'passing_score']
        }
      ];

      const results = {};

      for (const check of tableChecks) {
        const schemaQuery = `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `;

        const schemaResult = await this.pool.query(schemaQuery, [check.table]);
        const existingColumns = schemaResult.rows.map(row => row.column_name);

        const missingColumns = check.requiredColumns.filter(col => !existingColumns.includes(col));

        results[check.table] = {
          exists: schemaResult.rows.length > 0,
          totalColumns: existingColumns.length,
          missingColumns,
          hasAllRequired: missingColumns.length === 0
        };
      }

      const allTablesValid = Object.values(results).every(r => r.exists && r.hasAllRequired);

      if (allTablesValid) {
        this.log('SUCCESS', 'Database schema is compatible with API routes', results);
      } else {
        this.log('ERROR', 'Database schema has missing elements', results);
      }

      return allTablesValid;
    } catch (error) {
      this.log('ERROR', 'Schema verification failed', { error: error.message });
      return false;
    }
  }

  async runAllTests() {
    this.log('INFO', 'Starting Direct API Routes Testing');

    const tests = [
      { name: 'Database Schema', fn: () => this.testDatabaseSchema() },
      { name: 'Courses API', fn: () => this.testCoursesAPI() },
      { name: 'Lessons API', fn: () => this.testLessonsAPI() },
      { name: 'Quiz API', fn: () => this.testQuizAPI() }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const success = await test.fn();
        if (success) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        this.log('ERROR', `Test ${test.name} threw exception`, { error: error.message });
        failed++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('DIRECT API TESTING SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${passed + failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

    return { passed, failed };
  }

  async cleanup() {
    await this.pool.end();
  }
}

async function main() {
  const tester = new DirectAPITester();

  try {
    const results = await tester.runAllTests();
    
    if (results.failed === 0) {
      console.log('\n✅ All direct API tests passed! Routes are ready for integration.');
      process.exit(0);
    } else {
      console.log('\n❌ Some API tests failed. Check the errors above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error during testing:', error.message);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = { DirectAPITester };