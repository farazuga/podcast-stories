/**
 * Test to generate a real token and immediately validate it
 * This will help identify if the issue is in token generation or validation
 */

// Using built-in fetch (Node 18+) or fallback to child_process for curl

const baseUrl = 'https://podcast-stories-production.up.railway.app';

async function testRealTokenFlow() {
    console.log('🧪 Testing Real Token Generation and Validation\n');
    console.log('='.repeat(60));
    
    try {
        // Step 1: Create a password reset request
        console.log('\n📧 Step 1: Creating password reset request');
        console.log('-'.repeat(40));
        
        const resetResponse = await fetch(`${baseUrl}/api/password-reset/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@vidpod.com' })
        });
        
        const resetData = await resetResponse.json();
        console.log('Reset request response:', resetData);
        
        if (!resetResponse.ok) {
            throw new Error(`Reset request failed: ${resetData.error}`);
        }
        
        // Step 2: Wait a moment for token creation
        console.log('\n⏱️  Step 2: Waiting for token creation...');
        console.log('-'.repeat(40));
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 3: Try to access an admin endpoint to check token debug
        // Since we can't directly see tokens, let's check if there's server logs
        console.log('\n🔍 Step 3: Testing with common fake tokens to understand validation behavior');
        console.log('-'.repeat(40));
        
        const testTokens = [
            'fake-token',
            'invalid-token-123',
            '1234567890abcdef1234567890abcdef12345678',  // 40-char hex
            '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234'  // 64-char hex
        ];
        
        for (const testToken of testTokens) {
            const verifyResponse = await fetch(`${baseUrl}/api/password-reset/verify/${testToken}`);
            const verifyData = await verifyResponse.json();
            
            console.log(`Token: ${testToken.substring(0, 16)}... | Status: ${verifyResponse.status} | Error: ${verifyData.error}`);
        }
        
        // Step 4: Check if we can find clues about token format
        console.log('\n🔧 Step 4: Analyzing token validation patterns');
        console.log('-'.repeat(40));
        
        // The token service generates 32 bytes = 64 hex characters
        // Let's test with a properly formatted but fake 64-char hex token
        const properlyFormattedFakeToken = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234';
        
        const properResponse = await fetch(`${baseUrl}/api/password-reset/verify/${properlyFormattedFakeToken}`);
        const properData = await properResponse.json();
        
        console.log(`Properly formatted token test:`);
        console.log(`Token: ${properlyFormattedFakeToken}`);
        console.log(`Status: ${properResponse.status}`);
        console.log(`Response: ${JSON.stringify(properData)}`);
        
        // Step 5: Make multiple reset requests to see if tokens are actually being created
        console.log('\n🔄 Step 5: Testing multiple rapid reset requests');
        console.log('-'.repeat(40));
        
        for (let i = 0; i < 3; i++) {
            const rapidResponse = await fetch(`${baseUrl}/api/password-reset/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'admin@vidpod.com' })
            });
            
            const rapidData = await rapidResponse.json();
            console.log(`Request ${i+1}: Status ${rapidResponse.status} | Message: ${rapidData.message}`);
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('\n📋 Analysis Summary');
        console.log('='.repeat(60));
        console.log('✅ Password reset requests are working');
        console.log('✅ Token validation endpoint is responding');
        console.log('❓ Cannot directly verify token creation without database access');
        console.log('❓ Need to check if tokens are being saved to database correctly');
        
        console.log('\n🔍 LIKELY ISSUES:');
        console.log('1. Tokens are not being saved to database (constraint or connection issue)');
        console.log('2. Token format mismatch between generation and validation');
        console.log('3. Database timezone issues causing immediate expiration');
        console.log('4. Email service is not receiving the correct token');
        
        console.log('\n💡 NEXT STEPS:');
        console.log('1. Check server logs during token creation');
        console.log('2. Verify database connection and table structure');
        console.log('3. Test with a real email to see what token format is sent');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

if (require.main === module) {
    testRealTokenFlow().then(success => {
        console.log(success ? '\n✅ Analysis completed!' : '\n❌ Analysis failed!');
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = testRealTokenFlow;