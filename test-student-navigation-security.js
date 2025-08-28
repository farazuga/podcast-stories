/**
 * Puppeteer Test: Student Navigation Security
 * Verifies that students cannot see or access admin features
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

async function testStudentNavigationSecurity() {
    console.log('🔒 Testing Student Navigation Security...\n');
    
    let browser;
    let results = {
        passed: 0,
        failed: 0,
        details: []
    };

    try {
        browser = await puppeteer.launch({
            headless: false, // Show browser for debugging
            slowMo: 500,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });

        // Test 1: Login as student
        console.log('📋 Test 1: Login as student account');
        await page.goto(`${BASE_URL}/index.html`);
        await page.waitForSelector('#loginForm');
        
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('#loginForm button[type="submit"]');
        
        // Wait for redirect to dashboard
        await page.waitForNavigation();
        
        if (page.url().includes('dashboard.html')) {
            console.log('✅ Student login successful');
            results.passed++;
            results.details.push('✅ Student can login successfully');
        } else {
            console.log('❌ Student login failed');
            results.failed++;
            results.details.push('❌ Student login failed');
        }

        // Wait for navigation to load
        await page.waitForTimeout(2000);

        // Test 2: Check that admin navigation items are hidden
        console.log('\n📋 Test 2: Verify admin navigation items are hidden');
        
        const adminBrowseStories = await page.$('[data-page="admin-browse-stories"]');
        const adminPanel = await page.$('[data-page="admin"]');
        
        if (!adminBrowseStories) {
            console.log('✅ Admin Browse Stories link is hidden from students');
            results.passed++;
            results.details.push('✅ Admin Browse Stories navigation hidden');
        } else {
            console.log('❌ Admin Browse Stories link is visible to students');
            results.failed++;
            results.details.push('❌ Admin Browse Stories navigation visible');
        }

        if (!adminPanel) {
            console.log('✅ Admin Panel link is hidden from students');
            results.passed++;
            results.details.push('✅ Admin Panel navigation hidden');
        } else {
            console.log('❌ Admin Panel link is visible to students');
            results.failed++;
            results.details.push('❌ Admin Panel navigation visible');
        }

        // Test 3: Check student navigation scope
        console.log('\n📋 Test 3: Verify student navigation scope');
        
        const dashboardLink = await page.$('[data-page="dashboard"]');
        const storiesLink = await page.$('[data-page="stories"]');
        const addStoryLink = await page.$('[data-page="add-story"]');
        const teacherDashLink = await page.$('[data-page="teacher-dashboard"]');

        if (dashboardLink) {
            console.log('✅ Dashboard link visible to students');
            results.passed++;
            results.details.push('✅ Dashboard navigation visible');
        } else {
            console.log('❌ Dashboard link hidden from students');
            results.failed++;
            results.details.push('❌ Dashboard navigation hidden');
        }

        if (storiesLink) {
            console.log('✅ Browse Stories link visible to students');
            results.passed++;
            results.details.push('✅ Browse Stories navigation visible');
        } else {
            console.log('❌ Browse Stories link hidden from students');
            results.failed++;
            results.details.push('❌ Browse Stories navigation hidden');
        }

        if (!addStoryLink) {
            console.log('✅ Add Story link is hidden from students');
            results.passed++;
            results.details.push('✅ Add Story navigation hidden');
        } else {
            console.log('❌ Add Story link is visible to students');
            results.failed++;
            results.details.push('❌ Add Story navigation visible');
        }

        if (!teacherDashLink) {
            console.log('✅ Teacher Dashboard link is hidden from students');
            results.passed++;
            results.details.push('✅ Teacher Dashboard navigation hidden');
        } else {
            console.log('❌ Teacher Dashboard link is visible to students');
            results.failed++;
            results.details.push('❌ Teacher Dashboard navigation visible');
        }

        // Test 4: Try direct access to admin pages
        console.log('\n📋 Test 4: Test direct access to admin pages');
        
        // Try to access admin.html directly
        await page.goto(`${BASE_URL}/admin.html`);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        if (!currentUrl.includes('admin.html') || currentUrl.includes('dashboard.html') || currentUrl.includes('index.html')) {
            console.log('✅ Student blocked from direct admin.html access');
            results.passed++;
            results.details.push('✅ Direct admin.html access blocked');
        } else {
            console.log('❌ Student can access admin.html directly');
            results.failed++;
            results.details.push('❌ Direct admin.html access allowed');
        }

        // Try to access admin-browse-stories.html directly
        await page.goto(`${BASE_URL}/admin-browse-stories.html`);
        await page.waitForTimeout(2000);
        
        const currentUrl2 = page.url();
        if (!currentUrl2.includes('admin-browse-stories.html') || currentUrl2.includes('dashboard.html') || currentUrl2.includes('index.html')) {
            console.log('✅ Student blocked from direct admin-browse-stories.html access');
            results.passed++;
            results.details.push('✅ Direct admin-browse-stories.html access blocked');
        } else {
            console.log('❌ Student can access admin-browse-stories.html directly');
            results.failed++;
            results.details.push('❌ Direct admin-browse-stories.html access allowed');
        }

        // Test 5: Check user role display
        console.log('\n📋 Test 5: Verify user role is displayed correctly');
        
        await page.goto(`${BASE_URL}/dashboard.html`);
        await page.waitForTimeout(2000);
        
        const userRoleElement = await page.$('#userRole');
        if (userRoleElement) {
            const roleText = await page.evaluate(el => el.textContent, userRoleElement);
            if (roleText.toLowerCase().includes('student')) {
                console.log('✅ User role correctly displayed as Student');
                results.passed++;
                results.details.push('✅ User role displayed correctly');
            } else {
                console.log(`❌ User role incorrectly displayed as: ${roleText}`);
                results.failed++;
                results.details.push(`❌ User role displayed as: ${roleText}`);
            }
        } else {
            console.log('⚠️  User role element not found');
            results.details.push('⚠️  User role element not found');
        }

        // Test 6: Mobile navigation test
        console.log('\n📋 Test 6: Test mobile navigation security');
        
        await page.setViewport({ width: 375, height: 667 }); // Mobile viewport
        await page.reload();
        await page.waitForTimeout(2000);

        // Check mobile menu
        const mobileToggle = await page.$('#mobileToggle');
        if (mobileToggle) {
            await mobileToggle.click();
            await page.waitForTimeout(1000);
            
            const mobileAdminBrowse = await page.$('.mobile-nav [data-page="admin-browse-stories"]');
            const mobileAdminPanel = await page.$('.mobile-nav [data-page="admin"]');
            
            if (!mobileAdminBrowse) {
                console.log('✅ Mobile admin browse stories link hidden');
                results.passed++;
                results.details.push('✅ Mobile admin browse navigation hidden');
            } else {
                console.log('❌ Mobile admin browse stories link visible');
                results.failed++;
                results.details.push('❌ Mobile admin browse navigation visible');
            }

            if (!mobileAdminPanel) {
                console.log('✅ Mobile admin panel link hidden');
                results.passed++;
                results.details.push('✅ Mobile admin panel navigation hidden');
            } else {
                console.log('❌ Mobile admin panel link visible');
                results.failed++;
                results.details.push('❌ Mobile admin panel navigation visible');
            }
        } else {
            console.log('⚠️  Mobile toggle not found');
            results.details.push('⚠️  Mobile toggle not found');
        }

    } catch (error) {
        console.error('❌ Test error:', error);
        results.failed++;
        results.details.push(`❌ Test error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // Print Results
    console.log('\n' + '='.repeat(60));
    console.log('🔒 STUDENT NAVIGATION SECURITY TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total Tests: ${results.passed + results.failed}`);
    
    if (results.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED - Student navigation is secure!');
    } else {
        console.log('\n⚠️  SECURITY ISSUES FOUND - Review failed tests');
    }
    
    console.log('\n📋 Detailed Results:');
    results.details.forEach(detail => console.log(`  ${detail}`));
    console.log('='.repeat(60));

    return results.failed === 0;
}

// Run the test
if (require.main === module) {
    testStudentNavigationSecurity()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test runner error:', error);
            process.exit(1);
        });
}

module.exports = testStudentNavigationSecurity;