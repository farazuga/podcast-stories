/**
 * Navigation Structure Test
 * Tests the navigation.html structure for proper role-based security
 */

const puppeteer = require('puppeteer');
const BASE_URL = 'http://localhost:3000';

async function testNavigationStructure() {
    console.log('🔍 Testing Navigation Structure for Role-Based Security...\n');
    
    let browser;
    let results = { passed: 0, failed: 0, details: [] };

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Test 1: Check navigation template structure
        console.log('📋 Test 1: Navigation template structure');
        await page.goto(`${BASE_URL}/includes/navigation.html`);
        
        // Get all navigation items with data-role attributes
        const navItems = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('[data-role]').forEach(item => {
                const page = item.getAttribute('data-page');
                const role = item.getAttribute('data-role');
                const href = item.getAttribute('href');
                const text = item.textContent.trim();
                items.push({ page, role, href, text });
            });
            return items;
        });

        console.log('📋 Found navigation items with role restrictions:');
        navItems.forEach(item => {
            console.log(`  - ${item.text} (${item.page}) - Roles: ${item.role}`);
        });

        // Test admin items have correct role restrictions
        const adminBrowseStories = navItems.find(item => item.page === 'admin-browse-stories');
        const adminPanel = navItems.find(item => item.page === 'admin');
        const addStory = navItems.find(item => item.page === 'add-story');
        const teacherDashboard = navItems.find(item => item.page === 'teacher-dashboard');

        if (adminBrowseStories && adminBrowseStories.role === 'amitrace_admin') {
            console.log('✅ Admin Browse Stories correctly restricted to amitrace_admin');
            results.passed++;
            results.details.push('✅ Admin Browse Stories - correct role restriction');
        } else {
            console.log('❌ Admin Browse Stories role restriction incorrect');
            results.failed++;
            results.details.push('❌ Admin Browse Stories - incorrect role restriction');
        }

        if (adminPanel && adminPanel.role === 'amitrace_admin') {
            console.log('✅ Admin Panel correctly restricted to amitrace_admin');
            results.passed++;
            results.details.push('✅ Admin Panel - correct role restriction');
        } else {
            console.log('❌ Admin Panel role restriction incorrect');
            results.failed++;
            results.details.push('❌ Admin Panel - incorrect role restriction');
        }

        if (addStory && addStory.role === 'teacher,amitrace_admin') {
            console.log('✅ Add Story correctly restricted to teacher,amitrace_admin');
            results.passed++;
            results.details.push('✅ Add Story - correct role restriction');
        } else {
            console.log('❌ Add Story role restriction incorrect');
            results.failed++;
            results.details.push('❌ Add Story - incorrect role restriction');
        }

        if (teacherDashboard && teacherDashboard.role === 'teacher') {
            console.log('✅ Teacher Dashboard correctly restricted to teacher');
            results.passed++;
            results.details.push('✅ Teacher Dashboard - correct role restriction');
        } else {
            console.log('❌ Teacher Dashboard role restriction incorrect');
            results.failed++;
            results.details.push('❌ Teacher Dashboard - incorrect role restriction');
        }

        // Test 2: Check items without role restrictions (should be visible to students)
        console.log('\n📋 Test 2: Student-accessible navigation items');
        
        const allNavItems = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.nav-item[data-page]').forEach(item => {
                const page = item.getAttribute('data-page');
                const role = item.getAttribute('data-role');
                const text = item.textContent.trim();
                items.push({ page, role, text });
            });
            return items;
        });

        const dashboardItem = allNavItems.find(item => item.page === 'dashboard');
        const storiesItem = allNavItems.find(item => item.page === 'stories');

        if (dashboardItem && !dashboardItem.role) {
            console.log('✅ Dashboard accessible to all users (no role restriction)');
            results.passed++;
            results.details.push('✅ Dashboard - no role restriction');
        } else {
            console.log('❌ Dashboard has unexpected role restriction');
            results.failed++;
            results.details.push('❌ Dashboard - has role restriction');
        }

        if (storiesItem && !storiesItem.role) {
            console.log('✅ Browse Stories accessible to all users (no role restriction)');
            results.passed++;
            results.details.push('✅ Browse Stories - no role restriction');
        } else {
            console.log('❌ Browse Stories has unexpected role restriction');
            results.failed++;
            results.details.push('❌ Browse Stories - has role restriction');
        }

        // Test 3: Check mobile navigation has same restrictions
        console.log('\n📋 Test 3: Mobile navigation structure');
        
        const mobileNavItems = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.mobile-nav [data-role]').forEach(item => {
                const page = item.getAttribute('data-page');
                const role = item.getAttribute('data-role');
                const text = item.textContent.trim();
                items.push({ page, role, text });
            });
            return items;
        });

        const mobileAdminBrowse = mobileNavItems.find(item => item.page === 'admin-browse-stories');
        const mobileAdminPanel = mobileNavItems.find(item => item.page === 'admin');

        if (mobileAdminBrowse && mobileAdminBrowse.role === 'amitrace_admin') {
            console.log('✅ Mobile Admin Browse Stories correctly restricted');
            results.passed++;
            results.details.push('✅ Mobile Admin Browse Stories - correct restriction');
        } else {
            console.log('❌ Mobile Admin Browse Stories restriction incorrect');
            results.failed++;
            results.details.push('❌ Mobile Admin Browse Stories - incorrect restriction');
        }

        if (mobileAdminPanel && mobileAdminPanel.role === 'amitrace_admin') {
            console.log('✅ Mobile Admin Panel correctly restricted');
            results.passed++;
            results.details.push('✅ Mobile Admin Panel - correct restriction');
        } else {
            console.log('❌ Mobile Admin Panel restriction incorrect');
            results.failed++;
            results.details.push('❌ Mobile Admin Panel - incorrect restriction');
        }

        // Test 4: Simulate role visibility logic
        console.log('\n📋 Test 4: Role visibility simulation');
        
        const studentVisibleItems = allNavItems.filter(item => 
            !item.role || item.role.split(',').map(r => r.trim()).includes('student')
        );
        
        const teacherVisibleItems = allNavItems.filter(item => 
            !item.role || item.role.split(',').map(r => r.trim()).includes('teacher')
        );
        
        const adminVisibleItems = allNavItems.filter(item => 
            !item.role || item.role.split(',').map(r => r.trim()).includes('amitrace_admin')
        );

        console.log(`📊 Student can see: ${studentVisibleItems.map(i => i.page).join(', ')}`);
        console.log(`📊 Teacher can see: ${teacherVisibleItems.map(i => i.page).join(', ')}`);
        console.log(`📊 Admin can see: ${adminVisibleItems.map(i => i.page).join(', ')}`);

        // Students should only see dashboard, stories
        const expectedStudentItems = ['dashboard', 'stories'];
        const actualStudentItems = studentVisibleItems.map(i => i.page);
        
        const studentItemsMatch = expectedStudentItems.every(item => actualStudentItems.includes(item)) &&
                                actualStudentItems.length === expectedStudentItems.length;

        if (studentItemsMatch) {
            console.log('✅ Student navigation scope is correct');
            results.passed++;
            results.details.push('✅ Student navigation scope correct');
        } else {
            console.log('❌ Student navigation scope incorrect');
            results.failed++;
            results.details.push('❌ Student navigation scope incorrect');
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
    console.log('\n' + '='.repeat(60));
    console.log('🔍 NAVIGATION STRUCTURE TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total: ${results.passed + results.failed}`);
    
    if (results.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED - Navigation structure is secure!');
    } else {
        console.log('\n⚠️  NAVIGATION STRUCTURE ISSUES FOUND');
    }
    
    console.log('\n📋 Details:');
    results.details.forEach(detail => console.log(`  ${detail}`));
    console.log('='.repeat(60));

    return results;
}

// Run test
testNavigationStructure().then(results => {
    process.exit(results.failed === 0 ? 0 : 1);
}).catch(error => {
    console.error('Runner error:', error);
    process.exit(1);
});