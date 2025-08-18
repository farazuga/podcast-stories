const bcrypt = require('bcrypt');

// Script to generate bcrypt hash for "vidpod" password
async function generatePasswordHash() {
    try {
        const password = 'vidpod';
        const saltRounds = 10;
        
        console.log('🔐 Generating bcrypt hash for "vidpod" password...');
        const hash = await bcrypt.hash(password, saltRounds);
        
        console.log('✅ Password hash generated:');
        console.log(hash);
        
        console.log('\n📋 SQL to update test user passwords:');
        console.log('-- Update all test user passwords to "vidpod"');
        
        const updateSQL = `
UPDATE users 
SET password = '${hash}' 
WHERE email IN ('admin@vidpod.com', 'teacher@vidpod.com', 'student@vidpod.com');
        `.trim();
        
        console.log(updateSQL);
        
        console.log('\n🧪 Test credentials after update:');
        console.log('admin@vidpod.com   / vidpod');
        console.log('teacher@vidpod.com / vidpod');
        console.log('student@vidpod.com / vidpod');
        
        // Test the hash
        console.log('\n✅ Verifying hash works:');
        const isValid = await bcrypt.compare('vidpod', hash);
        console.log('Hash verification:', isValid ? 'SUCCESS' : 'FAILED');
        
    } catch (error) {
        console.error('❌ Error generating hash:', error);
    }
}

generatePasswordHash();