// Debug script to check Railway environment variables
console.log('🔍 Environment Variable Debug');
console.log('================================');

// Critical environment variables for the app
const criticalVars = [
  'DATABASE_URL',
  'JWT_SECRET', 
  'NODE_ENV',
  'PORT'
];

console.log('📋 Critical Variables:');
criticalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const display = value ? (varName === 'JWT_SECRET' || varName === 'DATABASE_URL' ? '[HIDDEN]' : value) : 'MISSING';
  console.log(`  ${status} ${varName}: ${display}`);
});

console.log('\n🌐 All Environment Variables:');
const allVars = Object.keys(process.env).sort();
allVars.forEach(key => {
  if (key.includes('RAILWAY') || key.includes('DATABASE') || key.includes('JWT') || key.includes('PORT')) {
    const value = process.env[key];
    const display = (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('URL')) ? '[HIDDEN]' : value;
    console.log(`  - ${key}: ${display}`);
  }
});

console.log('\n🔧 System Info:');
console.log(`  - Node.js Version: ${process.version}`);
console.log(`  - Platform: ${process.platform}`);
console.log(`  - Working Directory: ${process.cwd()}`);
console.log(`  - Script Location: ${__filename}`);

console.log('\n💡 Recommendations:');
if (!process.env.DATABASE_URL) {
  console.log('  ❌ Set DATABASE_URL environment variable');
}
if (!process.env.JWT_SECRET) {
  console.log('  ❌ Set JWT_SECRET environment variable');
}
if (!process.env.PORT) {
  console.log('  ⚠️  PORT will default to 3000 (Railway auto-assigns)');
}

console.log('\n✨ Environment check completed!');
process.exit(0);