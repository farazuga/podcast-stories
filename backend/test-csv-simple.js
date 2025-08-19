#!/usr/bin/env node

/**
 * Simple CSV Import Test
 * Tests the CSV import endpoint to identify the exact issue
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'https://podcast-stories-production.up.railway.app/api';

async function testCSVImportEndpoint() {
  console.log('🧪 Testing CSV Import Endpoint\n');

  // Create a simple test CSV
  const testCSVContent = `idea_title,idea_description,question_1,question_2,question_3,question_4,question_5,question_6,coverage_start_date,coverage_end_date,tags,interviewees
Test Story,This is a test story,What is your background?,How did you get started?,,,,,2024-01-01,2024-01-31,Technology,John Doe`;

  const testCSVPath = path.join(__dirname, 'test-simple.csv');
  fs.writeFileSync(testCSVPath, testCSVContent);
  
  console.log('📄 Created test CSV:', testCSVPath);

  // Test different field names and scenarios
  const testCases = [
    { fieldName: 'csv', description: 'Backend expects "csv"', withAuth: false },
    { fieldName: 'csvFile', description: 'Frontend might send "csvFile"', withAuth: false },
    { fieldName: 'file', description: 'Generic "file"', withAuth: false },
    { fieldName: 'csv', description: 'With fake auth token', withAuth: true }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.description}`);
    
    try {
      const form = new FormData();
      form.append(testCase.fieldName, fs.createReadStream(testCSVPath));

      const headers = {
        ...form.getHeaders()
      };
      
      if (testCase.withAuth) {
        headers['Authorization'] = 'Bearer fake-token-for-testing';
      }

      const response = await fetch(`${API_URL}/stories/import`, {
        method: 'POST',
        headers: headers,
        body: form
      });

      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      console.log(`📝 Response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
      
      if (response.status === 401) {
        console.log('✅ Expected: Authentication required');
      } else if (response.status === 400 && responseText.includes('No file uploaded')) {
        console.log('❌ Field name mismatch: Backend expects different field name');
      } else if (response.status === 500) {
        console.log('⚠️ Server error: Possible backend processing issue');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  // Clean up
  fs.unlinkSync(testCSVPath);
  console.log('\n🧹 Cleaned up test file');
}

// Test the endpoint variations
testCSVImportEndpoint().catch(error => {
  console.error('\n💥 Test failed:', error);
  process.exit(1);
});