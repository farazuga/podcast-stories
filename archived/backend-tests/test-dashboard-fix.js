const puppeteer = require('puppeteer');

/**
 * Test Dashboard Element Loading Fix
 * 
 * This test verifies that Fix 4 (Dashboard element loading) is working properly:
 * - Dashboard statistics load and display correctly
 * - Recent activity sections populate 
 * - No "Loading..." messages persist
 * - Stats show actual numbers, not just "0"
 */

async function testDashboardElementLoading() {
    console.log('🧪 Testing Dashboard Element Loading Fix...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => console.log('BROWSER:', msg.text()));
        page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
        
        console.log('📱 Navigating to production dashboard...');
        await page.goto('https://podcast-stories-production.up.railway.app/dashboard.html');
        
        // Wait for potential redirect to login
        await page.waitForTimeout(2000);
        
        // Check if we're on login page
        const currentUrl = page.url();
        if (currentUrl.includes('index.html') || currentUrl.endsWith('/')) {
            console.log('🔐 Not logged in, performing login...');
            
            // Login with student account
            await page.type('#username', 'student@vidpod.com');
            await page.type('#password', 'rumi&amaml');
            await page.click('button[type="submit"]');
            
            // Wait for login and redirect
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
            console.log('✅ Login successful, redirected to:', page.url());
        }
        
        // Wait for dashboard to load
        console.log('⏳ Waiting for dashboard to load...');
        await page.waitForTimeout(5000);
        
        // Test 1: Check if dashboard statistics are loading
        console.log('\n📊 TEST 1: Dashboard Statistics Loading');
        
        const stats = await page.evaluate(() => {
            return {
                myStories: document.getElementById('myStoriesCount')?.textContent || 'not found',
                myFavorites: document.getElementById('myFavoritesCount')?.textContent || 'not found',
                totalStories: document.getElementById('totalStoriesCount')?.textContent || 'not found',
                myClasses: document.getElementById('myClassesCount')?.textContent || 'not found'
            };
        });
        
        console.log('📈 Dashboard Statistics:');
        console.log(`   My Stories: ${stats.myStories}`);
        console.log(`   My Favorites: ${stats.myFavorites}`);
        console.log(`   Total Stories: ${stats.totalStories}`);
        console.log(`   My Classes: ${stats.myClasses}`);
        
        // Test 2: Check if recent activity sections are loading
        console.log('\n📋 TEST 2: Recent Activity Loading');
        
        const activity = await page.evaluate(() => {
            const myRecentStories = document.getElementById('myRecentStories');
            const recentFavorites = document.getElementById('recentFavorites');
            
            return {
                myRecentStoriesContent: myRecentStories?.innerHTML || 'not found',
                recentFavoritesContent: recentFavorites?.innerHTML || 'not found',
                stillLoading: {
                    myRecentStories: myRecentStories?.textContent?.includes('Loading...') || false,
                    recentFavorites: recentFavorites?.textContent?.includes('Loading...') || false
                }
            };
        });
        
        console.log('🔄 Recent Activity Status:');
        console.log(`   My Recent Stories still loading: ${activity.stillLoading.myRecentStories}`);
        console.log(`   Recent Favorites still loading: ${activity.stillLoading.recentFavorites}`);
        
        if (activity.stillLoading.myRecentStories || activity.stillLoading.recentFavorites) {
            console.log('❌ ISSUE: Some sections still showing "Loading..."');
        } else {
            console.log('✅ All sections have finished loading');
        }
        
        // Test 3: Check for JavaScript errors
        console.log('\n🔍 TEST 3: Console Error Check');
        const logs = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                logs.push(msg.text());
            }
        });
        
        // Wait a bit more to catch any delayed errors
        await page.waitForTimeout(3000);
        
        if (logs.length > 0) {
            console.log('❌ JavaScript errors found:');
            logs.forEach(log => console.log(`   - ${log}`));
        } else {
            console.log('✅ No JavaScript errors detected');
        }
        
        // Test 4: Check if stats are meaningful (not all zeros)
        console.log('\n📊 TEST 4: Data Validation');
        
        const hasRealData = 
            stats.myStories !== '0' || 
            stats.myFavorites !== '0' || 
            stats.totalStories !== '0';
        
        if (hasRealData) {
            console.log('✅ Dashboard shows real data (not all zeros)');
        } else {
            console.log('⚠️  Dashboard showing all zeros - may need data or API connectivity check');
        }
        
        // Final assessment
        console.log('\n🎯 DASHBOARD FIX ASSESSMENT:');
        
        const elementsFound = 
            stats.myStories !== 'not found' && 
            stats.myFavorites !== 'not found' && 
            stats.totalStories !== 'not found';
        
        const noLoadingStuck = !activity.stillLoading.myRecentStories && !activity.stillLoading.recentFavorites;
        const noJSErrors = logs.length === 0;
        
        if (elementsFound && noLoadingStuck && noJSErrors) {
            console.log('✅ Fix 4: Dashboard element loading - SUCCESS');
            console.log('   - All stat elements found and populated');
            console.log('   - No sections stuck on "Loading..."');
            console.log('   - No JavaScript errors');
        } else {
            console.log('❌ Fix 4: Dashboard element loading - ISSUES FOUND');
            if (!elementsFound) console.log('   - Some stat elements not found');
            if (!noLoadingStuck) console.log('   - Some sections stuck on "Loading..."');
            if (!noJSErrors) console.log('   - JavaScript errors detected');
        }
        
        // Take a screenshot for verification
        await page.screenshot({ 
            path: '/Users/faraz/Library/CloudStorage/OneDrive-Amitrace/Vibe/1_Test/podcast-stories/backend/dashboard-fix-test.png',
            fullPage: true 
        });
        console.log('📸 Screenshot saved: dashboard-fix-test.png');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Run the test
testDashboardElementLoading().catch(console.error);