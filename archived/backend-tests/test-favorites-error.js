/**
 * FAVORITES ERROR DEBUG TEST
 * 
 * This test simulates the favorites functionality to identify the exact error
 * that occurs when users click the favorites button.
 */

const puppeteer = require('puppeteer');

async function debugFavoritesError() {
    console.log('🔍 DEBUGGING FAVORITES ERROR');
    console.log('='.repeat(50));
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized'],
        devtools: true
    });
    
    try {
        const page = await browser.newPage();
        
        // Capture all console logs and errors
        const logs = [];
        const errors = [];
        
        page.on('console', msg => {
            const logEntry = `${msg.type()}: ${msg.text()}`;
            logs.push(logEntry);
            console.log('BROWSER LOG:', logEntry);
        });
        
        page.on('pageerror', error => {
            const errorEntry = `PAGE ERROR: ${error.message}`;
            errors.push(errorEntry);
            console.error('🚨 PAGE ERROR:', error.message);
        });
        
        page.on('response', response => {
            if (!response.url().includes('favorites')) return;
            console.log(`📡 API RESPONSE: ${response.status()} ${response.url()}`);
        });
        
        console.log('📱 Step 1: Navigate to stories page...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        console.log('🔐 Step 2: Check authentication...');
        
        // Check if we're redirected to login
        const currentUrl = page.url();
        if (currentUrl.includes('index.html') || currentUrl.endsWith('/')) {
            console.log('Not authenticated, attempting login...');
            
            // Try to login (this might fail due to credentials)
            await page.type('#email', 'admin@vidpod.com');
            await page.type('#password', 'rumi&amaml');
            await page.click('button[type="submit"]');
            
            await page.waitForTimeout(5000);
            
            // Check if login was successful
            const newUrl = page.url();
            if (newUrl.includes('index.html')) {
                console.log('⚠️  Login failed - cannot test favorites with authentication');
                console.log('📋 Will test frontend JavaScript errors only...');
            } else {
                console.log('✅ Login successful, proceeding with full test...');
            }
        }
        
        console.log('📊 Step 3: Look for story cards with favorite buttons...');
        
        // Navigate to stories page if not already there
        if (!page.url().includes('stories.html')) {
            await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
            await page.waitForTimeout(3000);
        }
        
        // Check if stories are loaded
        const storyCards = await page.$$('.story-card');
        console.log(`Found ${storyCards.length} story cards`);
        
        if (storyCards.length === 0) {
            console.log('🔍 No story cards found, checking page structure...');
            const pageContent = await page.evaluate(() => document.body.innerHTML);
            console.log('Page title:', await page.title());
            
            // Check if there's an error message
            const errorMsg = await page.$eval('#errorMessage', el => el.textContent).catch(() => null);
            if (errorMsg) {
                console.log('❌ Error message found:', errorMsg);
            }
        }
        
        // Look for favorite buttons
        const favoriteButtons = await page.$$('.favorite-btn, [onclick*="toggleFavorite"], [data-story-id]');
        console.log(`Found ${favoriteButtons.length} potential favorite buttons`);
        
        console.log('💝 Step 4: Test favorite functionality...');
        
        if (favoriteButtons.length > 0) {
            console.log('Attempting to click first favorite button...');
            
            try {
                // Click the first favorite button
                await favoriteButtons[0].click();
                
                // Wait for potential API calls and UI updates
                await page.waitForTimeout(3000);
                
                console.log('✅ Favorite button clicked successfully');
                
            } catch (clickError) {
                console.error('❌ Error clicking favorite button:', clickError.message);
                errors.push(`Click Error: ${clickError.message}`);
            }
        } else {
            console.log('⚠️  No favorite buttons found to test');
            
            // Check if the page has the expected structure
            const hasStoryGrid = await page.$('.stories-grid') !== null;
            const hasStoryContainer = await page.$('.story-container') !== null;
            
            console.log(`Has story grid: ${hasStoryGrid}`);
            console.log(`Has story container: ${hasStoryContainer}`);
        }
        
        console.log('🔍 Step 5: Check JavaScript function availability...');
        
        const jsChecks = await page.evaluate(() => {
            return {
                toggleFavoriteExists: typeof toggleFavorite === 'function',
                makeAuthenticatedRequestExists: typeof makeAuthenticatedRequest === 'function',
                apiUrlDefined: typeof window.API_URL !== 'undefined',
                apiUrlValue: window.API_URL,
                userFavoritesDefined: typeof userFavorites !== 'undefined',
                userFavoritesType: typeof userFavorites,
                userFavoritesSize: userFavorites ? userFavorites.size : 'undefined'
            };
        });
        
        console.log('JavaScript function checks:');
        Object.entries(jsChecks).forEach(([key, value]) => {
            const status = value ? '✅' : '❌';
            console.log(`   ${key}: ${status} ${value}`);
        });
        
        // Wait a bit more to catch any delayed errors
        await page.waitForTimeout(2000);
        
        console.log('📋 Step 6: Analyze results...');
        
        // Filter relevant logs
        const relevantLogs = logs.filter(log => 
            log.includes('favorite') || 
            log.includes('error') || 
            log.includes('API') ||
            log.includes('toggleFavorite') ||
            log.includes('Network')
        );
        
        console.log('\n🔍 RELEVANT BROWSER LOGS:');
        if (relevantLogs.length > 0) {
            relevantLogs.forEach(log => console.log(`   ${log}`));
        } else {
            console.log('   No relevant logs found');
        }
        
        console.log('\n🚨 ERRORS DETECTED:');
        if (errors.length > 0) {
            errors.forEach(error => console.log(`   ${error}`));
        } else {
            console.log('   No JavaScript errors detected');
        }
        
        console.log('\n📊 DIAGNOSIS:');
        
        // Analyze the issues
        const issues = [];
        
        if (!jsChecks.toggleFavoriteExists) {
            issues.push('toggleFavorite function not found - favorites won\'t work');
        }
        
        if (!jsChecks.makeAuthenticatedRequestExists) {
            issues.push('makeAuthenticatedRequest function not found - API calls will fail');
        }
        
        if (!jsChecks.apiUrlDefined) {
            issues.push('window.API_URL not defined - API endpoints unreachable');
        }
        
        if (jsChecks.userFavoritesType !== 'object') {
            issues.push('userFavorites not properly initialized as Set');
        }
        
        if (favoriteButtons.length === 0 && storyCards.length > 0) {
            issues.push('Story cards exist but no favorite buttons found - UI issue');
        }
        
        if (storyCards.length === 0) {
            issues.push('No story cards loaded - may be authentication or API issue');
        }
        
        if (issues.length > 0) {
            console.log('❌ ISSUES IDENTIFIED:');
            issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        } else {
            console.log('✅ No obvious issues detected - may require authentication for full testing');
        }
        
        // Take screenshot for visual debugging
        await page.screenshot({ 
            path: '/Users/faraz/Library/CloudStorage/OneDrive-Amitrace/Vibe/1_Test/podcast-stories/backend/favorites-debug.png',
            fullPage: true 
        });
        console.log('📸 Screenshot saved: favorites-debug.png');
        
        return { issues, errors, logs: relevantLogs, jsChecks };
        
    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
        return null;
    } finally {
        await browser.close();
    }
}

// Run the debug test
debugFavoritesError()
    .then(result => {
        console.log('\n' + '='.repeat(50));
        if (result && result.issues.length === 0 && result.errors.length === 0) {
            console.log('🎉 FAVORITES DEBUG: No critical issues found');
            console.log('   The error may be authentication-related or data-specific');
        } else {
            console.log('🔧 FAVORITES DEBUG: Issues identified for fixing');
        }
        console.log('📋 Check the detailed output above for specific problems');
    })
    .catch(console.error);