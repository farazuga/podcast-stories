/**
 * Test Date Offset Bug
 * Investigate the one-day offset issue in date parsing
 */

const csvParserService = require('./services/csvParserService');

console.log('🐛 Testing Date Offset Bug\n');

// Test various date formats that might cause issues
const testDates = [
    '1-Jan',      // Day-Month format (most common in CSV)
    '15-Dec',     // Another Day-Month format
    '2024-01-15', // ISO format
    '1/15/2024',  // US format
    '15/1/2024',  // European format
];

console.log('📅 Testing Date Parsing Results:');
testDates.forEach(dateStr => {
    const parsed = csvParserService.parseFlexibleDate(dateStr);
    console.log(`"${dateStr}" → "${parsed}"`);
});

console.log('\n🔍 Investigating the "1-Jan" parsing process step by step...\n');

// Let's manually trace through the parsing logic for "1-Jan"
const testDate = '1-Jan';
const cleaned = testDate.trim();

// Handle formats like "1-Jan", "2-Feb", etc.
const monthMap = {
  'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
  'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
  'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
};

// Pattern: "1-Jan", "15-Dec", etc.
const dayMonthPattern = /^(\d{1,2})-([A-Za-z]{3})$/;
const match = cleaned.match(dayMonthPattern);

if (match) {
  const day = match[1].padStart(2, '0');
  const monthName = match[2];
  const monthNum = monthMap[monthName];
  
  if (monthNum) {
    // Default to current year for month/day only dates
    const currentYear = new Date().getFullYear();
    const result = `${currentYear}-${monthNum}-${day}`;
    
    console.log('Step 1 - Pattern matching:');
    console.log(`  Input: "${testDate}"`);
    console.log(`  Day: "${day}"`);
    console.log(`  Month name: "${monthName}"`);
    console.log(`  Month number: "${monthNum}"`);
    console.log(`  Current year: ${currentYear}`);
    console.log(`  Result: "${result}"`);
    
    // Test what happens when we create a Date object with this
    console.log('\nStep 2 - Date object creation:');
    const dateObj = new Date(result);
    console.log(`  new Date("${result}"): ${dateObj}`);
    console.log(`  Date.toISOString(): ${dateObj.toISOString()}`);
    console.log(`  Date.toISOString().split('T')[0]: ${dateObj.toISOString().split('T')[0]}`);
    
    // Check timezone offset
    console.log('\nStep 3 - Timezone analysis:');
    console.log(`  Local timezone offset: ${dateObj.getTimezoneOffset()} minutes`);
    console.log(`  Local date: ${dateObj.toLocaleDateString()}`);
    console.log(`  UTC date: ${dateObj.toISOString().split('T')[0]}`);
  }
}

console.log('\n🔧 Testing timezone-safe parsing approach...');

// Test a timezone-safe approach
function parseFlexibleDateFixed(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const cleaned = dateStr.trim();
  
  // Handle formats like "1-Jan", "2-Feb", etc.
  const monthMap = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  // Pattern: "1-Jan", "15-Dec", etc.
  const dayMonthPattern = /^(\d{1,2})-([A-Za-z]{3})$/;
  const match = cleaned.match(dayMonthPattern);
  
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthName = match[2];
    const monthNum = monthMap[monthName];
    
    if (monthNum) {
      // Default to current year for month/day only dates
      const currentYear = new Date().getFullYear();
      // Return directly without creating Date object
      return `${currentYear}-${monthNum}-${day}`;
    }
  }
  
  // For other formats, construct date more carefully
  const parsedDate = new Date(cleaned);
  if (!isNaN(parsedDate.getTime())) {
    // Use local date components instead of UTC to avoid timezone offset
    const year = parsedDate.getFullYear();
    const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = parsedDate.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

console.log('\n📊 Comparison of Original vs Fixed Parsing:');
testDates.forEach(dateStr => {
    const original = csvParserService.parseFlexibleDate(dateStr);
    const fixed = parseFlexibleDateFixed(dateStr);
    const same = original === fixed;
    
    console.log(`"${dateStr}"`);
    console.log(`  Original: "${original}"`);
    console.log(`  Fixed:    "${fixed}"`);
    console.log(`  Same:     ${same ? '✅' : '❌'}`);
    console.log('');
});

console.log('🎯 Bug Analysis Complete');