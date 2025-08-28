/**
 * Quick Story Rejection Test
 * Simple test to verify the API fix works
 */

const puppeteer = require('puppeteer');

async function quickRejectionTest() {
    console.log('⚡ Quick Story Rejection API Test\n');
    
    const browser = await puppeteer.launch({ headless: true });
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        const page = await browser.newPage();
        
        // Login and get token
        await page.goto(`${baseUrl}/index.html`);
        await page.waitForSelector('#email', { timeout: 5000 });
        
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ timeout: 10000 });
        
        const token = await page.evaluate(() => localStorage.getItem('token'));
        console.log('✅ Admin token obtained');
        
        // Test the rejection API directly
        const testResult = await page.evaluate(async (authToken) => {
            try {
                // Get a story to test with
                const storiesResponse = await fetch('/api/stories', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const stories = await storiesResponse.json();
                const testStory = stories.find(s => s.approval_status === 'approved');
                
                if (!testStory) {
                    return { error: 'No approved stories found' };
                }
                
                // Try to reject it
                const rejectionResponse = await fetch(`/api/stories/${testStory.id}/reject`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        notes: 'Quick test rejection'
                    })
                });
                
                let rejectionData;
                try {
                    rejectionData = await rejectionResponse.json();
                } catch {
                    rejectionData = await rejectionResponse.text();
                }
                
                return {
                    storyTitle: testStory.idea_title,
                    originalStatus: testStory.approval_status,
                    rejectionStatus: rejectionResponse.status,
                    rejectionSuccess: rejectionResponse.ok,
                    rejectionData: rejectionData,
                    newStatus: rejectionData?.story?.approval_status
                };
                
            } catch (error) {
                return { error: error.message };
            }
        }, token);
        
        await browser.close();
        
        console.log('📊 Test Results:');
        console.log(`   Test story: "${testResult.storyTitle}"`);
        console.log(`   Original status: ${testResult.originalStatus}`);
        console.log(`   API response: ${testResult.rejectionStatus} ${testResult.rejectionSuccess ? '✅' : '❌'}`);
        
        if (testResult.rejectionSuccess) {
            console.log(`   New status: ${testResult.newStatus}`);
            console.log('   🎉 SUCCESS! Story rejection is now working!');
            console.log('   ✅ Backend API correctly accepts rejection of approved stories');
            console.log('   ✅ Business logic fix deployed successfully');
        } else {
            console.log(`   Error: ${testResult.rejectionData?.error || testResult.rejectionData}`);
            console.log('   ❌ API still has issues - may need more time for deployment');
        }
        
        return testResult.rejectionSuccess;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await browser.close();
        return false;
    }
}

quickRejectionTest().then(success => {
    process.exit(success ? 0 : 1);
}).catch(() => process.exit(1));