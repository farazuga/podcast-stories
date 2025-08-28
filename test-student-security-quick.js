/**
 * Quick Puppeteer Test: Student Navigation Security
 * Fast headless test to verify student security
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

async function quickSecurityTest() {
    console.log('🔒 Quick Student Navigation Security Test...\n');
    
    let browser;
    let results = { passed: 0, failed: 0, details: [] };

    try {
        browser = await puppeteer.launch({
            headless: 'new', // Faster headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });

        // Test 1: Login as student
        console.log('📋 Test 1: Student login and navigation check');
        await page.goto(`${BASE_URL}/index.html`);
        
        // Fill and submit login form
        await page.waitForSelector('#email', { timeout: 10000 });
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        
        await Promise.all([
            page.waitForNavigation({ timeout: 15000 }),
            page.click('button[type="submit"]')
        ]);
        
        if (page.url().includes('dashboard.html')) {
            console.log('✅ Student login successful');
            results.passed++;
            results.details.push('✅ Student can login');
        } else {
            console.log('❌ Student login failed - URL:', page.url());
            results.failed++;
            results.details.push('❌ Student login failed');
            return results;
        }

        // Wait for navigation to fully load
        await page.waitForTimeout(3000);

        // Test 2: Check navigation elements
        console.log('📋 Test 2: Navigation security check');
        
        // Check what navigation items exist
        const navItems = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.nav-item[data-page]').forEach(item => {
                const page = item.getAttribute('data-page');
                const role = item.getAttribute('data-role');
                const visible = window.getComputedStyle(item).display !== 'none';
                items.push({ page, role, visible });
            });
            return items;
        });

        console.log('📋 Found navigation items:', navItems);

        // Check admin items are hidden
        const adminBrowseVisible = navItems.find(item => item.page === 'admin-browse-stories')?.visible;
        const adminPanelVisible = navItems.find(item => item.page === 'admin')?.visible;
        const addStoryVisible = navItems.find(item => item.page === 'add-story')?.visible;
        const teacherDashVisible = navItems.find(item => item.page === 'teacher-dashboard')?.visible;

        // Check student items are visible
        const dashboardVisible = navItems.find(item => item.page === 'dashboard')?.visible;
        const storiesVisible = navItems.find(item => item.page === 'stories')?.visible;

        // Admin items should be hidden
        if (!adminBrowseVisible) {
            console.log('✅ Admin Browse Stories hidden from student');
            results.passed++;
            results.details.push('✅ Admin Browse Stories hidden');
        } else {
            console.log('❌ Admin Browse Stories visible to student');
            results.failed++;
            results.details.push('❌ Admin Browse Stories visible');
        }

        if (!adminPanelVisible) {
            console.log('✅ Admin Panel hidden from student');
            results.passed++;
            results.details.push('✅ Admin Panel hidden');
        } else {
            console.log('❌ Admin Panel visible to student');
            results.failed++;
            results.details.push('❌ Admin Panel visible');
        }

        if (!addStoryVisible) {
            console.log('✅ Add Story hidden from student');
            results.passed++;
            results.details.push('✅ Add Story hidden');
        } else {
            console.log('❌ Add Story visible to student');
            results.failed++;
            results.details.push('❌ Add Story visible');
        }

        if (!teacherDashVisible) {
            console.log('✅ Teacher Dashboard hidden from student');
            results.passed++;
            results.details.push('✅ Teacher Dashboard hidden');
        } else {
            console.log('❌ Teacher Dashboard visible to student');
            results.failed++;
            results.details.push('❌ Teacher Dashboard visible');
        }

        // Student items should be visible
        if (dashboardVisible) {
            console.log('✅ Dashboard visible to student');
            results.passed++;
            results.details.push('✅ Dashboard visible');
        } else {
            console.log('❌ Dashboard hidden from student');
            results.failed++;
            results.details.push('❌ Dashboard hidden');
        }

        if (storiesVisible) {
            console.log('✅ Browse Stories visible to student');
            results.passed++;
            results.details.push('✅ Browse Stories visible');
        } else {
            console.log('❌ Browse Stories hidden from student');
            results.failed++;
            results.details.push('❌ Browse Stories hidden');
        }

        // Test 3: Direct access to admin pages
        console.log('📋 Test 3: Direct admin page access');
        
        // Try admin.html
        await page.goto(`${BASE_URL}/admin.html`);
        await page.waitForTimeout(2000);
        
        if (!page.url().includes('admin.html')) {
            console.log('✅ Student blocked from admin.html');
            results.passed++;
            results.details.push('✅ admin.html access blocked');
        } else {
            console.log('❌ Student can access admin.html');
            results.failed++;
            results.details.push('❌ admin.html accessible');
        }

        // Try admin-browse-stories.html  
        await page.goto(`${BASE_URL}/admin-browse-stories.html`);
        await page.waitForTimeout(2000);
        
        if (!page.url().includes('admin-browse-stories.html')) {
            console.log('✅ Student blocked from admin-browse-stories.html');
            results.passed++;
            results.details.push('✅ admin-browse-stories.html access blocked');
        } else {
            console.log('❌ Student can access admin-browse-stories.html');
            results.failed++;
            results.details.push('❌ admin-browse-stories.html accessible');
        }

        // Test 4: Check user role display
        console.log('📋 Test 4: User role verification');
        await page.goto(`${BASE_URL}/dashboard.html`);
        await page.waitForTimeout(2000);
        
        const userRole = await page.$eval('#userRole', el => el.textContent).catch(() => 'not found');
        if (userRole.toLowerCase().includes('student')) {
            console.log('✅ User role correctly shows Student');
            results.passed++;
            results.details.push('✅ User role correct');
        } else {
            console.log(`❌ User role shows: ${userRole}`);
            results.failed++;
            results.details.push(`❌ User role incorrect: ${userRole}`);
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
        results.failed++;
        results.details.push(`❌ Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // Results
    console.log('\n' + '='.repeat(50));
    console.log('🔒 STUDENT SECURITY TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total: ${results.passed + results.failed}`);
    
    if (results.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED - Students are secure!');
    } else {
        console.log('\n⚠️  SECURITY ISSUES FOUND');
    }
    
    console.log('\n📋 Details:');
    results.details.forEach(detail => console.log(`  ${detail}`));
    console.log('='.repeat(50));

    return results;
}

// Run test
quickSecurityTest().then(results => {
    process.exit(results.failed === 0 ? 0 : 1);
}).catch(error => {
    console.error('Runner error:', error);
    process.exit(1);
});