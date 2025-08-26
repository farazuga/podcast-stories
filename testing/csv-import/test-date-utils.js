/**
 * Test Date Utils - Verify timezone-safe date formatting works correctly
 */

const dateUtils = require('./frontend/js/date-utils.js');

console.log('🧪 Testing Date Utils Functions\n');

const testDates = [
    '2025-01-01',  // New Year
    '2025-02-28',  // End of February (non-leap year)
    '2025-12-31',  // End of year
    '2024-02-29',  // Leap day
    '2025-07-04',  // July 4th
];

console.log('1️⃣ Testing formatDateSafe():');
testDates.forEach(dateStr => {
    const formatted = dateUtils.formatDateSafe(dateStr);
    console.log(`  "${dateStr}" → "${formatted}"`);
});

console.log('\n2️⃣ Testing formatDateSafeWithOptions() with long month:');
testDates.forEach(dateStr => {
    const formatted = dateUtils.formatDateSafeWithOptions(dateStr, { month: 'long' });
    console.log(`  "${dateStr}" → "${formatted}"`);
});

console.log('\n3️⃣ Testing formatDateSafeWithOptions() with short month:');
testDates.forEach(dateStr => {
    const formatted = dateUtils.formatDateSafeWithOptions(dateStr, { month: 'short' });
    console.log(`  "${dateStr}" → "${formatted}"`);
});

console.log('\n4️⃣ Comparison with problematic new Date() approach:');
console.log('Testing how new Date() would format these same dates (shows the problem):');
testDates.forEach(dateStr => {
    const problematic = new Date(dateStr).toLocaleDateString();
    const safe = dateUtils.formatDateSafe(dateStr);
    const same = problematic === safe;
    console.log(`  "${dateStr}"`);
    console.log(`    new Date().toLocaleDateString(): "${problematic}"`);
    console.log(`    formatDateSafe(): "${safe}"`);
    console.log(`    Same result: ${same ? '✅' : '❌'}`);
    console.log('');
});

console.log('🎯 Key Insight:');
console.log('The new Date() approach causes timezone conversion issues.');
console.log('Our formatDateSafe() avoids this by parsing date components directly.');

console.log('\n✅ Date Utils Test Complete');