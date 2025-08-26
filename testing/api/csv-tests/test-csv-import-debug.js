#!/usr/bin/env node

/**
 * CSV Import Debug Test
 * Tests the CSV import functionality to identify issues
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'https://podcast-stories-production.up.railway.app/api';

// Test credentials (from CLAUDE.md Phase 1)
const TEST_CREDENTIALS = {
  admin: { email: 'admin@vidpod.com', password: 'rumi&amaml' },
  teacher: { email: 'teacher@vidpod.com', password: 'rumi&amaml' },
  student: { email: 'student@vidpod.com', password: 'rumi&amaml' }
};

class CSVImportTester {
  constructor() {
    this.token = null;
    this.user = null;
  }

  async login(userType = 'teacher') {
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
        console.log(`✅ Login successful as ${this.user.name || this.user.email} (${this.user.role})`);
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

  async checkUploadsDirectory() {
    console.log('\n📁 Checking uploads directory...');
    
    const uploadsPath = path.join(__dirname, 'uploads');
    
    try {
      if (!fs.existsSync(uploadsPath)) {
        console.log(`⚠️ Uploads directory doesn't exist: ${uploadsPath}`);
        console.log('🔧 Creating uploads directory...');
        fs.mkdirSync(uploadsPath, { recursive: true });
        console.log('✅ Uploads directory created');
      } else {
        console.log('✅ Uploads directory exists');
      }
      
      // Check permissions
      fs.accessSync(uploadsPath, fs.constants.R_OK | fs.constants.W_OK);
      console.log('✅ Uploads directory has read/write permissions');
      
      return true;
    } catch (error) {
      console.error(`❌ Uploads directory error:`, error.message);
      return false;
    }
  }

  async createTestCSV() {
    console.log('\n📄 Creating test CSV file...');
    
    const testCSVContent = `idea_title,idea_description,question_1,question_2,question_3,question_4,question_5,question_6,coverage_start_date,coverage_end_date,tags,interviewees
Test Story Import,This is a test story for CSV import,What is your background?,How did you get started?,What challenges did you face?,What advice would you give?,What's next for you?,Any final thoughts?,2024-01-01,2024-01-31,Technology,John Doe
Another Test Story,Second test story description,Question 1 for story 2,Question 2 for story 2,,,,,2024-02-01,2024-02-28,Education,Jane Smith`;

    const testCSVPath = path.join(__dirname, 'test-csv-import.csv');
    
    try {
      fs.writeFileSync(testCSVPath, testCSVContent);
      console.log(`✅ Test CSV created: ${testCSVPath}`);
      return testCSVPath;
    } catch (error) {
      console.error(`❌ Failed to create test CSV:`, error.message);
      return null;
    }
  }

  async testCSVImport(csvFilePath) {
    console.log('\n📤 Testing CSV import...');
    
    if (!this.token) {
      console.error('❌ No authentication token available');
      return false;
    }

    if (!fs.existsSync(csvFilePath)) {
      console.error(`❌ CSV file not found: ${csvFilePath}`);
      return false;
    }

    try {
      const form = new FormData();
      form.append('csv', fs.createReadStream(csvFilePath));

      console.log('🔄 Sending CSV import request...');
      console.log(`📁 File: ${csvFilePath}`);
      console.log(`🔑 Token: ${this.token.substring(0, 20)}...`);

      const response = await fetch(`${API_URL}/stories/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...form.getHeaders()
        },
        body: form
      });

      console.log(`📊 Response status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ CSV import successful!');
        console.log(`📈 Import results:`, result);
        return true;
      } else {
        const error = await response.text();
        console.error(`❌ CSV import failed:`, error);
        
        // Try to parse as JSON for better error info
        try {
          const jsonError = JSON.parse(error);
          console.error(`🔍 Error details:`, jsonError);
        } catch (e) {
          console.error(`🔍 Raw error response:`, error);
        }
        
        return false;
      }
    } catch (error) {
      console.error(`❌ CSV import error:`, error.message);
      return false;
    }
  }

  async testWithSampleData() {
    console.log('\n📋 Testing with existing sample-data.csv...');
    
    const sampleCSVPath = path.join(__dirname, 'sample-data.csv');
    
    if (!fs.existsSync(sampleCSVPath)) {
      console.log('⚠️ sample-data.csv not found, skipping this test');
      return true;
    }

    console.log('📊 Analyzing sample CSV structure...');
    
    try {
      const content = fs.readFileSync(sampleCSVPath, 'utf8');
      const lines = content.split('\n');
      const headers = lines[0].split(',');
      
      console.log(`📏 Sample CSV has ${lines.length - 1} data rows`);
      console.log(`📋 Headers: ${headers.join(', ')}`);
      
      // Test with just first few rows to avoid overwhelming the system
      const testLines = lines.slice(0, 4); // Header + 3 data rows
      const testContent = testLines.join('\n');
      
      const testPath = path.join(__dirname, 'sample-test-subset.csv');
      fs.writeFileSync(testPath, testContent);
      
      console.log('🧪 Testing with subset of sample data (3 rows)...');
      const result = await this.testCSVImport(testPath);
      
      // Clean up test file
      fs.unlinkSync(testPath);
      
      return result;
    } catch (error) {
      console.error(`❌ Sample data test error:`, error.message);
      return false;
    }
  }

  async checkDatabaseSchema() {
    console.log('\n🗄️ Checking database schema compatibility...');
    
    try {
      // Try to get a story to see the current schema
      const response = await fetch(`${API_URL}/stories`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (response.ok) {
        const stories = await response.json();
        console.log(`✅ Stories endpoint accessible, ${stories.length} stories found`);
        
        if (stories.length > 0) {
          const sampleStory = stories[0];
          const fields = Object.keys(sampleStory);
          console.log(`🔍 Story fields in database:`, fields.join(', '));
          
          // Check for key fields
          const requiredFields = ['id', 'idea_title', 'idea_description', 'uploaded_by'];
          const missingFields = requiredFields.filter(field => !fields.includes(field));
          
          if (missingFields.length === 0) {
            console.log('✅ All required fields present');
          } else {
            console.log(`⚠️ Missing required fields:`, missingFields.join(', '));
          }
          
          // Check for approval_status field (from Phase 2)
          if (fields.includes('approval_status')) {
            console.log('✅ approval_status field present (Phase 2 migration applied)');
          } else {
            console.log('⚠️ approval_status field not found (Phase 2 migration may not be applied)');
          }
        }
        
        return true;
      } else {
        console.error(`❌ Failed to fetch stories for schema check:`, await response.text());
        return false;
      }
    } catch (error) {
      console.error(`❌ Database schema check error:`, error.message);
      return false;
    }
  }

  async testEndpointVariations() {
    console.log('\n🔍 Testing different field name variations...');
    
    const testCSVPath = await this.createTestCSV();
    if (!testCSVPath) return false;

    const variations = [
      { fieldName: 'csv', description: 'Current backend expectation' },
      { fieldName: 'csvFile', description: 'Frontend might be sending this' },
      { fieldName: 'file', description: 'Generic file field' }
    ];

    for (const variation of variations) {
      console.log(`\n🧪 Testing with field name: "${variation.fieldName}" (${variation.description})`);
      
      try {
        const form = new FormData();
        form.append(variation.fieldName, fs.createReadStream(testCSVPath));

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
          console.log(`✅ SUCCESS with field name: "${variation.fieldName}"`);
          console.log(`📈 Result:`, result);
          
          // Clean up test file and return success
          fs.unlinkSync(testCSVPath);
          return true;
        } else {
          const error = await response.text();
          console.log(`❌ Failed with "${variation.fieldName}":`, error.substring(0, 200));
        }
      } catch (error) {
        console.log(`❌ Error with "${variation.fieldName}":`, error.message);
      }
    }

    // Clean up test file
    fs.unlinkSync(testCSVPath);
    return false;
  }

  async runAllTests() {
    console.log('🧪 === CSV Import Debug Test Suite ===\n');

    // 1. Login
    const loginSuccess = await this.login('teacher');
    if (!loginSuccess) {
      console.log('\n❌ Cannot proceed without authentication');
      return false;
    }

    // 2. Check uploads directory
    await this.checkUploadsDirectory();

    // 3. Check database schema
    await this.checkDatabaseSchema();

    // 4. Test with simple CSV
    const testCSVPath = await this.createTestCSV();
    if (testCSVPath) {
      await this.testCSVImport(testCSVPath);
      fs.unlinkSync(testCSVPath); // Clean up
    }

    // 5. Test different field name variations
    await this.testEndpointVariations();

    // 6. Test with sample data
    await this.testWithSampleData();

    console.log('\n🏁 === Test Suite Complete ===');
  }
}

// Run the test
const tester = new CSVImportTester();
tester.runAllTests().catch(error => {
  console.error('\n💥 Test suite failed:', error);
  process.exit(1);
});