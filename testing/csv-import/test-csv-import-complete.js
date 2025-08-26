/**
 * Complete CSV Import Test
 * Test the full CSV import process with actual file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const CSV_FILE_PATH = '/Users/faraz/Downloads/vidpod-sample-stories (3).csv';
const API_URL = process.env.API_URL || 'https://podcast-stories-production.up.railway.app/api';

// Test credentials (using test admin account)
const TEST_CREDENTIALS = {
  email: 'admin@vidpod.com',
  password: 'vidpod'
};

console.log('=== Complete CSV Import Test ===\n');

class CSVImportTester {
  constructor() {
    this.token = null;
    this.testResults = {
      authentication: false,
      fileRead: false,
      importRequest: false,
      dateValidation: false,
      storyCreation: false
    };
  }

  async runFullTest() {
    console.log('Starting comprehensive CSV import test...\n');

    try {
      // Step 1: Authenticate
      console.log('Step 1: Authentication');
      await this.authenticate();
      console.log('✅ Authentication successful\n');

      // Step 2: Read and validate CSV file
      console.log('Step 2: CSV File Validation');
      const csvData = await this.readCSVFile();
      this.validateCSVStructure(csvData);
      console.log('✅ CSV file validation successful\n');

      // Step 3: Test CSV import endpoint
      console.log('Step 3: CSV Import API Call');
      const importResult = await this.importCSVFile();
      console.log('✅ CSV import API call successful\n');

      // Step 4: Verify imported stories
      console.log('Step 4: Story Verification');
      await this.verifyImportedStories(importResult);
      console.log('✅ Story verification successful\n');

      // Step 5: Date display testing
      console.log('Step 5: Date Display Testing');
      await this.testDateDisplay();
      console.log('✅ Date display testing successful\n');

      this.printFinalReport();

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      console.log('\nError details:', error);
      this.printFinalReport();
      process.exit(1);
    }
  }

  async authenticate() {
    console.log(`  → Authenticating as ${TEST_CREDENTIALS.email}...`);
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_CREDENTIALS)
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.token = data.token;
    this.testResults.authentication = true;
    
    console.log(`  → Token received: ${this.token.substring(0, 20)}...`);
  }

  async readCSVFile() {
    console.log(`  → Reading CSV file: ${CSV_FILE_PATH}`);
    
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found: ${CSV_FILE_PATH}`);
    }

    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    this.testResults.fileRead = true;
    
    console.log(`  → File size: ${csvContent.length} characters`);
    console.log(`  → Content preview:\n${csvContent.substring(0, 200)}...`);
    
    return csvContent;
  }

  validateCSVStructure(csvContent) {
    console.log('  → Validating CSV structure...');
    
    const lines = csvContent.trim().split('\n');
    console.log(`  → Total lines: ${lines.length}`);
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least header + 1 data row');
    }

    const headers = lines[0].split(',');
    console.log(`  → Headers (${headers.length}): ${headers.join(', ')}`);
    
    // Validate required headers
    const requiredHeaders = ['idea_title', 'coverage_start_date'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    // Validate date formats in data
    console.log('  → Checking date formats in data rows...');
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.trim()) {
        const dateMatch = row.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
        if (dateMatch) {
          console.log(`    Row ${i}: Found date "${dateMatch[1]}"`);
        }
      }
    }
  }

  async importCSVFile() {
    console.log('  → Preparing FormData for upload...');
    
    const csvContent = fs.readFileSync(CSV_FILE_PATH);
    
    // Create form data using Node.js form-data
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    formData.append('csv', csvContent, {
      filename: 'vidpod-sample-stories.csv',
      contentType: 'text/csv'
    });
    formData.append('autoApprove', 'true');

    console.log('  → Sending import request...');
    
    const response = await fetch(`${API_URL}/stories/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log(`  → Response status: ${response.status} ${response.statusText}`);

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Import failed: ${result.error || 'Unknown error'}`);
    }

    console.log('  → Import result:', JSON.stringify(result, null, 2));
    this.testResults.importRequest = true;
    
    return result;
  }

  async verifyImportedStories(importResult) {
    console.log('  → Fetching imported stories...');
    
    const response = await fetch(`${API_URL}/stories?limit=50`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stories: ${response.status}`);
    }

    const data = await response.json();
    console.log(`  → Found ${data.stories?.length || 0} total stories`);
    
    // Look for our test stories
    const testTitles = ['The whale', 'racoons'];
    const foundStories = [];
    
    if (data.stories) {
      for (const title of testTitles) {
        const story = data.stories.find(s => s.idea_title?.trim() === title.trim());
        if (story) {
          foundStories.push(story);
          console.log(`  → Found "${title}": ID ${story.id}, Date: ${story.coverage_start_date}`);
        } else {
          console.log(`  → Missing "${title}"`);
        }
      }
    }
    
    if (foundStories.length === testTitles.length) {
      this.testResults.storyCreation = true;
      console.log(`  → All ${foundStories.length} test stories found successfully`);
    } else {
      console.log(`  → Warning: Only found ${foundStories.length}/${testTitles.length} test stories`);
    }
    
    return foundStories;
  }

  async testDateDisplay() {
    console.log('  → Testing date display formatting...');
    
    // Load date utilities
    const dateUtilsPath = path.join(__dirname, 'backend/frontend/js/date-utils.js');
    const dateUtilsCode = fs.readFileSync(dateUtilsPath, 'utf8');
    
    // Execute in isolated context
    const module = { exports: {} };
    eval(dateUtilsCode);
    
    const { formatDateSafe } = module.exports;
    
    // Test expected database dates
    const testCases = [
      { original: '3/5/54', expected: '1954-03-05', display: '03/05/1954' },
      { original: '4/1/24', expected: '2024-04-01', display: '04/01/2024' }
    ];
    
    for (const testCase of testCases) {
      const formatted = formatDateSafe(testCase.expected);
      console.log(`  → "${testCase.original}" → "${testCase.expected}" → "${formatted}"`);
      
      if (formatted === testCase.display) {
        console.log('    ✅ Date display correct');
      } else {
        console.log(`    ❌ Expected "${testCase.display}", got "${formatted}"`);
        throw new Error('Date display formatting failed');
      }
    }
    
    this.testResults.dateValidation = true;
  }

  printFinalReport() {
    console.log('\n' + '='.repeat(50));
    console.log('FINAL TEST REPORT');
    console.log('='.repeat(50));
    
    const tests = [
      { name: 'Authentication', result: this.testResults.authentication },
      { name: 'File Reading', result: this.testResults.fileRead },
      { name: 'Import Request', result: this.testResults.importRequest },
      { name: 'Date Validation', result: this.testResults.dateValidation },
      { name: 'Story Creation', result: this.testResults.storyCreation }
    ];
    
    let passed = 0;
    tests.forEach(test => {
      const status = test.result ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${test.name}`);
      if (test.result) passed++;
    });
    
    console.log('\n' + '-'.repeat(30));
    console.log(`OVERALL: ${passed}/${tests.length} tests passed`);
    
    if (passed === tests.length) {
      console.log('🎉 ALL TESTS PASSED - CSV import is working correctly!');
    } else {
      console.log('⚠️  Some tests failed - review the issues above');
    }
    
    console.log('\nExpected Results:');
    console.log('- "The whale" story with date 03/05/1954');
    console.log('- "racoons" story with date 04/01/2024');
    console.log('- No timezone offset issues');
    console.log('- Proper date parsing and display');
  }
}

// Run the test
const tester = new CSVImportTester();
tester.runFullTest().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});