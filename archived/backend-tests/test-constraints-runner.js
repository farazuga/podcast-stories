#!/usr/bin/env node

const axios = require('axios');

const BACKEND_URL = 'https://podcast-stories-production.up.railway.app/api';

async function runConstraintTests() {
  console.log('='.repeat(80));
  console.log('DATABASE CONSTRAINT TESTING - PRODUCTION RAILWAY DATABASE');
  console.log('='.repeat(80));
  console.log(`Testing against: ${BACKEND_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log();

  try {
    // First, we need to get an admin token
    console.log('🔐 Authenticating as admin...');
    
    const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (!loginResponse.data.token) {
      throw new Error('Failed to get admin token');
    }

    const token = loginResponse.data.token;
    console.log('✅ Admin authentication successful');
    console.log();

    // Check if test endpoint is available
    console.log('🔍 Checking test endpoint availability...');
    
    try {
      const healthResponse = await axios.get(`${BACKEND_URL}/test/health`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Test endpoint is available');
      console.log();
    } catch (error) {
      console.log('❌ Test endpoint not available. Please deploy the updated backend first.');
      console.log('The test endpoint needs to be deployed to production before running tests.');
      return;
    }

    // Run the constraint tests
    console.log('🧪 Running database constraint tests...');
    console.log();

    const testResponse = await axios.post(`${BACKEND_URL}/test/run-constraint-tests`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const results = testResponse.data.results;
    
    // Display results
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${results.summary.totalTests}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);
    console.log(`Success Rate: ${((results.summary.passed / results.summary.totalTests) * 100).toFixed(1)}%`);
    console.log();

    // Foreign Key Constraints
    console.log('🔗 FOREIGN KEY CONSTRAINT TESTS');
    console.log('-'.repeat(50));
    results.foreignKeyConstraints.forEach((test, index) => {
      const icon = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${index + 1}. ${test.test}`);
      console.log(`   Expected: ${test.expected}`);
      console.log(`   Actual: ${test.actual}`);
      if (test.error) {
        console.log(`   Error Code: ${test.error}`);
      }
      console.log();
    });

    // Check Constraints
    console.log('☑️  CHECK CONSTRAINT TESTS');
    console.log('-'.repeat(50));
    results.checkConstraints.forEach((test, index) => {
      const icon = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${index + 1}. ${test.test}`);
      console.log(`   Expected: ${test.expected}`);
      console.log(`   Actual: ${test.actual}`);
      if (test.error) {
        console.log(`   Error Code: ${test.error}`);
      }
      console.log();
    });

    // Unique Constraints
    console.log('🔑 UNIQUE CONSTRAINT TESTS');
    console.log('-'.repeat(50));
    results.uniqueConstraints.forEach((test, index) => {
      const icon = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${index + 1}. ${test.test}`);
      console.log(`   Expected: ${test.expected}`);
      console.log(`   Actual: ${test.actual}`);
      if (test.error) {
        console.log(`   Error Code: ${test.error}`);
      }
      console.log();
    });

    // Cascade Deletes
    console.log('🗑️  CASCADE DELETE TESTS');
    console.log('-'.repeat(50));
    results.cascadeDeletes.forEach((test, index) => {
      const icon = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${index + 1}. ${test.test}`);
      console.log(`   Expected: ${test.expected}`);
      console.log(`   Actual: ${test.actual}`);
      if (test.error) {
        console.log(`   Error Code: ${test.error}`);
      }
      console.log();
    });

    // Overall Assessment
    console.log('📋 OVERALL ASSESSMENT');
    console.log('='.repeat(50));
    
    const failedTests = [
      ...results.foreignKeyConstraints.filter(t => t.status === 'FAILED'),
      ...results.checkConstraints.filter(t => t.status === 'FAILED'),
      ...results.uniqueConstraints.filter(t => t.status === 'FAILED'),
      ...results.cascadeDeletes.filter(t => t.status === 'FAILED')
    ];

    if (failedTests.length === 0) {
      console.log('🎉 All database constraints are working correctly!');
      console.log('✅ Foreign key constraints are properly enforced');
      console.log('✅ Check constraints are properly enforced');
      console.log('✅ Unique constraints are properly enforced');
      console.log('✅ Cascade deletes are working as expected');
    } else {
      console.log('⚠️  Some database constraints need attention:');
      failedTests.forEach(test => {
        console.log(`❌ ${test.test}: ${test.actual}`);
      });
    }

    console.log();
    console.log('📝 DETAILED FINDINGS');
    console.log('='.repeat(50));

    // Foreign Key Analysis
    const fkPassed = results.foreignKeyConstraints.filter(t => t.status === 'PASSED').length;
    const fkTotal = results.foreignKeyConstraints.length;
    console.log(`Foreign Key Constraints: ${fkPassed}/${fkTotal} passed`);
    
    if (fkPassed === fkTotal) {
      console.log('✅ All foreign key relationships are properly enforced');
      console.log('   - teacher_requests.school_id correctly references schools.id');
      console.log('   - classes.teacher_id correctly references users.id');
      console.log('   - user_classes.user_id correctly references users.id');
      console.log('   - user_classes.class_id correctly references classes.id');
    }

    // Check Constraint Analysis
    const ccPassed = results.checkConstraints.filter(t => t.status === 'PASSED').length;
    const ccTotal = results.checkConstraints.length;
    console.log(`Check Constraints: ${ccPassed}/${ccTotal} passed`);
    
    if (ccPassed === ccTotal) {
      console.log('✅ All check constraints are properly enforced');
      console.log('   - teacher_requests.status only allows: pending, approved, rejected');
      console.log('   - users.role only allows: amitrace_admin, teacher, student, admin, user');
    }

    // Unique Constraint Analysis
    const ucPassed = results.uniqueConstraints.filter(t => t.status === 'PASSED').length;
    const ucTotal = results.uniqueConstraints.length;
    console.log(`Unique Constraints: ${ucPassed}/${ucTotal} passed`);
    
    if (ucPassed === ucTotal) {
      console.log('✅ All unique constraints are properly enforced');
      console.log('   - classes.class_code must be unique');
      console.log('   - teacher_requests.email must be unique');
    }

    // Cascade Delete Analysis
    const cdPassed = results.cascadeDeletes.filter(t => t.status === 'PASSED').length;
    const cdTotal = results.cascadeDeletes.length;
    console.log(`Cascade Deletes: ${cdPassed}/${cdTotal} passed`);
    
    if (cdPassed === cdTotal) {
      console.log('✅ All cascade deletes are working correctly');
      console.log('   - Deleting users removes related user_classes and password_reset_tokens');
      console.log('   - Deleting classes removes related user_classes records');
      console.log('   - Deleting stories removes related story_tags and story_interviewees');
    }

    console.log();
    console.log('='.repeat(80));
    console.log('TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error running constraint tests:');
    
    if (error.response) {
      console.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Please check if the backend is running at:', BACKEND_URL);
    } else {
      console.error('Error message:', error.message);
    }
    
    console.log();
    console.log('🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Ensure the backend is deployed and running on Railway');
    console.log('2. Verify the updated schema has been applied to the production database');
    console.log('3. Check that the test-constraints route is included in the deployment');
    console.log('4. Verify admin credentials are correct');
    
    process.exit(1);
  }
}

// Run the tests
runConstraintTests();