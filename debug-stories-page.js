const puppeteer = require('puppeteer');

async function debugStoriesPage() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    console.log('🔍 Debugging Stories Page for Admin User...\n');
    
    try {
        // Login as admin
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'rumi&amaml');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ Logged in as admin');
        
        // Navigate directly to stories page
        console.log('📖 Navigating to stories.html...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('✅ Stories page loaded');
        
        // Monitor console messages and errors
        const consoleMessages = [];
        const errors = [];
        
        page.on('console', msg => {
            const message = `${msg.type()}: ${msg.text()}`;
            consoleMessages.push(message);
            console.log(`📱 ${message}`);
        });
        
        page.on('pageerror', error => {
            errors.push(error.message);
            console.log(`❌ JS Error: ${error.message}`);
        });
        
        // Check page state
        const pageAnalysis = await page.evaluate(() => {
            const analysis = {
                title: document.title,
                url: window.location.href,
                storiesJs: !!document.querySelector('script[src*="stories.js"]'),
                authJs: !!document.querySelector('script[src*="auth.js"]'),
                apiUrl: window.API_URL,
                userInfo: localStorage.getItem('userInfo'),
                token: localStorage.getItem('token')
            };
            
            // Check for story containers
            const containers = [
                '#story-grid',
                '#storiesContainer', 
                '.stories-container',
                '.story-grid',
                '#stories-list'
            ];
            
            containers.forEach(selector => {
                const element = document.querySelector(selector);
                analysis[`container_${selector}`] = {
                    exists: !!element,
                    visible: element ? !element.style.display.includes('none') : false,
                    children: element ? element.children.length : 0
                };
            });
            
            // Check for loading/error states
            analysis.loadingElements = document.querySelectorAll('.loading, .spinner').length;
            analysis.errorElements = document.querySelectorAll('.error, .error-message').length;
            
            // Check for story data in DOM
            analysis.storyElements = document.querySelectorAll('[data-story-id], .story-card, .story-item').length;
            
            return analysis;
        });
        
        console.log('\n📊 Page Analysis:');
        console.log(`Title: ${pageAnalysis.title}`);
        console.log(`Stories.js loaded: ${pageAnalysis.storiesJs}`);
        console.log(`Auth.js loaded: ${pageAnalysis.authJs}`);
        console.log(`API URL: ${pageAnalysis.apiUrl}`);
        console.log(`User token exists: ${!!pageAnalysis.token}`);
        console.log(`Story elements found: ${pageAnalysis.storyElements}`);
        console.log(`Loading elements: ${pageAnalysis.loadingElements}`);
        console.log(`Error elements: ${pageAnalysis.errorElements}`);
        
        // Check story containers
        console.log('\n📦 Story Containers:');
        Object.entries(pageAnalysis).forEach(([key, value]) => {
            if (key.startsWith('container_')) {
                const selector = key.replace('container_', '');
                console.log(`${selector}: exists=${value.exists}, visible=${value.visible}, children=${value.children}`);
            }
        });
        
        // Test story loading functions
        console.log('\n🔧 Testing Story Loading Functions...');
        
        const functionTest = await page.evaluate(() => {
            const results = {};
            const functions = [
                'loadStories',
                'loadStoriesGrid',
                'displayStories',
                'fetchStories',
                'initStories',
                'renderStories'
            ];
            
            functions.forEach(func => {
                if (typeof window[func] === 'function') {
                    results[func] = 'available';
                } else {
                    results[func] = 'not found';
                }
            });
            
            return results;
        });
        
        Object.entries(functionTest).forEach(([func, status]) => {
            console.log(`${func}: ${status}`);
        });
        
        // Try to manually trigger story loading
        if (functionTest.loadStories === 'available') {
            console.log('\n🚀 Manually triggering loadStories()...');
            
            await page.evaluate(() => {
                window.loadStories();
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const afterLoad = await page.evaluate(() => {
                return {
                    storyElements: document.querySelectorAll('[data-story-id], .story-card, .story-item').length,
                    containerHTML: document.querySelector('#story-grid, #storiesContainer')?.innerHTML?.substring(0, 300) || 'No container found'
                };
            });
            
            console.log(`Stories after manual load: ${afterLoad.storyElements}`);
            if (afterLoad.storyElements === 0) {
                console.log('Container HTML:', afterLoad.containerHTML);
            }
        }
        
        // Check API calls
        console.log('\n🌐 Testing API Call Directly...');
        
        const apiTest = await page.evaluate(async () => {
            try {
                const token = localStorage.getItem('token');
                const apiUrl = window.API_URL || 'https://podcast-stories-production.up.railway.app/api';
                
                const response = await fetch(`${apiUrl}/stories`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok
                };
                
                if (response.ok) {
                    const data = await response.json();
                    result.dataLength = data.length;
                    result.sampleStory = data[0] ? {
                        id: data[0].id,
                        title: data[0].idea_title,
                        status: data[0].approval_status
                    } : null;
                } else {
                    result.errorText = await response.text();
                }
                
                return result;
            } catch (error) {
                return {
                    error: error.message
                };
            }
        });
        
        console.log('API Test Results:');
        console.log(`Status: ${apiTest.status} ${apiTest.statusText}`);
        if (apiTest.ok) {
            console.log(`✅ API call successful - ${apiTest.dataLength} stories found`);
            if (apiTest.sampleStory) {
                console.log(`Sample story: "${apiTest.sampleStory.title}" (${apiTest.sampleStory.status})`);
            }
        } else {
            console.log(`❌ API call failed: ${apiTest.errorText || apiTest.error}`);
        }
        
        console.log('\n💡 Recommendations:');
        
        if (!pageAnalysis.storiesJs) {
            console.log('❌ stories.js not loaded - check script tag');
        } else if (apiTest.error || !apiTest.ok) {
            console.log('❌ API call failing - check authentication/endpoints');
        } else if (apiTest.dataLength === 0) {
            console.log('⚠️ No stories in database - add some test stories');
        } else if (pageAnalysis.storyElements === 0) {
            console.log('❌ Stories not rendering - check DOM manipulation code');
        } else {
            console.log('✅ Everything looks good');
        }
        
        console.log('\n🔍 Browser staying open for inspection...');
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

debugStoriesPage().catch(console.error);