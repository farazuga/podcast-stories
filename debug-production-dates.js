/**
 * Debug Production Dates
 * Check what's actually happening with dates in production
 */

console.log('🔍 Debugging Production Date Issue\n');

// First, let's check if there might be any database-level date conversion
// happening when dates are stored or retrieved

console.log('1️⃣ Testing Date Conversion Scenarios:\n');

// Test different ways dates might be getting converted
const testDate = '2025-01-01';
console.log(`Original date string: "${testDate}"`);

// Test what happens when we create a Date object and convert back
const dateObj1 = new Date(testDate);
console.log(`new Date("${testDate}"):`, dateObj1);
console.log(`  .toISOString():`, dateObj1.toISOString());
console.log(`  .toISOString().split('T')[0]:`, dateObj1.toISOString().split('T')[0]);
console.log(`  .toLocaleDateString():`, dateObj1.toLocaleDateString());
console.log(`  .getFullYear():`, dateObj1.getFullYear());
console.log(`  .getMonth() + 1:`, dateObj1.getMonth() + 1);
console.log(`  .getDate():`, dateObj1.getDate());

console.log('\n2️⃣ Testing with Different Timezone Scenarios:\n');

// Test with explicit timezone handling
const dateObj2 = new Date(testDate + 'T00:00:00');
console.log(`new Date("${testDate}T00:00:00"):`, dateObj2);
console.log(`  .toISOString().split('T')[0]:`, dateObj2.toISOString().split('T')[0]);

const dateObj3 = new Date(testDate + 'T12:00:00Z');
console.log(`new Date("${testDate}T12:00:00Z"):`, dateObj3);
console.log(`  .toISOString().split('T')[0]:`, dateObj3.toISOString().split('T')[0]);

console.log('\n3️⃣ Current Timezone Info:');
const now = new Date();
console.log(`Current timezone offset: ${now.getTimezoneOffset()} minutes`);
console.log(`Current timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

console.log('\n4️⃣ Checking if PostgreSQL might be doing date conversion:\n');
console.log('PostgreSQL stores DATE type as YYYY-MM-DD without timezone');
console.log('But if the application is converting dates before/after database operations...');

console.log('\n5️⃣ Possible Issues to Check:');
console.log('❓ Database query might be doing date conversion');
console.log('❓ Frontend display might be converting dates');
console.log('❓ Some other date parsing function might still exist');
console.log('❓ The fix might not have deployed correctly');

console.log('\n6️⃣ Next Steps:');
console.log('- Check the actual database content directly');
console.log('- Verify which version of csvParserService is running in production');
console.log('- Test the frontend date display logic');
console.log('- Check if there are any SQL queries that convert dates');