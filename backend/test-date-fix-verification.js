/**
 * Test Date Fix Verification
 * Verify the date parsing fix works correctly with various formats
 */

const csvParserService = require('./services/csvParserService');

console.log('🧪 Date Parsing Fix Verification Test\n');

// Test comprehensive date formats that might appear in CSV imports
const testCases = [
  // DD-MMM format (most common in the sample CSV)
  { input: '1-Jan', expected: '2025-01-01', description: 'Day-Month format' },
  { input: '15-Dec', expected: '2025-12-15', description: 'Day-Month format' },
  { input: '31-Mar', expected: '2025-03-31', description: 'Day-Month format (end of month)' },
  
  // ISO format
  { input: '2024-01-15', expected: '2024-01-15', description: 'ISO format' },
  { input: '2023-12-31', expected: '2023-12-31', description: 'ISO format (year end)' },
  
  // US format
  { input: '1/15/2024', expected: '2024-01-15', description: 'US format MM/DD/YYYY' },
  { input: '12/31/2023', expected: '2023-12-31', description: 'US format MM/DD/YYYY (year end)' },
  
  // Short year format
  { input: '1/15/24', expected: '2024-01-15', description: 'US format MM/DD/YY' },
  { input: '12/31/23', expected: '2023-12-31', description: 'US format MM/DD/YY (year end)' },
  
  // Edge cases
  { input: '29-Feb', expected: '2025-02-28', description: 'Leap day (non-leap year)' }, // Should adjust
  { input: '', expected: null, description: 'Empty string' },
  { input: 'invalid', expected: null, description: 'Invalid date' },
];

console.log('🎯 Testing Date Parsing Results:\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = csvParserService.parseFlexibleDate(testCase.input);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Input: "${testCase.input}" → Output: "${result}"`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Input: "${testCase.input}"`);
    console.log(`   Expected: "${testCase.expected}"`);
    console.log(`   Got:      "${result}"`);
  }
  console.log();
});

console.log('📊 Test Summary:');
console.log(`✅ Passed: ${passed}/${testCases.length}`);
console.log(`❌ Failed: ${failed}/${testCases.length}`);
console.log(`📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

// Test with actual CSV data sample
console.log('\n🔍 Testing with Sample CSV Data:');

const csvSampleDates = ['1-Jan', '2-Jan', '15-Dec', '31-Jan'];
csvSampleDates.forEach(dateStr => {
  const parsed = csvParserService.parseFlexibleDate(dateStr);
  console.log(`"${dateStr}" → "${parsed}" (Year: 2025)`);
});

// Verify timezone independence
console.log('\n🌍 Timezone Independence Check:');
const testDate = '2024-01-15';
const parsed = csvParserService.parseFlexibleDate(testDate);
console.log(`Input: "${testDate}"`);
console.log(`Parsed: "${parsed}"`);
console.log(`Timezone offset: ${new Date().getTimezoneOffset()} minutes`);
console.log(`Same day: ${testDate === parsed ? '✅ YES' : '❌ NO'}`);

console.log('\n🎉 Date Fix Verification Complete!');

if (failed === 0) {
  console.log('✅ All tests passed - Date parsing fix is working correctly!');
} else {
  console.log('⚠️ Some tests failed - Additional fixes may be needed');
}