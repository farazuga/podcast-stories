/**
 * Direct test of token creation without going through the API
 * This will help identify if the issue is in token-service.js itself
 */

const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function testDirectTokenCreation() {
    console.log('🧪 Direct Token Creation Test\n');
    console.log('='.repeat(50));
    
    try {
        // Step 1: Check if we can connect to database
        console.log('\n🔌 Step 1: Testing database connection');
        console.log('-'.repeat(30));
        
        const connectionTest = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Database connection successful');
        console.log('   Current time:', connectionTest.rows[0].current_time);
        
        // Step 2: Check if password_reset_tokens table exists
        console.log('\n📋 Step 2: Checking table structure');
        console.log('-'.repeat(30));
        
        const tableCheck = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'password_reset_tokens'
            ORDER BY ordinal_position
        `);
        
        if (tableCheck.rows.length === 0) {
            console.log('❌ password_reset_tokens table does not exist!');
            return false;
        }
        
        console.log('✅ password_reset_tokens table found with columns:');
        tableCheck.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
        });
        
        // Step 3: Check if admin user exists
        console.log('\n👤 Step 3: Finding admin user');
        console.log('-'.repeat(30));
        
        const userCheck = await pool.query(
            'SELECT id, email, username FROM users WHERE email = $1',
            ['admin@vidpod.com']
        );
        
        if (userCheck.rows.length === 0) {
            console.log('❌ Admin user (admin@vidpod.com) not found!');
            return false;
        }
        
        const user = userCheck.rows[0];
        console.log(`✅ Admin user found: ID ${user.id}, Email: ${user.email}`);
        
        // Step 4: Clear existing tokens for this user
        console.log('\n🧹 Step 4: Clearing existing tokens');
        console.log('-'.repeat(30));
        
        const clearResult = await pool.query(
            'DELETE FROM password_reset_tokens WHERE user_id = $1',
            [user.id]
        );
        console.log(`✅ Cleared ${clearResult.rowCount} existing tokens`);
        
        // Step 5: Create a new token
        console.log('\n🔑 Step 5: Creating new token');
        console.log('-'.repeat(30));
        
        const token = generateToken();
        const expiresAt = new Date(Date.now() + (1 * 60 * 60 * 1000)); // 1 hour
        
        console.log(`Generated token: ${token.substring(0, 16)}...`);
        console.log(`Expires at: ${expiresAt}`);
        
        const insertResult = await pool.query(`
            INSERT INTO password_reset_tokens (user_id, token, expires_at, used, created_at) 
            VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
            RETURNING id, created_at
        `, [user.id, token, expiresAt]);
        
        console.log('✅ Token inserted successfully');
        console.log(`   Token ID: ${insertResult.rows[0].id}`);
        console.log(`   Created at: ${insertResult.rows[0].created_at}`);
        
        // Step 6: Immediately try to validate the token
        console.log('\n🔍 Step 6: Validating the token');
        console.log('-'.repeat(30));
        
        const validateResult = await pool.query(`
            SELECT 
                prt.id,
                prt.user_id,
                prt.expires_at,
                prt.used,
                prt.created_at,
                u.email,
                u.username,
                u.name,
                u.role
            FROM password_reset_tokens prt
            JOIN users u ON prt.user_id = u.id
            WHERE prt.token = $1
        `, [token]);
        
        if (validateResult.rows.length === 0) {
            console.log('❌ Token not found during validation!');
            return false;
        }
        
        const tokenData = validateResult.rows[0];
        console.log('✅ Token found during validation');
        console.log(`   User: ${tokenData.email}`);
        console.log(`   Expires: ${tokenData.expires_at}`);
        console.log(`   Used: ${tokenData.used}`);
        
        // Step 7: Check expiration logic
        const now = new Date();
        const expiresAtDate = new Date(tokenData.expires_at);
        const isExpired = now > expiresAtDate;
        
        console.log(`   Current time: ${now}`);
        console.log(`   Is expired: ${isExpired}`);
        
        // Step 8: Test the actual API validation
        console.log('\n🌐 Step 8: Testing API validation');
        console.log('-'.repeat(30));
        
        const { spawn } = require('child_process');
        const curl = spawn('curl', [
            '-s', 
            `https://podcast-stories-production.up.railway.app/api/password-reset/verify/${token}`
        ]);
        
        let apiResponse = '';
        curl.stdout.on('data', (data) => {
            apiResponse += data.toString();
        });
        
        await new Promise((resolve) => {
            curl.on('close', resolve);
        });
        
        console.log('API response:', apiResponse);
        
        try {
            const parsedResponse = JSON.parse(apiResponse);
            if (parsedResponse.valid) {
                console.log('✅ API validation successful!');
            } else {
                console.log('❌ API validation failed:', parsedResponse.error);
            }
        } catch (e) {
            console.log('❌ Could not parse API response');
        }
        
        console.log('\n📊 Test Summary');
        console.log('='.repeat(50));
        console.log('✅ Database connection: Working');
        console.log('✅ Table structure: Correct');
        console.log('✅ User lookup: Working');
        console.log('✅ Token creation: Working');
        console.log('✅ Token validation query: Working');
        console.log('❓ API validation: See above');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
        return false;
    } finally {
        await pool.end();
    }
}

// Load environment variables
require('dotenv').config();

if (require.main === module) {
    testDirectTokenCreation().then(success => {
        console.log(success ? '\n✅ Direct test completed!' : '\n❌ Direct test failed!');
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = testDirectTokenCreation;