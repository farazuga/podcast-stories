/**
 * CSV Date Parsing Test
 * Test the date parsing logic with actual CSV file dates
 */

const csvParserService = require('./backend/services/csvParserService.js');

console.log('=== CSV Date Parsing Test ===\n');

// Test dates from the actual CSV file
const testDates = [
  '3/5/54',   // March 5, 1954 (from "The whale" story)
  '4/1/24',   // April 1, 2024 (from "racoons" story)
  '1/1/25',   // January 1, 2025 (additional test)
  '12/31/99', // December 31, 1999 (edge case)
  '6/15/05'   // June 15, 2005 (mid-range test)
];

console.log('Testing parseFlexibleDate() function:');
console.log('=====================================');

testDates.forEach((dateStr, index) => {
  console.log(`\nTest ${index + 1}: "${dateStr}"`);
  
  const parsed = csvParserService.parseFlexibleDate(dateStr);
  const report = csvParserService.createDateParsingReport(dateStr, parsed);
  
  console.log(`  Original: ${report.original}`);
  console.log(`  Parsed:   ${report.parsed}`);
  console.log(`  Success:  ${report.success}`);
  console.log(`  Year:     ${report.detectedYear}`);
  console.log(`  Formats:  ${report.possibleFormats.join(', ')}`);
  
  if (!report.success && report.recommendations.length > 0) {
    console.log(`  Tips:     ${report.recommendations.join(', ')}`);
  }
});

console.log('\n=== Expected Results ===');
console.log('3/5/54  → 1954-03-05 (March 5, 1954)');
console.log('4/1/24  → 2024-04-01 (April 1, 2024)');
console.log('1/1/25  → 2025-01-01 (January 1, 2025)');
console.log('12/31/99 → 1999-12-31 (December 31, 1999)');
console.log('6/15/05 → 2005-06-15 (June 15, 2005)');

console.log('\n=== Year Conversion Logic ===');
console.log('Two-digit years:');
console.log('- 00-49: Converts to 20xx (2000-2049)');
console.log('- 50-99: Converts to 19xx (1950-1999)');
console.log('This matches common business logic for date parsing');