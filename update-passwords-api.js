const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Database connection - use the same connection string as the backend
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function updatePasswords() {
    try {
        console.log('🔐 Updating test user passwords to "vidpod"...\n');
        
        // Generate hash for "vidpod"
        const newPassword = 'vidpod';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        console.log('✅ Generated hash for "vidpod"');
        console.log(`Hash: ${hashedPassword}`);
        
        // Update the test users
        const testEmails = ['admin@vidpod.com', 'teacher@vidpod.com', 'student@vidpod.com'];
        
        console.log('\n🔄 Updating passwords in database...');
        
        const updateQuery = `
            UPDATE users 
            SET password = $1 
            WHERE email = ANY($2)
            RETURNING email, name, role;
        `;
        
        const result = await pool.query(updateQuery, [hashedPassword, testEmails]);
        
        console.log(`✅ Updated ${result.rows.length} users:`);
        result.rows.forEach(user => {
            console.log(`   - ${user.email} (${user.role})`);
        });
        
        // Verify the update by checking password match
        console.log('\n✅ Verifying passwords...');
        
        for (const email of testEmails) {
            const userQuery = 'SELECT email, password FROM users WHERE email = $1';
            const userResult = await pool.query(userQuery, [email]);
            
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const isValid = await bcrypt.compare('vidpod', user.password);
                console.log(`   ${email}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
            } else {
                console.log(`   ${email}: ❌ USER NOT FOUND`);
            }
        }
        
        console.log('\n🎉 Password update complete!');
        console.log('\n📋 Updated test credentials:');
        console.log('admin@vidpod.com   / vidpod');
        console.log('teacher@vidpod.com / vidpod');
        console.log('student@vidpod.com / vidpod');
        
    } catch (error) {
        console.error('❌ Error updating passwords:', error);
    } finally {
        await pool.end();
    }
}

updatePasswords();