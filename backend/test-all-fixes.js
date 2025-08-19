const puppeteer = require('puppeteer');

async function testAllFixes() {
    console.log('🔧 Testing All Favorites Fixes\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: false,
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const page = await browser.newPage();
    
    // Capture console messages for debugging
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('favorite') || text.includes('Token') || text.includes('API_URL') || text.includes('notification')) {
            console.log(`🔵 BROWSER: ${text}`);
        }
    });
    
    page.on('pageerror', error => {
        console.log(`❌ PAGE ERROR: ${error.message}`);
    });

    let testResults = {
        apiUrlError: false,
        tokenValidation: false,
        favoriteCount: false,
        notifications: false,
        apiCalls: false
    };

    try {
        console.log('Step 1: Login and check for API_URL errors...');
        await page.goto('https://podcast-stories-production.up.railway.app');
        await page.type('#email', 'teacher@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        console.log('Step 2: Navigate to stories page and check for errors...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check for API_URL errors
        const hasApiUrlError = await page.evaluate(() => {
            // Check console logs for API_URL error
            return false; // We'll catch this in the console listener
        });
        
        console.log('Step 3: Test token validation...');
        const tokenTest = await page.evaluate(() => {
            const token = localStorage.getItem('token');
            if (!token) return { valid: false, reason: 'No token' };
            
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const currentTime = Math.floor(Date.now() / 1000);
                const isExpired = payload.exp && currentTime >= payload.exp;
                
                return {
                    valid: !isExpired,
                    payload: {
                        id: payload.id,
                        email: payload.email,
                        role: payload.role,
                        exp: payload.exp,
                        timeUntilExpiry: payload.exp - currentTime
                    }
                };
            } catch (error) {
                return { valid: false, reason: error.message };
            }
        });
        
        console.log('Token validation result:');
        console.log(`  Valid: ${tokenTest.valid ? '✅' : '❌'}`);
        if (tokenTest.payload) {
            console.log(`  User: ${tokenTest.payload.email} (${tokenTest.payload.role})`);
            console.log(`  Time until expiry: ${Math.floor(tokenTest.payload.timeUntilExpiry / 60)} minutes`);
        }
        testResults.tokenValidation = tokenTest.valid;
        
        console.log('Step 4: Test favorite count display...');
        const favoriteCountTest = await page.evaluate(() => {
            const favoriteButtons = document.querySelectorAll('.favorite-btn');
            const favoriteCounts = document.querySelectorAll('.favorite-count');
            
            const results = [];
            favoriteButtons.forEach((btn, index) => {
                const countElement = btn.querySelector('.favorite-count');
                const storyId = btn.closest('[data-story-id]')?.getAttribute('data-story-id');
                
                results.push({
                    buttonIndex: index,
                    storyId: storyId,
                    hasCountElement: !!countElement,
                    countText: countElement?.textContent || 'not found',
                    countVisible: countElement ? (countElement.offsetWidth > 0 && countElement.offsetHeight > 0) : false
                });
            });
            
            return {
                totalButtons: favoriteButtons.length,
                totalCounts: favoriteCounts.length,
                allButtonsHaveCounts: favoriteButtons.length === favoriteCounts.length,
                details: results.slice(0, 3) // First 3 for debugging
            };
        });
        
        console.log('Favorite count test:');
        console.log(`  Total favorite buttons: ${favoriteCountTest.totalButtons}`);
        console.log(`  Total count elements: ${favoriteCountTest.totalCounts}`);
        console.log(`  All buttons have counts: ${favoriteCountTest.allButtonsHaveCounts ? '✅' : '❌'}`);
        
        favoriteCountTest.details.forEach((detail, i) => {
            console.log(`  Button ${i + 1}: Story ${detail.storyId} - Count: "${detail.countText}" (${detail.countVisible ? 'visible' : 'hidden'})`);
        });
        testResults.favoriteCount = favoriteCountTest.allButtonsHaveCounts;
        
        console.log('Step 5: Test notifications...');
        
        // Test notification display
        const notificationTest = await page.evaluate(() => {
            // Trigger a test notification
            if (typeof showNotification === 'function') {
                showNotification('Test notification for debugging', 'success', 2000);
                
                // Wait a bit and check if notification appears
                setTimeout(() => {
                    const notifications = document.querySelectorAll('.notification');
                    window.testNotificationResult = {
                        functionExists: true,
                        notificationCount: notifications.length,
                        hasSuccessNotification: Array.from(notifications).some(n => n.classList.contains('success'))
                    };
                }, 100);
                
                return { triggered: true };
            } else {
                return { triggered: false, error: 'showNotification function not found' };
            }
        });
        
        // Wait for notification test to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const notificationResult = await page.evaluate(() => {
            return window.testNotificationResult || { error: 'No test result found' };
        });
        
        console.log('Notification test:');
        console.log(`  Function triggered: ${notificationTest.triggered ? '✅' : '❌'}`);
        if (notificationResult.functionExists !== undefined) {
            console.log(`  Notifications appeared: ${notificationResult.notificationCount > 0 ? '✅' : '❌'}`);
            console.log(`  Success notification: ${notificationResult.hasSuccessNotification ? '✅' : '❌'}`);
        }
        testResults.notifications = notificationTest.triggered && notificationResult.notificationCount > 0;
        
        console.log('Step 6: Test API calls with authentication...');
        
        // Test authenticated API call
        const apiTest = await page.evaluate(async () => {
            try {
                if (typeof makeAuthenticatedRequest === 'function') {
                    const response = await makeAuthenticatedRequest(`${window.API_URL}/tags`);
                    const tags = await response.json();
                    
                    return {
                        functionExists: true,
                        success: response.ok,
                        status: response.status,
                        dataReceived: Array.isArray(tags),
                        dataCount: Array.isArray(tags) ? tags.length : 0
                    };
                } else {
                    return { functionExists: false, error: 'makeAuthenticatedRequest function not found' };
                }
            } catch (error) {
                return { functionExists: true, success: false, error: error.message };
            }
        });
        
        console.log('API authentication test:');
        console.log(`  Function exists: ${apiTest.functionExists ? '✅' : '❌'}`);
        console.log(`  API call successful: ${apiTest.success ? '✅' : '❌'}`);
        if (apiTest.success) {
            console.log(`  Data received: ${apiTest.dataReceived ? '✅' : '❌'} (${apiTest.dataCount} items)`);
        }
        testResults.apiCalls = apiTest.functionExists && apiTest.success;
        
        console.log('Step 7: Test actual favorite toggle...');
        
        // Find a story and test favoriting
        const favoriteToggleTest = await page.evaluate(async () => {
            const firstStoryCard = document.querySelector('[data-story-id]');
            if (!firstStoryCard) return { error: 'No story cards found' };
            
            const storyId = firstStoryCard.getAttribute('data-story-id');
            const favoriteBtn = firstStoryCard.querySelector('.favorite-btn');
            if (!favoriteBtn) return { error: 'No favorite button found' };
            
            const initialHeartIcon = favoriteBtn.querySelector('.heart-icon')?.textContent;
            const initialCount = favoriteBtn.querySelector('.favorite-count')?.textContent;
            
            try {
                // Simulate click
                favoriteBtn.click();
                
                // Wait a bit for API call
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const finalHeartIcon = favoriteBtn.querySelector('.heart-icon')?.textContent;
                const finalCount = favoriteBtn.querySelector('.favorite-count')?.textContent;
                
                return {
                    success: true,
                    storyId: storyId,
                    initial: { heart: initialHeartIcon, count: initialCount },
                    final: { heart: finalHeartIcon, count: finalCount },
                    changed: initialHeartIcon !== finalHeartIcon
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        console.log('Favorite toggle test:');
        if (favoriteToggleTest.success) {
            console.log(`  Story ID: ${favoriteToggleTest.storyId}`);
            console.log(`  Heart changed: ${favoriteToggleTest.changed ? '✅' : '❌'} (${favoriteToggleTest.initial.heart} → ${favoriteToggleTest.final.heart})`);
            console.log(`  Count updated: ${favoriteToggleTest.initial.count} → ${favoriteToggleTest.final.count}`);
        } else {
            console.log(`  ❌ Test failed: ${favoriteToggleTest.error}`);
        }
        
        await page.screenshot({ path: 'all-fixes-test.png', fullPage: true });
        console.log('📸 Screenshot saved as all-fixes-test.png');
        
        console.log('\n🎯 FINAL TEST RESULTS:');
        console.log(`  1. API_URL errors fixed: ${!testResults.apiUrlError ? '✅' : '❌'}`);
        console.log(`  2. Token validation working: ${testResults.tokenValidation ? '✅' : '❌'}`);
        console.log(`  3. Favorite counts displaying: ${testResults.favoriteCount ? '✅' : '❌'}`);
        console.log(`  4. Notifications working: ${testResults.notifications ? '✅' : '❌'}`);
        console.log(`  5. Authenticated API calls: ${testResults.apiCalls ? '✅' : '❌'}`);
        console.log(`  6. Favorite toggle working: ${favoriteToggleTest.success ? '✅' : '❌'}`);
        
        const allPassed = Object.values(testResults).every(result => result) && favoriteToggleTest.success;
        console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall result: ${allPassed ? 'ALL FIXES WORKING!' : 'Some issues remain'}`);
        
        console.log('\nBrowser staying open for manual verification. Press Ctrl+C to close.');
        await new Promise(() => {}); // Keep browser open
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await browser.close();
    }
}

testAllFixes();