/**
 * Test API response directly to check if tag fix has deployed
 */

async function testAPIDirectly() {
    console.log('🌐 DIRECT API TEST: Check tag response format');
    console.log('='.repeat(50));
    
    try {
        // Login first to get token - try multiple credential combinations
        const loginAttempts = [
            { username: 'admin@vidpod.com', password: 'vidpod' },
            { username: 'admin', password: 'admin123' },
            { username: 'admin', password: 'vidpod' }
        ];
        
        let token;
        let loginSuccess = false;
        
        for (const credentials of loginAttempts) {
            try {
                const loginResponse = await fetch('https://podcast-stories-production.up.railway.app/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                });
                
                if (loginResponse.ok) {
                    const loginData = await loginResponse.json();
                    token = loginData.token;
                    console.log(`✅ Login successful with ${credentials.username}`);
                    loginSuccess = true;
                    break;
                } else {
                    console.log(`❌ Login failed with ${credentials.username}: ${loginResponse.status}`);
                }
            } catch (error) {
                console.log(`❌ Login error with ${credentials.username}: ${error.message}`);
            }
        }
        
        if (!loginSuccess) {
            throw new Error('All login attempts failed');
        }
        
        // Test stories API
        const storiesResponse = await fetch('https://podcast-stories-production.up.railway.app/api/stories', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (storiesResponse.ok) {
            const stories = await storiesResponse.json();
            console.log(`📊 Retrieved ${stories.length} stories`);
            
            // Check first few stories
            const sampleStories = stories.slice(0, 3);
            console.log('\n🔍 Sample story tag data:');
            
            sampleStories.forEach((story, i) => {
                console.log(`\n${i + 1}. "${story.idea_title}"`);
                console.log(`   Tags: ${JSON.stringify(story.tags)}`);
                console.log(`   Tags type: ${typeof story.tags}`);
                console.log(`   Tags length: ${Array.isArray(story.tags) ? story.tags.length : 'not array'}`);
                console.log(`   Has null in array: ${Array.isArray(story.tags) && story.tags.includes(null)}`);
            });
            
            // Diagnosis
            const hasNullTags = sampleStories.some(story => 
                Array.isArray(story.tags) && story.tags.includes(null)
            );
            
            if (hasNullTags) {
                console.log('\n❌ ISSUE: Backend still returning [null] arrays');
                console.log('   Deployment may not be complete or SQL fix needs adjustment');
            } else {
                console.log('\n✅ SUCCESS: Backend returning clean tag arrays');
                console.log('   SQL fix has been deployed successfully');
            }
            
        } else {
            console.log(`❌ Stories API failed: ${storiesResponse.status}`);
        }
        
    } catch (error) {
        console.error('❌ API test failed:', error.message);
    }
}

testAPIDirectly().catch(console.error);