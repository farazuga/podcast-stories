#!/usr/bin/env node
/**
 * VidPOD Lesson Management System - Enrollment & Progress Testing Suite
 * Agent 4: Enrollment & Progress Specialist
 * 
 * Comprehensive testing of enrollment and student progress tracking functionality
 */

const https = require('https');
const fs = require('fs').promises;

const BASE_URL = 'https://podcast-stories-production.up.railway.app';
const TEST_RESULTS = [];

// Test accounts from CLAUDE.md
const TEST_ACCOUNTS = {
  admin: { email: 'admin@vidpod.com', password: 'vidpod' },
  teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
  student: { email: 'student@vidpod.com', password: 'vidpod' }
};

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VidPOD-Enrollment-Test',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ 
            statusCode: res.statusCode, 
            data: parsed,
            headers: res.headers 
          });
        } catch (e) {
          resolve({ 
            statusCode: res.statusCode, 
            data: data,
            headers: res.headers 
          });
        }
      });
    });

    req.on('error', reject);

    if (options.data) {
      req.write(JSON.stringify(options.data));
    }

    req.end();
  });
}

async function login(email, password) {
  console.log(`🔐 Logging in as ${email}...`);
  
  const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    data: { email, password }
  });

  if (response.statusCode === 200 && response.data.token) {
    console.log(`✅ Login successful for ${email}`);
    return response.data.token;
  } else {
    console.log(`❌ Login failed for ${email}:`, response.data);
    return null;
  }
}

async function testDatabaseSchema() {
  console.log('\n🔧 Testing Database Schema...');
  
  try {
    // Test lesson schema fix endpoint
    const schemaResponse = await makeRequest(`${BASE_URL}/api/lessons/fix-schema-temp`);
    
    TEST_RESULTS.push({
      test: 'Database Schema - Lessons Table',
      passed: schemaResponse.statusCode === 200,
      details: schemaResponse.data,
      statusCode: schemaResponse.statusCode
    });

    if (schemaResponse.statusCode === 200) {
      console.log('✅ Lessons table schema fix successful');
    } else {
      console.log('❌ Lessons table schema issue:', schemaResponse.data);
    }
  } catch (error) {
    console.log('❌ Database schema test failed:', error.message);
    TEST_RESULTS.push({
      test: 'Database Schema Test',
      passed: false,
      details: error.message
    });
  }
}

