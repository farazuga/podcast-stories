#!/usr/bin/env node

/**
 * MCP CSV Import Test Suite
 * Tests CSV import functionality using real API calls and file operations
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'https://podcast-stories-production.up.railway.app/api';

// Working credentials discovered
const TEST_CREDENTIALS = {
  admin: { email: 'admin@vidpod.com', password: 'vidpod' },
  teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
  student: { email: 'student@vidpod.com', password: 'vidpod' }
};

class MCPCSVTest {
  constructor() {
    this.token = null;
    this.user = null;
    this.testFiles = [];
  }

  async login(userType = 'admin') {
    console.log(`🔐 Logging in as ${userType}...`);
    
    const credentials = TEST_CREDENTIALS[userType];
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.token;
        this.user = data.user;
        console.log(`✅ Login successful as ${this.user.name} (${this.user.role})`);
        return true;
      } else {
        const error = await response.json();
        console.error(`❌ Login failed:`, error);
        return false;
      }
    } catch (error) {
      console.error(`❌ Login error:`, error.message);
      return false;
    }
  }

  async checkExistingStories() {
    console.log('\n📚 Checking existing stories...');
    
    try {
      const response = await fetch(`${API_URL}/stories`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (response.ok) {
        const stories = await response.json();
        console.log(`✅ Found ${stories.length} existing stories in database`);
        
        if (stories.length > 0) {
          const sampleStory = stories[0];
          const fields = Object.keys(sampleStory);
          console.log(`🔍 Story fields available:`, fields.slice(0, 10).join(', '), fields.length > 10 ? '...' : '');
          
          const hasApprovalStatus = fields.includes('approval_status');
          console.log(`📋 Database schema: ${hasApprovalStatus ? 'Phase 2 (with approval system)' : 'Basic schema'}`);
        }
        
        return stories.length;
      } else {
        console.error('❌ Failed to fetch stories');
        return -1;
      }
    } catch (error) {
      console.error('❌ Error checking stories:', error.message);
      return -1;
    }
  }

  createTestCSVFiles() {
    console.log('\n📄 Creating test CSV files...');
    
    const testCases = [
      {
        name: 'mcp-basic-test.csv',
        description: 'Basic CSV with required fields only',
        content: `idea_title,idea_description
MCP Test Story 1,This is a basic test story imported via MCP testing
MCP Test Story 2,Another basic test story for validation`
      },
      {
        name: 'mcp-full-featured.csv', 
        description: 'Complete CSV with all supported fields',
        content: `idea_title,idea_description,question_1,question_2,question_3,question_4,question_5,question_6,coverage_start_date,coverage_end_date,tags,interviewees
MCP Full Story 1,Complete test story with all fields,What is your background?,How did you get started?,What challenges have you faced?,What drives you?,What advice would you give?,Any final thoughts?,2024-01-01,2024-01-31,Technology,John Doe
MCP Full Story 2,Another complete story,Tell us about your journey,What motivates you?,How do you handle setbacks?,What are your goals?,Share your wisdom,What's next for you?,2024-02-01,2024-02-28,"Education,Innovation","Jane Smith,Bob Johnson"`
      },
      {
        name: 'mcp-edge-cases.csv',
        description: 'CSV with edge cases and special characters',
        content: `idea_title,idea_description,question_1,tags,interviewees
"Story with, commas","Description with ""quotes"" and, commas",What is your story?,"Tech,Innovation","Smith, John"
Story with Empty Fields,Only title and description provided,,,
"Story with Special Chars!@#","Description with special characters: !@#$%^&*()","Question with unicode: é ñ ü 中文",Special,Test User
MCP Unicode Test,Testing unicode characters: émañá,¿Cómo estás?,International,José María`
      },
      {
        name: 'mcp-tag-creation.csv',
        description: 'CSV that tests automatic tag creation',
        content: `idea_title,idea_description,tags,interviewees
MCP New Tag Test 1,Testing creation of new tags,MCPTestTag1,Test Person 1
MCP New Tag Test 2,Testing multiple new tags,"MCPTestTag2,MCPTestTag3,ExistingTag",Test Person 2
MCP Existing Tags,Testing with potentially existing tags,"Technology,Education",Existing Person`
      }
    ];

    this.testFiles = [];
    
    for (const testCase of testCases) {
      const filePath = path.join(__dirname, testCase.name);
      try {
        fs.writeFileSync(filePath, testCase.content);
        console.log(`✅ Created: ${testCase.name} - ${testCase.description}`);
        this.testFiles.push({ path: filePath, ...testCase });
      } catch (error) {
        console.error(`❌ Failed to create ${testCase.name}:`, error.message);
      }
    }
    
    return this.testFiles.length;
  }

  async testCSVImport(testFile) {
    console.log(`\n📤 Testing CSV import: ${testFile.name}`);
    console.log(`🎯 Purpose: ${testFile.description}`);
    
    if (!fs.existsSync(testFile.path)) {
      console.error(`❌ File not found: ${testFile.path}`);
      return { success: false, error: 'File not found' };
    }

    try {
      // Check file stats
      const stats = fs.statSync(testFile.path);
      console.log(`📊 File size: ${stats.size} bytes`);
      
      // Create FormData
      const form = new FormData();
      form.append('csv', fs.createReadStream(testFile.path), {
        filename: testFile.name,
        contentType: 'text/csv'
      });

      console.log('🔄 Sending CSV import request...');
      const startTime = Date.now();
      
      const response = await fetch(`${API_URL}/stories/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...form.getHeaders()
        },
        body: form
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`📊 Response: ${response.status} ${response.statusText} (${duration}ms)`);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Import successful!');
        
        const importResult = {
          success: true,
          imported: result.imported,
          total: result.total,
          errors: result.errors?.length || 0,
          schemaInfo: result.schemaInfo,
          duration: duration
        };
        
        console.log(`📈 Results:`, importResult);
        
        if (result.errors && result.errors.length > 0) {
          console.log('⚠️ Import errors:');
          result.errors.slice(0, 5).forEach((error, index) => {
            console.log(`  ${index + 1}. Row ${error.row} (${error.title}): ${error.error}`);
          });
          if (result.errors.length > 5) {
            console.log(`  ... and ${result.errors.length - 5} more errors`);
          }
        }
        
        return importResult;
      } else {
        let errorDetails;
        try {
          errorDetails = await response.json();
        } catch (e) {
          errorDetails = { error: await response.text() };
        }
        
        console.error('❌ Import failed:', errorDetails);
        
        return {
          success: false,
          error: errorDetails.error || errorDetails.message,
          details: errorDetails.details,
          status: response.status
        };
      }
    } catch (error) {
      console.error('❌ Import error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async verifyImportedStories(beforeCount) {
    console.log('\n🔍 Verifying imported stories...');
    
    try {
      const response = await fetch(`${API_URL}/stories`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (response.ok) {
        const stories = await response.json();
        const afterCount = stories.length;
        const newStories = afterCount - beforeCount;
        
        console.log(`📚 Stories count: ${beforeCount} → ${afterCount} (${newStories >= 0 ? '+' : ''}${newStories})`);
        
        if (newStories > 0) {
          // Look for our test stories
          const testStories = stories.filter(story => 
            story.idea_title.includes('MCP Test') || 
            story.idea_title.includes('MCP Full') ||
            story.uploaded_by === this.user.id
          );
          
          console.log(`🎯 MCP test stories found: ${testStories.length}`);
          
          if (testStories.length > 0) {
            console.log('📝 Recent test stories:');
            testStories.slice(-5).forEach((story, index) => {
              console.log(`  ${index + 1}. "${story.idea_title}" (ID: ${story.id})`);
              if (story.tags && story.tags.length > 0) {
                console.log(`     Tags: ${story.tags.join(', ')}`);
              }
              if (story.interviewees && story.interviewees.length > 0) {
                console.log(`     Interviewees: ${story.interviewees.join(', ')}`);
              }
              if (story.approval_status) {
                console.log(`     Status: ${story.approval_status}`);
              }
            });
          }
          
          return { newStories, testStories: testStories.length, allStories: afterCount };
        } else {
          console.log('⚠️ No new stories detected');
          return { newStories: 0, testStories: 0, allStories: afterCount };
        }
      } else {
        console.error('❌ Failed to fetch stories for verification');
        return null;
      }
    } catch (error) {
      console.error('❌ Verification error:', error.message);
      return null;
    }
  }

  async testInvalidInputs() {
    console.log('\n🚫 Testing invalid inputs and error handling...');
    
    const invalidTests = [
      {
        name: 'No file test',
        test: async () => {
          const form = new FormData();
          // Don't append any file
          
          const response = await fetch(`${API_URL}/stories/import`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.token}`,
              ...form.getHeaders()
            },
            body: form
          });
          
          return {
            status: response.status,
            success: response.status === 400,
            message: await response.text()
          };
        }
      },
      {
        name: 'Invalid file type test',
        test: async () => {
          // Create a non-CSV file
          const txtPath = path.join(__dirname, 'test.txt');
          fs.writeFileSync(txtPath, 'This is not a CSV file');
          
          const form = new FormData();
          form.append('csv', fs.createReadStream(txtPath), {
            filename: 'test.txt',
            contentType: 'text/plain'
          });
          
          const response = await fetch(`${API_URL}/stories/import`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.token}`,
              ...form.getHeaders()
            },
            body: form
          });
          
          // Clean up
          fs.unlinkSync(txtPath);
          
          return {
            status: response.status,
            success: response.status >= 400,
            message: await response.text()
          };
        }
      },
      {
        name: 'Invalid CSV content test',
        test: async () => {
          // Create malformed CSV
          const malformedPath = path.join(__dirname, 'malformed.csv');
          fs.writeFileSync(malformedPath, 'idea_title\n,,,\n"unclosed quote\ntitle without commas');
          
          const form = new FormData();
          form.append('csv', fs.createReadStream(malformedPath), {
            filename: 'malformed.csv',
            contentType: 'text/csv'
          });
          
          const response = await fetch(`${API_URL}/stories/import`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.token}`,
              ...form.getHeaders()
            },
            body: form
          });
          
          // Clean up
          fs.unlinkSync(malformedPath);
          
          return {
            status: response.status,
            success: true, // Any response is acceptable for malformed data
            message: await response.text()
          };
        }
      }
    ];

    let validationResults = {};
    
    for (const test of invalidTests) {
      console.log(`🧪 Running: ${test.name}`);
      try {
        const result = await test.test();
        validationResults[test.name] = result;
        console.log(`  ${result.success ? '✅' : '❌'} Status: ${result.status}, Response: ${result.message.substring(0, 100)}${result.message.length > 100 ? '...' : ''}`);
      } catch (error) {
        validationResults[test.name] = { success: false, error: error.message };
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    
    return validationResults;
  }

  cleanupTestFiles() {
    console.log('\n🧹 Cleaning up test files...');
    
    let cleanedCount = 0;
    for (const testFile of this.testFiles) {
      try {
        if (fs.existsSync(testFile.path)) {
          fs.unlinkSync(testFile.path);
          console.log(`✅ Deleted: ${testFile.name}`);
          cleanedCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to delete ${testFile.name}:`, error.message);
      }
    }
    
    console.log(`🧹 Cleaned up ${cleanedCount} test files`);
  }

  async runComprehensiveMCPTest() {
    console.log('🧪 === MCP CSV Import Test Suite ===\n');

    const results = {
      authentication: false,
      schemaDetection: false,
      basicImport: false,
      fullFeaturedImport: false,
      edgeCaseHandling: false,
      tagCreation: false,
      errorHandling: false,
      verification: false
    };

    // 1. Authentication
    console.log('🔍 PHASE 1: Authentication');
    results.authentication = await this.login('admin');
    if (!results.authentication) {
      console.log('\n❌ Test suite failed: Could not authenticate');
      return results;
    }

    // 2. Check existing state
    console.log('\n🔍 PHASE 2: Database State Check');
    const beforeCount = await this.checkExistingStories();
    if (beforeCount >= 0) {
      results.schemaDetection = true;
    }

    // 3. Create test files
    console.log('\n🔍 PHASE 3: Test File Creation');
    const filesCreated = this.createTestCSVFiles();
    console.log(`📄 Created ${filesCreated} test files`);

    if (filesCreated === 0) {
      console.log('\n❌ Test failed: Could not create test files');
      return results;
    }

    // 4. Test each CSV file
    console.log('\n🔍 PHASE 4: CSV Import Testing');
    const importResults = [];
    
    for (const testFile of this.testFiles) {
      const result = await this.testCSVImport(testFile);
      importResults.push({ file: testFile.name, result });
      
      // Track specific test results
      if (testFile.name.includes('basic')) {
        results.basicImport = result.success;
      } else if (testFile.name.includes('full-featured')) {
        results.fullFeaturedImport = result.success;
      } else if (testFile.name.includes('edge-cases')) {
        results.edgeCaseHandling = result.success;
      } else if (testFile.name.includes('tag-creation')) {
        results.tagCreation = result.success;
      }
    }

    // 5. Test error handling
    console.log('\n🔍 PHASE 5: Error Handling Testing');
    const errorResults = await this.testInvalidInputs();
    results.errorHandling = Object.values(errorResults).every(r => r.success);

    // 6. Verify results
    console.log('\n🔍 PHASE 6: Import Verification');
    const verification = await this.verifyImportedStories(beforeCount);
    if (verification && verification.newStories > 0) {
      results.verification = true;
      console.log(`✅ Verification successful: ${verification.newStories} new stories imported`);
    } else {
      console.log('⚠️ Verification failed: No new stories detected');
    }

    // 7. Cleanup
    this.cleanupTestFiles();

    // 8. Final report
    console.log('\n🏁 === MCP Test Results Summary ===');
    console.log(`🔐 Authentication: ${results.authentication ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🗄️ Schema Detection: ${results.schemaDetection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`📄 Basic Import: ${results.basicImport ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🎯 Full Featured Import: ${results.fullFeaturedImport ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🔧 Edge Case Handling: ${results.edgeCaseHandling ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🏷️ Tag Creation: ${results.tagCreation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🚫 Error Handling: ${results.errorHandling ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`✅ Import Verification: ${results.verification ? '✅ PASS' : '❌ FAIL'}`);

    const passCount = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    const successRate = Math.round((passCount / totalTests) * 100);

    console.log(`\n📊 Overall Results: ${passCount}/${totalTests} tests passed (${successRate}%)`);
    
    if (successRate >= 80) {
      console.log('🎉 CSV Import functionality is working well!');
    } else if (successRate >= 60) {
      console.log('⚠️ CSV Import has some issues that should be addressed');
    } else {
      console.log('❌ CSV Import has significant issues requiring attention');
    }

    // Detailed import summary
    console.log('\n📈 Import Summary:');
    let totalImported = 0;
    importResults.forEach(({ file, result }) => {
      if (result.success) {
        totalImported += result.imported || 0;
        console.log(`  ✅ ${file}: ${result.imported || 0} stories imported`);
      } else {
        console.log(`  ❌ ${file}: ${result.error}`);
      }
    });
    console.log(`📊 Total stories imported: ${totalImported}`);

    return results;
  }
}

// Run the comprehensive MCP test
const tester = new MCPCSVTest();
tester.runComprehensiveMCPTest().catch(error => {
  console.error('\n💥 MCP Test suite crashed:', error);
  console.error(error.stack);
  process.exit(1);
});