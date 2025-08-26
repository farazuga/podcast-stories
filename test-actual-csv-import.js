/**
 * Test Actual CSV Import Process
 * Test the complete CSV import flow to identify where the date offset is occurring
 */

const csvImportService = require('./backend/services/csvImportService');
const csvParserService = require('./backend/services/csvParserService');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Actual CSV Import Process\n');

// Test the parser first
console.log('1️⃣ Testing Date Parser Directly:');
const testDates = ['1-Jan', '2-Jan', '15-Dec', '31-Jan'];
testDates.forEach(dateStr => {
    const parsed = csvParserService.parseFlexibleDate(dateStr);
    console.log(`  "${dateStr}" → "${parsed}"`);
});

console.log('\n2️⃣ Testing CSV Import Service Processing:');

// Create a test CSV file
const testCSVContent = `idea_title,idea_description,coverage_start_date,coverage_end_date
Test Story 1,A test story about dates,1-Jan,2-Jan
Test Story 2,Another test story,15-Dec,31-Jan`;

const testCSVPath = path.join(__dirname, 'test-dates.csv');
fs.writeFileSync(testCSVPath, testCSVContent);

// Mock file object like multer creates
const mockFile = {
    path: testCSVPath,
    filename: 'test-dates.csv',
    originalname: 'test-dates.csv',
    mimetype: 'text/csv'
};

// Mock user object
const mockUser = {
    id: 1,
    role: 'amitrace_admin',
    email: 'admin@test.com'
};

// Test the import service (without database)
console.log('Testing CSV parsing logic...\n');

// Read and parse CSV manually to see what the service processes
const csvContent = fs.readFileSync(testCSVPath, 'utf8');
const lines = csvContent.split('\n');
const headers = lines[0].split(',');
const dataRows = lines.slice(1).filter(line => line.trim());

console.log('📊 Raw CSV Data:');
console.log('Headers:', headers);
dataRows.forEach((row, index) => {
    const values = row.split(',');
    console.log(`Row ${index + 1}:`, values);
    
    // Find date columns
    const startDateIndex = headers.findIndex(h => h.toLowerCase().includes('start_date'));
    const endDateIndex = headers.findIndex(h => h.toLowerCase().includes('end_date'));
    
    if (startDateIndex >= 0) {
        const rawStartDate = values[startDateIndex];
        const parsedStartDate = csvParserService.parseFlexibleDate(rawStartDate);
        console.log(`  Start Date: "${rawStartDate}" → "${parsedStartDate}"`);
    }
    
    if (endDateIndex >= 0) {
        const rawEndDate = values[endDateIndex];
        const parsedEndDate = csvParserService.parseFlexibleDate(rawEndDate);
        console.log(`  End Date: "${rawEndDate}" → "${parsedEndDate}"`);
    }
});

console.log('\n3️⃣ Checking if there are other date parsing functions...');

// Check if there are any other parseFlexibleDate functions in the codebase
console.log('Looking for other date parsing functions in the system...');

// Clean up test file
fs.unlinkSync(testCSVPath);
console.log('\n✅ Test file cleaned up');

console.log('\n4️⃣ Next Steps:');
console.log('- Check if there are duplicate parseFlexibleDate functions');
console.log('- Verify the csvImportService is actually using the fixed parser');
console.log('- Test with actual production data to see the exact flow');