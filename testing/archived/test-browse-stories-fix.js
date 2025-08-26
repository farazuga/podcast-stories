const puppeteer = require('puppeteer');

async function testBrowseStoriesFix() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    console.log('🧪 Testing Browse Stories Fix in Production...\n');
    
    try {
        // Login as admin
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'rumi&amaml');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ Logged in as admin');
        
        // Navigate directly to stories page
        console.log('📖 Navigating to Browse Stories...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('✅ Stories page loaded');
        
        // Test the fix
        const testResults = await page.evaluate(() => {
            const results = {
                loadStoriesExists: typeof window.loadStories === 'function',
                displayStoriesExists: typeof window.displayStories === 'function',
                storiesGridExists: !!document.getElementById('storiesGrid'),
                allStoriesCount: window.allStories ? window.allStories.length : 'undefined',
                storiesInDOM: 0,
                apiResponse: null
            };
            
            // Count actual story elements in DOM
            const container = document.getElementById('storiesGrid');
            if (container) {
                results.storiesInDOM = container.children.length;
            }
            
            return results;
        });
        
        console.log('\n📊 Test Results:');
        console.log(`✅ loadStories function exists: ${testResults.loadStoriesExists}`);
        console.log(`✅ displayStories function exists: ${testResults.displayStoriesExists}`);
        console.log(`✅ storiesGrid container exists: ${testResults.storiesGridExists}`);
        console.log(`📚 Stories loaded in memory: ${testResults.allStoriesCount}`);
        console.log(`🎨 Stories rendered in DOM: ${testResults.storiesInDOM}`);
        
        if (testResults.storiesInDOM > 0) {
            console.log('\n🎉 SUCCESS! Browse Stories is now working in admin mode');
            console.log(`✅ ${testResults.storiesInDOM} stories are visible on the page`);
            
            // Test search functionality
            console.log('\n🔍 Testing search functionality...');
            await page.type('#searchKeywords', 'Technology');
            await page.click('button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const searchResults = await page.evaluate(() => {
                const container = document.getElementById('storiesGrid');
                return container ? container.children.length : 0;
            });
            
            console.log(`🔍 Search results: ${searchResults} stories found`);
            
            // Test view mode toggle
            console.log('\n📱 Testing view mode toggle...');
            await page.click('#listViewBtn');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const listModeTest = await page.evaluate(() => {
                const container = document.getElementById('storiesGrid');
                return container ? container.className.includes('stories-list') : false;
            });
            
            console.log(`📋 List view mode: ${listModeTest ? 'Working' : 'Not working'}`);
            
        } else {
            console.log('\n⚠️ Stories are still not showing. Manual trigger needed...');
            
            // Try manual trigger
            console.log('🔧 Manually triggering loadStories...');
            await page.evaluate(() => {
                if (typeof window.loadStories === 'function') {
                    window.loadStories();
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const afterManualTrigger = await page.evaluate(() => {
                const container = document.getElementById('storiesGrid');
                return container ? container.children.length : 0;
            });
            
            console.log(`Stories after manual trigger: ${afterManualTrigger}`);
        }
        
        // Test as regular user too
        console.log('\n👤 Testing as regular student user...');
        
        // Logout admin
        await page.evaluate(() => {
            localStorage.clear();
        });
        
        // Login as student
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'rumi&amaml');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        // Navigate to stories
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const studentResults = await page.evaluate(() => {
            const container = document.getElementById('storiesGrid');
            return container ? container.children.length : 0;
        });
        
        console.log(`👤 Student view stories: ${studentResults}`);
        
        if (studentResults > 0) {
            console.log('✅ Browse Stories also working for regular users!');
        } else {
            console.log('⚠️ May need to check student story filtering (approval status)');
        }
        
        console.log('\n📋 Final Summary:');
        console.log(`Admin mode stories: ${testResults.storiesInDOM > 0 ? '✅ Working' : '❌ Not working'}`);
        console.log(`Student mode stories: ${studentResults > 0 ? '✅ Working' : '⚠️ Needs attention'}`);
        console.log(`Function availability: ${testResults.loadStoriesExists && testResults.displayStoriesExists ? '✅ Fixed' : '❌ Still broken'}`);
        
        if (testResults.storiesInDOM > 0) {
            console.log('\n🎉 The browse stories fix has been successfully deployed!');
        } else {
            console.log('\n❌ The fix may need more time to deploy or additional debugging');
        }
        
        console.log('\n🔍 Browser staying open for manual verification...');
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testBrowseStoriesFix().catch(console.error);