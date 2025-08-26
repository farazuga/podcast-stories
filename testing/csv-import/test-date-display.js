/**
 * Date Display Formatting Test
 * Test the frontend date display utilities
 */

// Load the date utilities (simulate browser environment)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the date-utils.js file
const dateUtilsPath = path.join(__dirname, 'backend/frontend/js/date-utils.js');
const dateUtilsCode = fs.readFileSync(dateUtilsPath, 'utf8');

// Create a simulated browser environment
const window = {};
const module = { exports: {} };

// Execute the date utilities code
eval(dateUtilsCode);

// Extract the functions
const { formatDateSafe, formatDateSafeWithOptions, isValidDateString } = module.exports;

console.log('=== Date Display Formatting Test ===\n');

// Test dates from CSV parsing (in database storage format YYYY-MM-DD)
const testDates = [
  '1954-03-05',  // From "3/5/54" 
  '2024-04-01',  // From "4/1/24"
  '2025-01-01',  // Additional test
  '1999-12-31',  // Edge case
  '2005-06-15'   // Mid-range test
];

console.log('Testing formatDateSafe() function:');
console.log('==================================');

testDates.forEach((dateStr, index) => {
  console.log(`\nTest ${index + 1}: "${dateStr}"`);
  
  const isValid = isValidDateString(dateStr);
  const formatted = formatDateSafe(dateStr);
  const formattedLong = formatDateSafeWithOptions(dateStr, { month: 'long' });
  const formattedShort = formatDateSafeWithOptions(dateStr, { month: 'short' });
  
  console.log(`  Input:     ${dateStr}`);
  console.log(`  Valid:     ${isValid}`);
  console.log(`  Default:   ${formatted}`);
  console.log(`  Long:      ${formattedLong}`);
  console.log(`  Short:     ${formattedShort}`);
});

console.log('\n=== Expected Display Results ===');
console.log('1954-03-05 → 03/05/1954 (March 5, 1954)');
console.log('2024-04-01 → 04/01/2024 (April 1, 2024)');

console.log('\n=== Timezone Safety Check ===');
console.log('Using direct string parsing instead of new Date()');
console.log('This prevents the "off by one day" timezone issue');
console.log('All dates should display exactly as expected without offset');

// Test edge cases
console.log('\n=== Edge Case Tests ===');

const edgeCases = [
  '',           // Empty string
  null,         // Null value
  undefined,    // Undefined value
  'invalid',    // Invalid date
  '2024-13-01', // Invalid month
  '2024-02-30'  // Invalid day
];

edgeCases.forEach((testCase, index) => {
  try {
    const result = formatDateSafe(testCase);
    console.log(`Edge ${index + 1}: ${JSON.stringify(testCase)} → "${result}"`);
  } catch (error) {
    console.log(`Edge ${index + 1}: ${JSON.stringify(testCase)} → ERROR: ${error.message}`);
  }
});