const puppeteer = require('puppeteer');

async function testIfFixDeployed() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    console.log('🧪 Testing if Railway has deployed the fix...\n');
    
    try {
        // Login as admin
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'rumi&amaml');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ Logged in as admin');
        
        // Navigate to stories page
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('✅ Stories page loaded');
        
        // Test the deployment
        const testResults = await page.evaluate(() => {
            return {
                loadStoriesExists: typeof window.loadStories === 'function',
                displayStoriesExists: typeof window.displayStories === 'function',
                storiesInDOM: document.getElementById('storiesGrid')?.children.length || 0,
                allStoriesCount: window.allStories ? window.allStories.length : 'undefined',
                apiUrl: window.API_URL,
                token: !!localStorage.getItem('token')
            };
        });
        
        console.log('📊 Railway Deployment Test Results:');
        console.log(`✅ loadStories function exists: ${testResults.loadStoriesExists}`);
        console.log(`✅ displayStories function exists: ${testResults.displayStoriesExists}`);
        console.log(`📚 Stories in DOM: ${testResults.storiesInDOM}`);
        console.log(`🔑 Token exists: ${testResults.token}`);
        console.log(`🌐 API URL: ${testResults.apiUrl}`);
        
        if (testResults.loadStoriesExists && testResults.displayStoriesExists) {
            console.log('\n🎉 SUCCESS! Railway has deployed the fix!');
            
            if (testResults.storiesInDOM > 0) {
                console.log('✅ Stories are already loaded and displayed');
                console.log(`📚 Showing ${testResults.storiesInDOM} stories`);
            } else {
                console.log('🔄 Functions exist but stories not loaded yet. Testing manual trigger...');
                
                // Manually trigger loadStories
                await page.evaluate(() => {
                    if (typeof window.loadStories === 'function') {
                        window.loadStories();
                    }
                });
                
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const afterManualTrigger = await page.evaluate(() => {
                    return {
                        storiesInDOM: document.getElementById('storiesGrid')?.children.length || 0,
                        allStoriesCount: window.allStories ? window.allStories.length : 'undefined',
                        resultsText: document.getElementById('resultsCount')?.textContent || 'Not found'
                    };
                });
                
                console.log(`📚 Stories after manual trigger: ${afterManualTrigger.storiesInDOM}`);
                console.log(`📊 Stories loaded in memory: ${afterManualTrigger.allStoriesCount}`);
                console.log(`📝 Results text: ${afterManualTrigger.resultsText}`);
                
                if (afterManualTrigger.storiesInDOM > 0) {
                    console.log('✅ Manual trigger works - stories loading correctly!');
                } else {
                    console.log('❌ Manual trigger didn\'t work - may need API investigation');
                }
            }
            
        } else {
            console.log('\n❌ Functions still missing - Railway hasn\'t deployed yet');
            console.log('⏳ Need to wait longer or clear browser cache');
        }
        
        // Test browser cache vs fresh load
        console.log('\n🔄 Testing cache vs fresh load...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { 
            waitUntil: 'networkidle2' 
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const afterRefresh = await page.evaluate(() => {
            return {
                loadStoriesExists: typeof window.loadStories === 'function',
                storiesInDOM: document.getElementById('storiesGrid')?.children.length || 0
            };
        });
        
        console.log(`🔄 After refresh - loadStories exists: ${afterRefresh.loadStoriesExists}`);
        console.log(`🔄 After refresh - stories in DOM: ${afterRefresh.storiesInDOM}`);
        
        // Final assessment
        console.log('\n📋 FINAL ASSESSMENT:');
        
        if (testResults.loadStoriesExists && afterRefresh.loadStoriesExists) {
            console.log('🎉 SUCCESS: Railway has deployed the fix!');
            console.log('✅ Browse Stories functionality is now working');
            
            if (testResults.storiesInDOM > 0 || afterRefresh.storiesInDOM > 0) {
                console.log('✅ Stories are loading automatically');
            } else {
                console.log('⚠️ Functions exist but automatic loading may need attention');
            }
        } else {
            console.log('❌ Deployment still pending or browser cache issue');
            console.log('💡 Try hard refresh (Ctrl+F5) or clear browser cache');
        }
        
        console.log('\n🔍 Browser staying open for manual verification...');
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testIfFixDeployed().catch(console.error);