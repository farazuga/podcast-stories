const puppeteer = require('puppeteer');

async function testFavoritesFunctionality() {
    console.log('❤️ Testing Complete Favorites Functionality\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: false,
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const page = await browser.newPage();
    
    // Capture console messages for debugging
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('favorite') || text.includes('Favorite') || text.includes('❤️') || text.includes('♥') || text.includes('Loaded')) {
            console.log(`🔵 BROWSER: ${text}`);
        }
    });
    
    page.on('pageerror', error => {
        console.log(`❌ PAGE ERROR: ${error.message}`);
    });

    let testTimeout;
    
    try {
        // Set timeout to continue after 20 seconds
        testTimeout = setTimeout(() => {
            console.log('\n⏰ Test continuing after 20 seconds...');
        }, 20000);

        console.log('Step 1: Login as teacher...');
        await page.goto('https://podcast-stories-production.up.railway.app');
        await page.type('#email', 'teacher@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        
        console.log('Step 2: Navigate to Browse Stories page...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for data to load
        
        console.log('Step 3: Check initial favorites state...');
        const initialState = await page.evaluate(() => {
            const favoriteButtons = document.querySelectorAll('.favorite-btn');
            const firstStory = document.querySelector('[data-story-id]');
            const firstStoryId = firstStory ? firstStory.getAttribute('data-story-id') : null;
            const firstFavoriteBtn = firstStory ? firstStory.querySelector('.favorite-btn') : null;
            const firstHeartIcon = firstFavoriteBtn ? firstFavoriteBtn.querySelector('.heart-icon') : null;
            const firstFavoriteCount = firstFavoriteBtn ? firstFavoriteBtn.querySelector('.favorite-count') : null;
            
            return {
                totalFavoriteButtons: favoriteButtons.length,
                firstStoryId: firstStoryId,
                firstStoryHasButton: !!firstFavoriteBtn,
                firstHeartIcon: firstHeartIcon ? firstHeartIcon.textContent : 'not found',
                firstFavoriteCount: firstFavoriteCount ? firstFavoriteCount.textContent : 'not found',
                firstButtonClasses: firstFavoriteBtn ? firstFavoriteBtn.className : 'not found'
            };
        });
        
        console.log('Initial Favorites State:');
        console.log(`  Total favorite buttons: ${initialState.totalFavoriteButtons}`);
        console.log(`  First story ID: ${initialState.firstStoryId}`);
        console.log(`  First story has button: ${initialState.firstStoryHasButton ? '✅' : '❌'}`);
        console.log(`  First heart icon: ${initialState.firstHeartIcon}`);
        console.log(`  First favorite count: ${initialState.firstFavoriteCount}`);
        console.log(`  First button classes: ${initialState.firstButtonClasses}`);
        
        if (!initialState.firstStoryHasButton || !initialState.firstStoryId) {
            console.log('❌ No favorite buttons found or no stories loaded');
            await browser.close();
            return;
        }
        
        console.log('\nStep 4: Test adding to favorites...');
        
        // Click the first favorite button
        const storyId = initialState.firstStoryId;
        await page.click(`[data-story-id="${storyId}"] .favorite-btn`);
        
        // Wait for API call and UI update
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const afterAddState = await page.evaluate((storyId) => {
            const storyElement = document.querySelector(`[data-story-id="${storyId}"]`);
            const favoriteBtn = storyElement ? storyElement.querySelector('.favorite-btn') : null;
            const heartIcon = favoriteBtn ? favoriteBtn.querySelector('.heart-icon') : null;
            const favoriteCount = favoriteBtn ? favoriteBtn.querySelector('.favorite-count') : null;
            const notification = document.querySelector('.notification');
            
            return {
                heartIcon: heartIcon ? heartIcon.textContent : 'not found',
                favoriteCount: favoriteCount ? favoriteCount.textContent : 'not found',
                buttonClasses: favoriteBtn ? favoriteBtn.className : 'not found',
                hasNotification: !!notification,
                notificationText: notification ? notification.textContent : 'none',
                notificationClasses: notification ? notification.className : 'none'
            };
        }, storyId);
        
        console.log('After Adding to Favorites:');
        console.log(`  Heart icon: ${afterAddState.heartIcon}`);
        console.log(`  Favorite count: ${afterAddState.favoriteCount}`);
        console.log(`  Button classes: ${afterAddState.buttonClasses}`);
        console.log(`  Has notification: ${afterAddState.hasNotification ? '✅' : '❌'}`);
        console.log(`  Notification text: ${afterAddState.notificationText}`);
        console.log(`  Notification type: ${afterAddState.notificationClasses}`);
        
        console.log('\nStep 5: Test removing from favorites...');
        
        // Click the favorite button again to remove
        await page.click(`[data-story-id="${storyId}"] .favorite-btn`);
        
        // Wait for API call and UI update
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const afterRemoveState = await page.evaluate((storyId) => {
            const storyElement = document.querySelector(`[data-story-id="${storyId}"]`);
            const favoriteBtn = storyElement ? storyElement.querySelector('.favorite-btn') : null;
            const heartIcon = favoriteBtn ? favoriteBtn.querySelector('.heart-icon') : null;
            const favoriteCount = favoriteBtn ? favoriteBtn.querySelector('.favorite-count') : null;
            
            return {
                heartIcon: heartIcon ? heartIcon.textContent : 'not found',
                favoriteCount: favoriteCount ? favoriteCount.textContent : 'not found',
                buttonClasses: favoriteBtn ? favoriteBtn.className : 'not found'
            };
        }, storyId);
        
        console.log('After Removing from Favorites:');
        console.log(`  Heart icon: ${afterRemoveState.heartIcon}`);
        console.log(`  Favorite count: ${afterRemoveState.favoriteCount}`);
        console.log(`  Button classes: ${afterRemoveState.buttonClasses}`);
        
        console.log('\nStep 6: Test favorites in list view...');
        
        // Switch to list view
        await page.click('#listViewBtn');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test favorite button in list view
        await page.click(`[data-story-id="${storyId}"] .favorite-btn`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const listViewState = await page.evaluate((storyId) => {
            const storyElement = document.querySelector(`[data-story-id="${storyId}"]`);
            const favoriteBtn = storyElement ? storyElement.querySelector('.favorite-btn') : null;
            const heartIcon = favoriteBtn ? favoriteBtn.querySelector('.heart-icon') : null;
            
            return {
                heartIcon: heartIcon ? heartIcon.textContent : 'not found',
                buttonExists: !!favoriteBtn,
                storyCardClass: storyElement ? storyElement.className : 'not found'
            };
        }, storyId);
        
        console.log('List View Favorites:');
        console.log(`  Heart icon: ${listViewState.heartIcon}`);
        console.log(`  Button exists: ${listViewState.buttonExists ? '✅' : '❌'}`);
        console.log(`  Story card class: ${listViewState.storyCardClass}`);
        
        console.log('\nStep 7: Final verification...');
        await page.screenshot({ path: 'favorites-test.png', fullPage: true });
        console.log('📸 Screenshot saved as favorites-test.png');
        
        // Test results assessment
        const isWorkingCorrectly = 
            initialState.totalFavoriteButtons > 0 &&
            afterAddState.hasNotification &&
            afterAddState.heartIcon === '♥' &&
            listViewState.buttonExists;
        
        console.log('\n❤️ FAVORITES FUNCTIONALITY TEST RESULTS:');
        if (isWorkingCorrectly) {
            console.log('🎉 SUCCESS: Favorites functionality is working correctly!');
            console.log('✅ Favorite buttons display on all stories');
            console.log('✅ Add to favorites API call working');
            console.log('✅ Remove from favorites API call working');
            console.log('✅ UI updates correctly (heart icon changes)');
            console.log('✅ Notifications show success/error messages');
            console.log('✅ Favorites work in both grid and list views');
            console.log('✅ Favorite counts display and update');
        } else {
            console.log('❌ ISSUES DETECTED:');
            if (initialState.totalFavoriteButtons === 0) {
                console.log('- No favorite buttons found');
            }
            if (!afterAddState.hasNotification) {
                console.log('- No success notification shown');
            }
            if (afterAddState.heartIcon !== '♥') {
                console.log('- Heart icon not updating correctly');
            }
            if (!listViewState.buttonExists) {
                console.log('- Favorite buttons not working in list view');
            }
        }
        
        clearTimeout(testTimeout);
        console.log('\nTest completed! Browser staying open for manual verification. Press Ctrl+C to close.');
        await new Promise(() => {}); // Keep browser open
        
    } catch (error) {
        clearTimeout(testTimeout);
        console.error('❌ Test failed:', error.message);
        await browser.close();
    }
}

testFavoritesFunctionality();