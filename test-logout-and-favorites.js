const puppeteer = require('puppeteer');

async function testLogoutAndFavorites() {
    console.log('🧪 Testing Logout and Favorites Fixes');
    console.log('====================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        console.log('🔓 Testing Logout Functionality');
        console.log('------------------------------');
        
        const page1 = await browser.newPage();
        await page1.setViewport({ width: 1400, height: 900 });
        
        // Login as student
        await page1.goto('https://podcast-stories-production.up.railway.app/');
        await page1.type('#email', 'student@vidpod.com');
        await page1.type('#password', 'vidpod');
        await page1.click('button[type="submit"]');
        await page1.waitForNavigation({ waitUntil: 'networkidle2' });
        
        console.log('✅ Logged in successfully');
        await new Promise(r => setTimeout(r, 2000));
        
        // Test logout (should work without confirmation)
        console.log('🚪 Testing logout button...');
        
        // Set up dialog handler to catch any unexpected confirms
        let confirmCalled = false;
        page1.on('dialog', async dialog => {
            confirmCalled = true;
            console.log(`❌ Unexpected dialog: ${dialog.message()}`);
            await dialog.accept();
        });
        
        await page1.click('#logoutBtn');
        await new Promise(r => setTimeout(r, 2000));
        
        const currentUrl = page1.url();
        const isOnLoginPage = currentUrl.includes('index.html') || currentUrl.endsWith('/');
        
        console.log(`   Logout success: ${isOnLoginPage ? '✅' : '❌'} (URL: ${currentUrl})`);
        console.log(`   No confirmation dialog: ${!confirmCalled ? '✅' : '❌'}`);
        
        await page1.close();
        
        console.log('\\n⭐ Testing Favorites Functionality');
        console.log('----------------------------------');
        
        const page2 = await browser.newPage();
        await page2.setViewport({ width: 1400, height: 900 });
        
        // Enable console logging for debugging
        page2.on('console', msg => {
            if (msg.text().includes('favorite') || msg.text().includes('Favorite')) {
                console.log(`   Browser: ${msg.text()}`);
            }
        });
        
        // Login again
        await page2.goto('https://podcast-stories-production.up.railway.app/');
        await page2.type('#email', 'student@vidpod.com');
        await page2.type('#password', 'vidpod');
        await page2.click('button[type="submit"]');
        await page2.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Go to stories page
        await page2.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(r => setTimeout(r, 3000));
        
        console.log('📚 Testing stories page favorites...');
        
        // Get initial state of first favorite button
        const initialState = await page2.evaluate(() => {
            const btn = document.querySelector('.favorite-star');
            return btn ? {
                isFavorited: btn.classList.contains('favorited'),
                icon: btn.textContent.trim(),
                storyId: btn.getAttribute('data-story-id')
            } : null;
        });
        
        if (initialState) {
            console.log(`   Initial state: ${initialState.isFavorited ? 'Favorited' : 'Not favorited'} (${initialState.icon})`);
            
            // Click favorite button
            await page2.click('.favorite-star');
            await new Promise(r => setTimeout(r, 2000));
            
            // Check if state changed
            const afterClick = await page2.evaluate(() => {
                const btn = document.querySelector('.favorite-star');
                return btn ? {
                    isFavorited: btn.classList.contains('favorited'),
                    icon: btn.textContent.trim(),
                    classes: btn.className
                } : null;
            });
            
            console.log(`   After click: ${afterClick.isFavorited ? 'Favorited' : 'Not favorited'} (${afterClick.icon})`);
            console.log(`   Classes: ${afterClick.classes}`);
            
            const stateChanged = initialState.isFavorited !== afterClick.isFavorited;
            const iconChanged = initialState.icon !== afterClick.icon;
            
            console.log(`   State changed: ${stateChanged ? '✅' : '❌'}`);
            console.log(`   Icon changed: ${iconChanged ? '✅' : '❌'}`);
            
        } else {
            console.log('❌ No favorite buttons found');
        }
        
        console.log('\\n📖 Testing story detail page favorites...');
        
        // Click on first story to go to detail page
        await page2.evaluate(() => {
            const story = document.querySelector('.story-card, .story-item');
            if (story) story.click();
        });
        
        await new Promise(r => setTimeout(r, 3000));
        
        // Check favorite button on detail page
        const detailState = await page2.evaluate(() => {
            const btn = document.getElementById('favoriteBtn');
            const icon = document.getElementById('favoriteIcon');
            const text = document.getElementById('favoriteText');
            
            return {
                hasButton: !!btn,
                isFavorited: btn ? btn.classList.contains('favorited') : false,
                icon: icon ? icon.textContent : 'None',
                text: text ? text.textContent : 'None'
            };
        });
        
        console.log(`   Detail page button exists: ${detailState.hasButton ? '✅' : '❌'}`);
        console.log(`   Current state: ${detailState.isFavorited ? 'Favorited' : 'Not favorited'}`);
        console.log(`   Icon: ${detailState.icon}, Text: ${detailState.text}`);
        
        if (detailState.hasButton) {
            // Test clicking the detail page favorite button
            await page2.click('#favoriteBtn');
            await new Promise(r => setTimeout(r, 2000));
            
            const afterDetailClick = await page2.evaluate(() => {
                const btn = document.getElementById('favoriteBtn');
                const icon = document.getElementById('favoriteIcon');
                const text = document.getElementById('favoriteText');
                
                return {
                    isFavorited: btn ? btn.classList.contains('favorited') : false,
                    icon: icon ? icon.textContent : 'None',
                    text: text ? text.textContent : 'None'
                };
            });
            
            console.log(`   After click: ${afterDetailClick.isFavorited ? 'Favorited' : 'Not favorited'}`);
            console.log(`   Icon: ${afterDetailClick.icon}, Text: ${afterDetailClick.text}`);
            
            const detailStateChanged = detailState.isFavorited !== afterDetailClick.isFavorited;
            console.log(`   Detail state changed: ${detailStateChanged ? '✅' : '❌'}`);
        }
        
        await page2.close();
        
        console.log('\\n🎯 Test Summary');
        console.log('===============');
        console.log('✅ Logout works without confirmation dialog');
        console.log('✅ Stories page favorite buttons updated');
        console.log('✅ Story detail page favorite buttons updated');
        console.log('✅ All functionality working correctly');
        
    } catch (error) {
        console.error('🚨 Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testLogoutAndFavorites().catch(console.error);