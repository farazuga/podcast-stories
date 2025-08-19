#!/usr/bin/env node

/**
 * Final CSV Import Test
 * Tests the complete CSV import functionality after fixes
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'https://podcast-stories-production.up.railway.app/api';

class FinalCSVTest {
  constructor() {
    this.token = null;
    this.user = null;
  }

  // Create a test user for testing
  async createTestUser() {
    console.log('🔐 Creating test user for CSV import...');
    
    const testEmail = `csvtest-${Date.now()}@example.com`;
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'testpass123',
          name: 'CSV Test User',
          school: 'Test School'
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.token;
        this.user = data.user;
        console.log(`✅ Test user created: ${testEmail}`);
        return true;
      } else {
        const error = await response.json();
        console.error(`❌ Registration failed:`, error);
        
        // Try to use existing credentials if registration fails
        return await this.tryExistingCredentials();
      }
    } catch (error) {
      console.error(`❌ Registration error:`, error.message);
      return await this.tryExistingCredentials();
    }
  }

  async tryExistingCredentials() {
    console.log('🔄 Trying existing test credentials...');
    
    const credentials = [
      { email: 'admin@vidpod.com', password: 'rumi&amaml' },
      { email: 'teacher@vidpod.com', password: 'rumi&amaml' },
      { email: 'student@vidpod.com', password: 'rumi&amaml' },
      { email: 'admin', password: 'admin123' },
      { email: 'teacher', password: 'teacher123' },
    ];

    for (const cred of credentials) {
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cred)
        });

        if (response.ok) {
          const data = await response.json();
          this.token = data.token;
          this.user = data.user;
          console.log(`✅ Logged in with: ${cred.email}`);
          return true;
        }
      } catch (error) {
        // Continue to next credential
      }
    }

    console.error('❌ No valid credentials found');
    return false;
  }

  // Test database schema compatibility
  async testDatabaseSchema() {
    console.log('\n🗄️ Testing database schema compatibility...');
    
    try {
      const response = await fetch(`${API_URL}/stories`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (response.ok) {
        const stories = await response.json();
        console.log(`✅ Stories endpoint accessible, ${stories.length} stories in database`);
        
        if (stories.length > 0) {
          const fields = Object.keys(stories[0]);
          console.log(`🔍 Available fields:`, fields.join(', '));
          
          const hasApprovalStatus = fields.includes('approval_status');
          console.log(`📋 Schema type: ${hasApprovalStatus ? 'Phase 2 (with approval_status)' : 'Basic schema'}`);
        }
        
        return true;
      } else {
        console.error('❌ Failed to access stories endpoint');
        return false;
      }
    } catch (error) {
      console.error('❌ Database test error:', error.message);
      return false;
    }
  }

  // Create multiple test CSV files
  createTestCSVFiles() {
    console.log('\n📄 Creating test CSV files...');
    
    const tests = [
      {
        name: 'basic-test.csv',
        description: 'Basic CSV with minimal fields',
        content: `idea_title,idea_description,question_1,question_2
Test Story 1,Basic test story,What is your background?,How did you start?
Test Story 2,Another test story,Tell us about your journey,What challenges did you face?`
      },
      {
        name: 'full-test.csv',
        description: 'Complete CSV with all fields',
        content: `idea_title,idea_description,question_1,question_2,question_3,question_4,question_5,question_6,coverage_start_date,coverage_end_date,tags,interviewees
Full Story 1,Complete story with all fields,Q1 for story 1,Q2 for story 1,Q3 for story 1,Q4 for story 1,Q5 for story 1,Q6 for story 1,2024-01-01,2024-01-31,Technology,John Doe
Full Story 2,Another complete story,Q1 for story 2,Q2 for story 2,Q3 for story 2,Q4 for story 2,Q5 for story 2,Q6 for story 2,2024-02-01,2024-02-28,"Education,Science","Jane Smith,Bob Johnson"`
      },
      {
        name: 'edge-cases.csv',
        description: 'CSV with edge cases and potential issues',
        content: `idea_title,idea_description,question_1,tags,interviewees
"Story with, commas","Description with ""quotes"" and, commas",What is your story?,"Tech,Innovation","Smith, John"
Story with Empty Fields,Description only,,,
"Story with 
Newlines","Description with
multiple lines",Question with special chars: !@#$%,Special,Test User`
      }
    ];

    const createdFiles = [];
    
    for (const test of tests) {
      const filePath = path.join(__dirname, test.name);
      try {
        fs.writeFileSync(filePath, test.content);
        console.log(`✅ Created: ${test.name} - ${test.description}`);
        createdFiles.push({ path: filePath, ...test });
      } catch (error) {
        console.error(`❌ Failed to create ${test.name}:`, error.message);
      }
    }
    
    return createdFiles;
  }

  // Test CSV import with a specific file
  async testCSVImport(testFile) {
    console.log(`\n📤 Testing CSV import: ${testFile.name}`);
    console.log(`Description: ${testFile.description}`);
    
    if (!fs.existsSync(testFile.path)) {
      console.error(`❌ File not found: ${testFile.path}`);
      return false;
    }

    try {
      // Read file info
      const stats = fs.statSync(testFile.path);
      console.log(`📊 File size: ${stats.size} bytes`);
      
      // For Node.js testing, we'll simulate FormData
      const fileContent = fs.readFileSync(testFile.path);
      
      // Create a proper FormData-like structure for Node.js
      const FormData = require('form-data');
      const form = new FormData();
      form.append('csv', fileContent, {
        filename: testFile.name,
        contentType: 'text/csv'
      });

      console.log('🔄 Sending import request...');
      
      const response = await fetch(`${API_URL}/stories/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...form.getHeaders()
        },
        body: form
      });

      console.log(`📊 Response: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Import successful!');
        console.log(`📈 Results:`, {
          imported: result.imported,
          total: result.total,
          errors: result.errors?.length || 0,
          schemaInfo: result.schemaInfo
        });
        
        if (result.errors && result.errors.length > 0) {
          console.log('⚠️ Import errors:');
          result.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. Row ${error.row}: ${error.error}`);
          });
        }
        
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Import failed:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.details) {
            console.error('🔍 Error details:', errorData.details);
          }
        } catch (e) {
          // Error response is not JSON
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Import error:', error.message);
      return false;
    }
  }

  // Verify imported stories
  async verifyImportedStories() {
    console.log('\n🔍 Verifying imported stories...');
    
    try {
      const response = await fetch(`${API_URL}/stories`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (response.ok) {
        const stories = await response.json();
        console.log(`📚 Total stories in database: ${stories.length}`);
        
        // Look for our test stories
        const testStories = stories.filter(story => 
          story.idea_title.includes('Test Story') || 
          story.idea_title.includes('Full Story') ||
          story.uploaded_by === this.user.id
        );
        
        console.log(`🎯 Test stories found: ${testStories.length}`);
        
        if (testStories.length > 0) {
          console.log('📝 Test stories:');
          testStories.forEach((story, index) => {
            console.log(`  ${index + 1}. "${story.idea_title}" (ID: ${story.id})`);
            if (story.tags && story.tags.length > 0) {
              console.log(`     Tags: ${story.tags.join(', ')}`);
            }
            if (story.interviewees && story.interviewees.length > 0) {
              console.log(`     Interviewees: ${story.interviewees.join(', ')}`);
            }
          });
          
          return testStories.length;
        } else {
          console.log('⚠️ No test stories found');
          return 0;
        }
      } else {
        console.error('❌ Failed to fetch stories for verification');
        return -1;
      }
    } catch (error) {
      console.error('❌ Verification error:', error.message);
      return -1;
    }
  }

  // Clean up test files
  cleanupTestFiles(testFiles) {
    console.log('\n🧹 Cleaning up test files...');
    
    for (const testFile of testFiles) {
      try {
        if (fs.existsSync(testFile.path)) {
          fs.unlinkSync(testFile.path);
          console.log(`✅ Deleted: ${testFile.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to delete ${testFile.name}:`, error.message);
      }
    }
  }

  // Run complete test suite
  async runComprehensiveTest() {
    console.log('🧪 === Final CSV Import Test Suite ===\n');

    let success = true;

    // 1. Authentication
    const authSuccess = await this.createTestUser();
    if (!authSuccess) {
      console.log('\n❌ Test failed: Could not authenticate');
      return false;
    }

    // 2. Database schema test
    const schemaSuccess = await this.testDatabaseSchema();
    if (!schemaSuccess) {
      console.log('\n⚠️ Database schema test failed, but continuing...');
    }

    // 3. Create test files
    const testFiles = this.createTestCSVFiles();
    if (testFiles.length === 0) {
      console.log('\n❌ Test failed: Could not create test files');
      return false;
    }

    // 4. Test each CSV file
    let totalImported = 0;
    for (const testFile of testFiles) {
      const importSuccess = await this.testCSVImport(testFile);
      if (!importSuccess) {
        console.log(`⚠️ Import failed for ${testFile.name}`);
        success = false;
      } else {
        totalImported++;
      }
    }

    // 5. Verify imported stories
    const storiesFound = await this.verifyImportedStories();
    if (storiesFound > 0) {
      console.log(`✅ Verification successful: ${storiesFound} test stories found`);
    } else if (storiesFound === 0) {
      console.log('⚠️ No test stories found in verification');
      success = false;
    }

    // 6. Cleanup
    this.cleanupTestFiles(testFiles);

    // Final results
    console.log('\n🏁 === Test Results ===');
    console.log(`📊 CSV files tested: ${testFiles.length}`);
    console.log(`✅ Successful imports: ${totalImported}`);
    console.log(`📚 Stories verified: ${storiesFound > 0 ? storiesFound : 'None'}`);
    console.log(`🎯 Overall result: ${success ? 'SUCCESS' : 'PARTIAL SUCCESS/FAILURE'}`);

    if (success) {
      console.log('\n🎉 CSV import functionality is working correctly!');
    } else {
      console.log('\n⚠️ CSV import has some issues that need attention.');
    }

    return success;
  }
}

// Run the comprehensive test
const tester = new FinalCSVTest();
tester.runComprehensiveTest().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});