async function testCourseEnrollment(studentToken, teacherToken) {
  console.log('\n📚 Testing Course Enrollment System...');
  
  try {
    // First, let's get available courses
    const coursesResponse = await makeRequest(`${BASE_URL}/api/courses`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    TEST_RESULTS.push({
      test: 'Get Available Courses (Student)',
      passed: coursesResponse.statusCode === 200,
      details: `${coursesResponse.data?.length || 0} courses found`,
      statusCode: coursesResponse.statusCode
    });

    if (coursesResponse.statusCode === 200) {
      console.log(`✅ Found ${coursesResponse.data.length} courses available to student`);
      
      if (coursesResponse.data.length === 0) {
        console.log('⚠️ No courses available - creating test course...');
        
        // Create a test course as teacher
        const newCourse = {
          title: 'Test Enrollment Course',
          description: 'Test course for enrollment testing',
          total_weeks: 4,
          learning_objectives: [
            'Test enrollment functionality',
            'Verify progress tracking',
            'Test prerequisite system'
          ]
        };

        const createResponse = await makeRequest(`${BASE_URL}/api/courses`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${teacherToken}` },
          data: newCourse
        });

        TEST_RESULTS.push({
          test: 'Create Test Course (Teacher)',
          passed: createResponse.statusCode === 201,
          details: createResponse.data,
          statusCode: createResponse.statusCode
        });

        if (createResponse.statusCode === 201) {
          console.log('✅ Test course created successfully');
          
          // Now test enrollment
          const courseId = createResponse.data.course.id;
          const enrollResponse = await makeRequest(`${BASE_URL}/api/courses/${courseId}/enroll`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${studentToken}` }
          });

          TEST_RESULTS.push({
            test: 'Student Course Enrollment',
            passed: enrollResponse.statusCode === 201,
            details: enrollResponse.data,
            statusCode: enrollResponse.statusCode
          });

          if (enrollResponse.statusCode === 201) {
            console.log('✅ Student successfully enrolled in course');
          } else {
            console.log('❌ Student enrollment failed:', enrollResponse.data);
          }
        } else {
          console.log('❌ Test course creation failed:', createResponse.data);
        }
      } else {
        // Test enrollment in existing course
        const courseId = coursesResponse.data[0].id;
        const enrollResponse = await makeRequest(`${BASE_URL}/api/courses/${courseId}/enroll`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${studentToken}` }
        });

        TEST_RESULTS.push({
          test: 'Student Enrollment in Existing Course',
          passed: enrollResponse.statusCode === 201,
          details: enrollResponse.data,
          statusCode: enrollResponse.statusCode
        });
      }
    } else {
      console.log('❌ Failed to get courses:', coursesResponse.data);
    }
  } catch (error) {
    console.log('❌ Course enrollment test failed:', error.message);
    TEST_RESULTS.push({
      test: 'Course Enrollment Test',
      passed: false,
      details: error.message
    });
  }
}

async function testProgressTracking(studentToken, teacherToken) {
  console.log('\n📈 Testing Student Progress Tracking...');
  
  try {
    // Get student's enrolled courses
    const coursesResponse = await makeRequest(`${BASE_URL}/api/courses`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    if (coursesResponse.statusCode === 200 && coursesResponse.data.length > 0) {
      const courseId = coursesResponse.data[0].id;
      console.log(`📖 Testing progress for course: ${coursesResponse.data[0].title}`);

      // Test course progress endpoint
      const progressResponse = await makeRequest(`${BASE_URL}/api/progress/course/${courseId}`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });

      TEST_RESULTS.push({
        test: 'Get Student Course Progress',
        passed: progressResponse.statusCode === 200,
        details: progressResponse.data ? 'Progress data retrieved' : 'No progress data',
        statusCode: progressResponse.statusCode
      });

      if (progressResponse.statusCode === 200) {
        console.log('✅ Course progress retrieved successfully');
        console.log(`📊 Course Progress:`, JSON.stringify(progressResponse.data.course_progress, null, 2));
        console.log(`📝 Lessons Found: ${progressResponse.data.lesson_progress.length}`);
      } else {
        console.log('❌ Failed to get course progress:', progressResponse.data);
      }

      // Test lessons for the course
      const lessonsResponse = await makeRequest(`${BASE_URL}/api/lessons/course/${courseId}`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });

      TEST_RESULTS.push({
        test: 'Get Course Lessons',
        passed: lessonsResponse.statusCode === 200,
        details: `${lessonsResponse.data?.length || 0} lessons found`,
        statusCode: lessonsResponse.statusCode
      });

      if (lessonsResponse.statusCode === 200) {
        console.log(`✅ Found ${lessonsResponse.data.length} lessons for course`);
        
        if (lessonsResponse.data.length > 0) {
          const lessonId = lessonsResponse.data[0].id;
          
          // Test individual lesson progress
          const lessonProgressResponse = await makeRequest(`${BASE_URL}/api/progress/lesson/${lessonId}`, {
            headers: { Authorization: `Bearer ${studentToken}` }
          });

          TEST_RESULTS.push({
            test: 'Get Individual Lesson Progress',
            passed: lessonProgressResponse.statusCode === 200,
            details: lessonProgressResponse.data ? 'Lesson progress retrieved' : 'No lesson progress',
            statusCode: lessonProgressResponse.statusCode
          });

          if (lessonProgressResponse.statusCode === 200) {
            console.log('✅ Lesson progress retrieved successfully');
          } else {
            console.log('❌ Failed to get lesson progress:', lessonProgressResponse.data);
          }
        }
      } else {
        console.log('❌ Failed to get course lessons:', lessonsResponse.data);
      }
    } else {
      console.log('⚠️ No enrolled courses found for progress testing');
    }
  } catch (error) {
    console.log('❌ Progress tracking test failed:', error.message);
    TEST_RESULTS.push({
      test: 'Progress Tracking Test',
      passed: false,
      details: error.message
    });
  }
}

async function testPrerequisitesAndUnlock(teacherToken) {
  console.log('\n🔒 Testing Prerequisites and Unlock System...');
  
  try {
    // Get teacher's courses
    const coursesResponse = await makeRequest(`${BASE_URL}/api/courses`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    if (coursesResponse.statusCode === 200 && coursesResponse.data.length > 0) {
      const courseId = coursesResponse.data[0].id;
      
      // Get course lessons
      const lessonsResponse = await makeRequest(`${BASE_URL}/api/lessons/course/${courseId}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });

      TEST_RESULTS.push({
        test: 'Get Course Lessons (Teacher)',
        passed: lessonsResponse.statusCode === 200,
        details: `${lessonsResponse.data?.length || 0} lessons found`,
        statusCode: lessonsResponse.statusCode
      });

      if (lessonsResponse.statusCode === 200 && lessonsResponse.data.length > 0) {
        const lessonId = lessonsResponse.data[0].id;
        
        // Test manual progress update (teacher unlocking lesson)
        const updateData = {
          student_id: 1, // Assuming student ID 1 exists
          lesson_id: lessonId,
          status: 'in_progress',
          completion_percentage: 25,
          force_unlock: true
        };

        const updateResponse = await makeRequest(`${BASE_URL}/api/progress/update`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${teacherToken}` },
          data: updateData
        });

        TEST_RESULTS.push({
          test: 'Manual Progress Update (Teacher)',
          passed: [200, 201].includes(updateResponse.statusCode),
          details: updateResponse.data,
          statusCode: updateResponse.statusCode
        });

        if ([200, 201].includes(updateResponse.statusCode)) {
          console.log('✅ Teacher successfully updated student progress');
        } else {
          console.log('❌ Teacher progress update failed:', updateResponse.data);
        }

        // Test lesson unlock
        const unlockData = {
          student_id: 1,
          unlock_reason: 'Testing unlock functionality'
        };

        const unlockResponse = await makeRequest(`${BASE_URL}/api/progress/unlock/${lessonId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${teacherToken}` },
          data: unlockData
        });

        TEST_RESULTS.push({
          test: 'Manual Lesson Unlock (Teacher)',
          passed: [200, 201].includes(unlockResponse.statusCode),
          details: unlockResponse.data,
          statusCode: unlockResponse.statusCode
        });

        if ([200, 201].includes(unlockResponse.statusCode)) {
          console.log('✅ Teacher successfully unlocked lesson for student');
        } else {
          console.log('❌ Lesson unlock failed:', unlockResponse.data);
        }
      }
    } else {
      console.log('⚠️ No courses found for prerequisites testing');
    }
  } catch (error) {
    console.log('❌ Prerequisites and unlock test failed:', error.message);
    TEST_RESULTS.push({
      test: 'Prerequisites and Unlock Test',
      passed: false,
      details: error.message
    });
  }
}

async function testAnalyticsAndReporting(teacherToken) {
  console.log('\n📊 Testing Analytics and Reporting...');
  
  try {
    // Get teacher's courses
    const coursesResponse = await makeRequest(`${BASE_URL}/api/courses`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    if (coursesResponse.statusCode === 200 && coursesResponse.data.length > 0) {
      const courseId = coursesResponse.data[0].id;
      
      // Test course analytics
      const analyticsResponse = await makeRequest(`${BASE_URL}/api/progress/analytics/course/${courseId}`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });

      TEST_RESULTS.push({
        test: 'Course Analytics (Teacher)',
        passed: analyticsResponse.statusCode === 200,
        details: analyticsResponse.data ? 'Analytics data retrieved' : 'No analytics data',
        statusCode: analyticsResponse.statusCode
      });

      if (analyticsResponse.statusCode === 200) {
        console.log('✅ Course analytics retrieved successfully');
        console.log(`📈 Enrolled Students: ${analyticsResponse.data.overall_stats?.total_students || 0}`);
        console.log(`📚 Total Lessons: ${analyticsResponse.data.overall_stats?.total_lessons || 0}`);
      } else {
        console.log('❌ Failed to get course analytics:', analyticsResponse.data);
      }

      // Test course enrollments list
      const enrollmentsResponse = await makeRequest(`${BASE_URL}/api/courses/${courseId}/enrollments`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });

      TEST_RESULTS.push({
        test: 'Course Enrollments List (Teacher)',
        passed: enrollmentsResponse.statusCode === 200,
        details: `${enrollmentsResponse.data?.length || 0} enrollments found`,
        statusCode: enrollmentsResponse.statusCode
      });

      if (enrollmentsResponse.statusCode === 200) {
        console.log(`✅ Found ${enrollmentsResponse.data.length} enrollments in course`);
      } else {
        console.log('❌ Failed to get course enrollments:', enrollmentsResponse.data);
      }
    } else {
      console.log('⚠️ No courses found for analytics testing');
    }
  } catch (error) {
    console.log('❌ Analytics and reporting test failed:', error.message);
    TEST_RESULTS.push({
      test: 'Analytics and Reporting Test',
      passed: false,
      details: error.message
    });
  }
}

async function generateReport() {
  console.log('\n📋 ENROLLMENT & PROGRESS SYSTEM TEST REPORT');
  console.log('=' .repeat(60));
  
  const passed = TEST_RESULTS.filter(r => r.passed).length;
  const total = TEST_RESULTS.length;
  const successRate = Math.round((passed / total) * 100);
  
  console.log(`Overall Success Rate: ${passed}/${total} (${successRate}%)`);
  console.log('');

  // Group tests by category
  const categories = {
    'Database Schema': TEST_RESULTS.filter(t => t.test.includes('Database')),
    'Course Management': TEST_RESULTS.filter(t => t.test.includes('Course') || t.test.includes('Enrollment')),
    'Progress Tracking': TEST_RESULTS.filter(t => t.test.includes('Progress') || t.test.includes('Lesson')),
    'Prerequisites & Unlock': TEST_RESULTS.filter(t => t.test.includes('Prerequisites') || t.test.includes('Unlock') || t.test.includes('Manual')),
    'Analytics & Reporting': TEST_RESULTS.filter(t => t.test.includes('Analytics') || t.test.includes('Reporting'))
  };

  for (const [category, tests] of Object.entries(categories)) {
    if (tests.length > 0) {
      console.log(`\n${category}:`);
      tests.forEach(test => {
        const icon = test.passed ? '✅' : '❌';
        console.log(`  ${icon} ${test.test}`);
        if (!test.passed) {
          console.log(`     Error: ${test.details}`);
        }
      });
    }
  }

  // Key findings
  console.log('\n🔍 KEY FINDINGS:');
  
  const criticalIssues = TEST_RESULTS.filter(t => !t.passed && (
    t.test.includes('Database') || 
    t.test.includes('Enrollment') || 
    t.test.includes('Progress')
  ));

  if (criticalIssues.length === 0) {
    console.log('✅ All critical enrollment and progress features are functional');
  } else {
    console.log('❌ Critical issues found:');
    criticalIssues.forEach(issue => {
      console.log(`  - ${issue.test}: ${issue.details}`);
    });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (successRate >= 90) {
    console.log('✅ System is production-ready for enrollment and progress tracking');
  } else if (successRate >= 75) {
    console.log('⚠️ System needs minor fixes before full deployment');
  } else {
    console.log('❌ System requires significant fixes before deployment');
  }

  // Save results to file
  const reportData = {
    timestamp: new Date().toISOString(),
    agent: 'Agent 4: Enrollment & Progress Specialist',
    summary: {
      total_tests: total,
      passed_tests: passed,
      success_rate: successRate,
      status: successRate >= 90 ? 'Production Ready' : successRate >= 75 ? 'Minor Issues' : 'Major Issues'
    },
    test_results: TEST_RESULTS,
    categories: categories
  };

  try {
    await fs.writeFile('enrollment-progress-test-report.json', JSON.stringify(reportData, null, 2));
    console.log('\n📁 Detailed report saved to: enrollment-progress-test-report.json');
  } catch (error) {
    console.log('⚠️ Could not save report file:', error.message);
  }

  return successRate;
}

async function main() {
  console.log('🚀 VidPOD Enrollment & Progress Tracking System Test Suite');
  console.log('Agent 4: Enrollment & Progress Specialist');
  console.log('=' .repeat(60));
  
  try {
    // Test database schema first
    await testDatabaseSchema();

    // Login to all test accounts
    const adminToken = await login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    const teacherToken = await login(TEST_ACCOUNTS.teacher.email, TEST_ACCOUNTS.teacher.password);
    const studentToken = await login(TEST_ACCOUNTS.student.email, TEST_ACCOUNTS.student.password);

    if (!adminToken || !teacherToken || !studentToken) {
      console.log('❌ Authentication failed - cannot continue with enrollment tests');
      return;
    }

    // Run comprehensive tests
    await testCourseEnrollment(studentToken, teacherToken);
    await testProgressTracking(studentToken, teacherToken);
    await testPrerequisitesAndUnlock(teacherToken);
    await testAnalyticsAndReporting(teacherToken);

    // Generate final report
    const successRate = await generateReport();
    
    console.log(`\n🎯 Final Status: ${successRate >= 90 ? 'SYSTEM READY' : 'NEEDS FIXES'}`);
    process.exit(successRate >= 90 ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the test suite
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, testCourseEnrollment, testProgressTracking };