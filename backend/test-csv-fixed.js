#!/usr/bin/env node

/**
 * Fixed CSV Import Test
 * Uses built-in FormData instead of form-data package
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'https://podcast-stories-production.up.railway.app/api';

// Working credentials
const TEST_CREDENTIALS = {
  admin: { email: 'admin@vidpod.com', password: 'vidpod' }
};

class FixedCSVTest {
  constructor() {
    this.token = null;
    this.user = null;
    this.testFiles = [];
  }

  async login() {
    console.log('🔐 Logging in...');
    
    const credentials = TEST_CREDENTIALS.admin;
    
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
        console.log(`✅ Login successful as ${this.user.name}`);
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

  createTestCSVFiles() {
    console.log('\n📄 Creating test CSV files...');
    
    const testCases = [
      {
        name: 'fixed-basic-test.csv',
        description: 'Basic CSV test with built-in FormData',
        content: `idea_title,idea_description
Fixed Test Story 1,This story tests the fixed CSV import functionality
Fixed Test Story 2,Another test story using built-in FormData`
      },
      {
        name: 'fixed-full-test.csv', 
        description: 'Complete CSV with all fields',
        content: `idea_title,idea_description,question_1,question_2,question_3,question_4,question_5,question_6,coverage_start_date,coverage_end_date,tags,interviewees
Fixed Full Story 1,Complete test story with all fields,What is your background?,How did you get started?,What challenges have you faced?,What drives you?,What advice would you give?,Any final thoughts?,2024-01-01,2024-01-31,FixedTag1,Fixed Interviewee 1
Fixed Full Story 2,Another complete story,Tell us about your journey,What motivates you?,How do you handle setbacks?,What are your goals?,Share your wisdom,What's next for you?,2024-02-01,2024-02-28,"FixedTag2,Technology","Fixed Person 1,Fixed Person 2"`
      },
      {
        name: 'fixed-edge-cases.csv',
        description: 'Edge cases and special characters',
        content: `idea_title,idea_description,question_1,tags,interviewees
"Fixed Story with, commas","Description with ""quotes"" and, commas",What is your story?,"Fixed,Special","Smith, John"
Fixed Empty Fields,Only title and description,,,
"Fixed Unicode Test","Unicode: émañá 中文","¿Cómo estás?",International,José María`
      }
    ];

    this.testFiles = [];
    
    for (const testCase of testCases) {
      const filePath = path.join(__dirname, testCase.name);
      try {
        fs.writeFileSync(filePath, testCase.content);
        console.log(`✅ Created: ${testCase.name}`);
        this.testFiles.push({ path: filePath, ...testCase });
      } catch (error) {
        console.error(`❌ Failed to create ${testCase.name}:`, error.message);
      }
    }
    
    return this.testFiles.length;
  }

  async testCSVImport(testFile) {
    console.log(`\n📤 Testing: ${testFile.name}`);
    console.log(`🎯 ${testFile.description}`);
    
    if (!fs.existsSync(testFile.path)) {
      console.error(`❌ File not found: ${testFile.path}`);
      return { success: false, error: 'File not found' };
    }

    try {
      // Read file content
      const fileContent = fs.readFileSync(testFile.path, 'utf8');
      const stats = fs.statSync(testFile.path);
      console.log(`📊 File size: ${stats.size} bytes`);
      
      // Use built-in FormData (Node.js 18+)
      const form = new FormData();
      const blob = new Blob([fileContent], { type: 'text/csv' });
      form.append('csv', blob, testFile.name);

      console.log('🔄 Sending CSV import request...');
      const startTime = Date.now();
      
      const response = await fetch(`${API_URL}/stories/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
          // Don't set Content-Type - let browser/FormData handle it
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
          result.errors.slice(0, 3).forEach((error, index) => {
            console.log(`  ${index + 1}. Row ${error.row} (${error.title}): ${error.error}`);
          });
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

  async verifyImports() {
    console.log('\n🔍 Verifying imported stories...');
    
    try {
      const response = await fetch(`${API_URL}/stories`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (response.ok) {
        const stories = await response.json();
        
        // Look for our test stories
        const testStories = stories.filter(story => 
          story.idea_title.includes('Fixed Test') || 
          story.idea_title.includes('Fixed Full') ||
          story.idea_title.includes('Fixed Story') ||
          story.idea_title.includes('Fixed Empty') ||
          story.idea_title.includes('Fixed Unicode')
        );
        
        console.log(`📚 Total stories: ${stories.length}`);
        console.log(`🎯 Fixed test stories found: ${testStories.length}`);
        
        if (testStories.length > 0) {
          console.log('📝 Recent fixed test stories:');
          testStories.slice(-5).forEach((story, index) => {
            console.log(`  ${index + 1}. "${story.idea_title}" (ID: ${story.id})`);
            if (story.tags && story.tags.length > 0) {
              console.log(`     Tags: ${story.tags.join(', ')}`);
            }
            if (story.interviewees && story.interviewees.length > 0) {
              console.log(`     Interviewees: ${story.interviewees.join(', ')}`);
            }
          });
        }
        
        return testStories.length;
      } else {
        console.error('❌ Failed to fetch stories for verification');
        return -1;
      }
    } catch (error) {
      console.error('❌ Verification error:', error.message);
      return -1;
    }
  }

  cleanupTestFiles() {
    console.log('\n🧹 Cleaning up test files...');
    
    let cleanedCount = 0;
    for (const testFile of this.testFiles) {
      try {
        if (fs.existsSync(testFile.path)) {
          fs.unlinkSync(testFile.path);
          cleanedCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to delete ${testFile.name}:`, error.message);
      }
    }
    
    console.log(`🧹 Cleaned up ${cleanedCount} test files`);
  }

  async runFixedTest() {
    console.log('🧪 === Fixed CSV Import Test (Built-in FormData) ===\n');

    // 1. Authentication
    const authSuccess = await this.login();
    if (!authSuccess) {
      console.log('\n❌ Test failed: Could not authenticate');
      return false;
    }

    // 2. Create test files
    const filesCreated = this.createTestCSVFiles();
    if (filesCreated === 0) {
      console.log('\n❌ Test failed: Could not create test files');
      return false;
    }

    // 3. Test each CSV file
    const importResults = [];
    let totalImported = 0;
    let successCount = 0;
    
    for (const testFile of this.testFiles) {
      const result = await this.testCSVImport(testFile);
      importResults.push({ file: testFile.name, result });
      
      if (result.success) {
        successCount++;
        totalImported += result.imported || 0;
      }
    }

    // 4. Verify results
    const verifiedStories = await this.verifyImports();

    // 5. Cleanup
    this.cleanupTestFiles();

    // 6. Final report
    console.log('\n🏁 === Fixed Test Results ===');
    console.log(`📊 Files tested: ${this.testFiles.length}`);
    console.log(`✅ Successful imports: ${successCount}`);
    console.log(`📚 Stories imported: ${totalImported}`);
    console.log(`🎯 Stories verified: ${verifiedStories > 0 ? verifiedStories : 'None'}`);
    
    const successRate = Math.round((successCount / this.testFiles.length) * 100);
    console.log(`📈 Success rate: ${successRate}%`);

    if (successRate === 100) {
      console.log('🎉 CSV Import is now working perfectly with built-in FormData!');
    } else if (successRate >= 75) {
      console.log('✅ CSV Import is mostly working, minor issues remain');
    } else {
      console.log('⚠️ CSV Import still has significant issues');
    }

    // Detailed results
    console.log('\n📋 Detailed Results:');
    importResults.forEach(({ file, result }) => {
      if (result.success) {
        console.log(`  ✅ ${file}: ${result.imported} stories imported`);
      } else {
        console.log(`  ❌ ${file}: ${result.error}`);
      }
    });

    return successCount === this.testFiles.length;
  }
}

// Check Node.js version
function checkNodeVersion() {
  const version = process.version;
  const majorVersion = parseInt(version.split('.')[0].substring(1));
  
  console.log(`📋 Node.js version: ${version}`);
  
  if (majorVersion < 18) {
    console.log('⚠️ Warning: Built-in FormData requires Node.js 18+');
    console.log('This test may fail on older Node.js versions');
    return false;
  }
  
  console.log('✅ Node.js version supports built-in FormData');
  return true;
}

// Run the fixed test
async function runTest() {
  console.log('🔧 === CSV Import Fix Verification ===\n');
  
  checkNodeVersion();
  
  const tester = new FixedCSVTest();
  const success = await tester.runFixedTest();
  
  if (success) {
    console.log('\n🎉 CSV Import functionality has been successfully fixed!');
    console.log('💡 Issue: The form-data npm package was incompatible');
    console.log('✅ Solution: Use built-in FormData (Node.js 18+) or manual multipart');
  } else {
    console.log('\n⚠️ Some issues remain with CSV import functionality');
  }
}

runTest().catch(error => {
  console.error('\n💥 Fixed test crashed:', error);
  process.exit(1);
});