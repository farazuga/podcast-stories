#!/usr/bin/env node

/**
 * CSV Import Test with Authentication
 * Creates a test user and tests CSV import functionality
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'https://podcast-stories-production.up.railway.app/api';

class CSVImportAuthTester {
  constructor() {
    this.token = null;
    this.user = null;
    this.testEmail = `csvtest-${Date.now()}@example.com`;
  }

  async registerTestUser() {
    console.log('🔐 Creating test user for CSV testing...');
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.testEmail,
          password: 'testpass123',
          name: 'CSV Test User',
          school: 'Test School'
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.token;
        this.user = data.user;
        console.log(`✅ Test user created: ${this.testEmail}`);
        console.log(`🎫 Token received: ${this.token.substring(0, 20)}...`);
        return true;
      } else {
        const error = await response.json();
        console.error(`❌ Registration failed:`, error);
        return false;
      }
    } catch (error) {
      console.error(`❌ Registration error:`, error.message);
      return false;
    }
  }

  async testCSVImport() {
    console.log('\n📤 Testing CSV Import with authentication...');
    
    if (!this.token) {
      console.error('❌ No authentication token available');
      return false;
    }

    // Create test CSV
    const testCSVContent = `idea_title,idea_description,question_1,question_2,question_3,question_4,question_5,question_6,coverage_start_date,coverage_end_date,tags,interviewees
CSV Test Story,This is a test story imported via CSV,What is your name?,What do you do?,How long have you been doing this?,What challenges have you faced?,What advice would you give?,Any final thoughts?,2024-01-01,2024-01-31,Technology,John Doe
Another CSV Story,Second test story from CSV import,Tell us about your journey,What motivates you?,,,,,2024-02-01,2024-02-28,Education,Jane Smith`;

    const testCSVPath = path.join(__dirname, 'csv-auth-test.csv');
    fs.writeFileSync(testCSVPath, testCSVContent);
    
    console.log(`📄 Created test CSV: ${testCSVPath}`);

    try {
      const form = new FormData();
      form.append('csv', fs.createReadStream(testCSVPath));

      console.log('🔄 Sending CSV import request...');
      
      const response = await fetch(`${API_URL}/stories/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...form.getHeaders()
        },
        body: form
      });

      console.log(`📊 Response status: ${response.status} ${response.statusText}`);

      const responseText = await response.text();
      console.log(`📝 Response: ${responseText}`);

      if (response.ok) {
        console.log('✅ CSV import successful!');
        
        try {
          const result = JSON.parse(responseText);
          console.log(`📈 Import details:`, result);
        } catch (e) {
          console.log('📋 Raw response (not JSON):', responseText);
        }
        
        // Verify by fetching stories
        await this.verifyImportedStories();
        
      } else {
        console.log('❌ CSV import failed');
        
        if (response.status === 400 && responseText.includes('No file uploaded')) {
          console.log('🔍 Issue: Field name mismatch - backend expects different field name');
        } else if (response.status === 500) {
          console.log('🔍 Issue: Server error during processing');
        }
      }

      // Clean up
      fs.unlinkSync(testCSVPath);
      return response.ok;
      
    } catch (error) {
      console.error(`❌ CSV import error:`, error.message);
      // Clean up
      if (fs.existsSync(testCSVPath)) {
        fs.unlinkSync(testCSVPath);
      }
      return false;
    }
  }

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
          story.idea_title.includes('CSV Test') || 
          story.uploaded_by_email === this.testEmail ||
          story.uploaded_by === this.user.id
        );
        
        console.log(`🎯 Test stories found: ${testStories.length}`);
        
        if (testStories.length > 0) {
          console.log('✅ Stories successfully imported and visible');
          testStories.forEach((story, index) => {
            console.log(`  ${index + 1}. "${story.idea_title}" by ${story.uploaded_by_name || 'Unknown'}`);
          });
        } else {
          console.log('⚠️ No test stories found - import may have failed silently');
        }
        
      } else {
        console.error('❌ Failed to fetch stories for verification');
      }
    } catch (error) {
      console.error('❌ Verification error:', error.message);
    }
  }

  async testFieldNameVariations() {
    console.log('\n🔍 Testing different field name variations...');
    
    const testCSVContent = `idea_title,idea_description
Variation Test,Testing field name variations`;
    const testCSVPath = path.join(__dirname, 'field-test.csv');
    fs.writeFileSync(testCSVContent, testCSVPath);

    const variations = [
      'csv',
      'csvFile', 
      'file',
      'upload'
    ];

    for (const fieldName of variations) {
      console.log(`\n🧪 Testing field name: "${fieldName}"`);
      
      try {
        const form = new FormData();
        form.append(fieldName, fs.createReadStream(testCSVPath));

        const response = await fetch(`${API_URL}/stories/import`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            ...form.getHeaders()
          },
          body: form
        });

        console.log(`📊 Status: ${response.status}`);
        const responseText = await response.text();
        
        if (response.status === 400 && responseText.includes('No file uploaded')) {
          console.log(`❌ "${fieldName}" - Backend doesn't recognize this field name`);
        } else if (response.ok) {
          console.log(`✅ "${fieldName}" - SUCCESS! This is the correct field name`);
          fs.unlinkSync(testCSVPath);
          return fieldName;
        } else {
          console.log(`⚠️ "${fieldName}" - Status ${response.status}: ${responseText.substring(0, 100)}`);
        }
        
      } catch (error) {
        console.log(`❌ "${fieldName}" - Error: ${error.message}`);
      }
    }

    if (fs.existsSync(testCSVPath)) {
      fs.unlinkSync(testCSVPath);
    }
    
    return null;
  }

  async runFullTest() {
    console.log('🧪 === CSV Import Authentication Test Suite ===\n');

    // 1. Register test user
    const registrationSuccess = await this.registerTestUser();
    if (!registrationSuccess) {
      console.log('\n❌ Cannot proceed without authentication');
      return false;
    }

    // 2. Test field name variations first
    const correctFieldName = await this.testFieldNameVariations();
    if (correctFieldName) {
      console.log(`\n✅ Correct field name identified: "${correctFieldName}"`);
    }

    // 3. Test full CSV import
    await this.testCSVImport();

    console.log('\n🏁 === Test Suite Complete ===');
  }
}

// Run the test
const tester = new CSVImportAuthTester();
tester.runFullTest().catch(error => {
  console.error('\n💥 Test suite failed:', error);
  process.exit(1);
});