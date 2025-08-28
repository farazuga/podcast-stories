/**
 * Test Story API Endpoints
 * Quick test to verify story approval API endpoints work
 */

const puppeteer = require('puppeteer');

async function testStoryAPI() {
    console.log('🔍 Testing Story API Endpoints\n');
    
    const browser = await puppeteer.launch({ headless: true });
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        const page = await browser.newPage();
        
        // Login as admin to get token
        console.log('🔐 Getting admin token...');
        await page.goto(`${baseUrl}/index.html`);
        
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ timeout: 10000 });
        
        const token = await page.evaluate(() => localStorage.getItem('token'));
        if (!token) {
            throw new Error('Failed to get admin token');
        }
        console.log('✅ Admin token obtained');
        
        // Test API endpoints
        const endpoints = [
            { url: '/api/stories', label: 'All Stories' },
            { url: '/api/stories/admin/by-status/pending', label: 'Pending Stories' },
            { url: '/api/stories/admin/by-status/approved', label: 'Approved Stories' },
            { url: '/api/stories/admin/by-status/rejected', label: 'Rejected Stories' },
            { url: '/api/stories/admin/by-status/draft', label: 'Draft Stories' }
        ];
        
        console.log('\n📡 Testing API Endpoints:');
        console.log('-'.repeat(50));
        
        for (const endpoint of endpoints) {
            const result = await page.evaluate(async (test, authToken) => {
                try {
                    const response = await fetch(test.url, {
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    });
                    
                    let data;
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        data = await response.json();
                    } else {
                        data = await response.text();
                    }
                    
                    return {
                        status: response.status,
                        ok: response.ok,
                        dataType: typeof data,
                        count: Array.isArray(data) ? data.length : 'Not array',
                        sampleStatuses: Array.isArray(data) && data.length > 0 ? 
                            [...new Set(data.slice(0, 10).map(story => story.approval_status))].join(', ') : 'No data',
                        error: !response.ok ? data : null
                    };
                } catch (error) {
                    return { error: error.message };
                }
            }, endpoint, token);
            
            console.log(`\n${endpoint.label}:`);
            console.log(`   URL: ${endpoint.url}`);
            console.log(`   Status: ${result.status || 'Error'} ${result.ok ? '✅' : '❌'}`);
            console.log(`   Count: ${result.count}`);
            console.log(`   Statuses: ${result.sampleStatuses}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        }
        
        // Test invalid status
        console.log('\n🧪 Testing invalid status...');
        const invalidResult = await page.evaluate(async (authToken) => {
            try {
                const response = await fetch('/api/stories/admin/by-status/invalid', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                const data = await response.text();
                
                return {
                    status: response.status,
                    ok: response.ok,
                    data: data
                };
            } catch (error) {
                return { error: error.message };
            }
        }, token);
        
        console.log(`   Invalid status test: ${invalidResult.status} ${!invalidResult.ok ? '✅ (Expected 400)' : '❌'}`);
        console.log(`   Error message: ${invalidResult.data}`);
        
        await browser.close();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await browser.close();
    }
}

testStoryAPI().catch(console.error);