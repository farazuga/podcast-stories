#!/usr/bin/env node

const bcrypt = require('bcrypt');

async function generateHashes() {
    const password = 'rumi&amaml';
    const saltRounds = 10;
    
    try {
        console.log('Generating bcrypt hashes for default accounts...');
        console.log('Password:', password);
        console.log('Salt rounds:', saltRounds);
        console.log('');
        
        const hash1 = await bcrypt.hash(password, saltRounds);
        const hash2 = await bcrypt.hash(password, saltRounds);
        const hash3 = await bcrypt.hash(password, saltRounds);
        
        console.log('Generated hashes:');
        console.log('Admin hash:   ', hash1);
        console.log('Teacher hash: ', hash2);
        console.log('Student hash: ', hash3);
        console.log('');
        
        // Verify the hashes work
        const isValid1 = await bcrypt.compare(password, hash1);
        const isValid2 = await bcrypt.compare(password, hash2);
        const isValid3 = await bcrypt.compare(password, hash3);
        
        console.log('Hash verification:');
        console.log('Admin hash valid:   ', isValid1);
        console.log('Teacher hash valid: ', isValid2);
        console.log('Student hash valid: ', isValid3);
        console.log('');
        
        if (isValid1 && isValid2 && isValid3) {
            console.log('✅ All hashes generated successfully!');
            console.log('');
            console.log('SQL UPDATE statements:');
            console.log(`UPDATE users SET password = '${hash1}' WHERE email = 'admin@vidpod.com';`);
            console.log(`UPDATE users SET password = '${hash2}' WHERE email = 'teacher@vidpod.com';`);
            console.log(`UPDATE users SET password = '${hash3}' WHERE email = 'student@vidpod.com';`);
        } else {
            console.log('❌ Hash verification failed!');
        }
        
    } catch (error) {
        console.error('Error generating hashes:', error);
        process.exit(1);
    }
}

generateHashes();