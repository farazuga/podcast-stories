/**
 * Quick Test for Recent Fixes
 * Focused test to verify navigation and teacher request fixes
 */

const puppeteer = require('puppeteer');

async function quickTest() {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    console.log('🚀 Quick Test for Recent Fixes\n');
    console.log('='*50 + '\n');
    
    // Test 1: Teacher Navigation
    console.log('📍 TEST 1: Teacher Navigation');
    const teacherPage = await browser.newPage();
    
    try {
        await teacherPage.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Clear storage
        await teacherPage.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        // Login as teacher
        await teacherPage.type('#email', 'teacher@vidpod.com');
        await teacherPage.type('#password', 'vidpod');
        await teacherPage.click('button[type="submit"]');
        
        await teacherPage.waitForNavigation({ timeout: 10000 });
        
        // Wait for navigation to load
        await teacherPage.waitForSelector('.nav-item', { timeout: 5000 });
        
        // Check navigation items
        const navCheck = await teacherPage.evaluate(() => {
            const visibleNavItems = Array.from(document.querySelectorAll('.nav-item'))
                .filter(item => item.offsetParent !== null)
                .map(item => item.textContent.trim());
            
            const hasAdminBrowse = visibleNavItems.some(text => 
                text.toLowerCase().includes('admin browse'));
            const hasSettings = visibleNavItems.some(text => 
                text.toLowerCase().includes('settings'));
            const hasAdminPanel = visibleNavItems.some(text => 
                text.toLowerCase().includes('admin panel'));
            
            return {
                visibleItems: visibleNavItems.slice(0, 5), // First 5 items
                hasAdminBrowse,
                hasSettings,
                hasAdminPanel
            };
        });
        
        console.log('✅ Teacher logged in successfully');
        console.log('   Visible nav items:', navCheck.visibleItems.join(', '));
        console.log('   Admin Browse Stories visible:', navCheck.hasAdminBrowse ? '❌ YES' : '✅ NO');
        console.log('   Settings visible:', navCheck.hasSettings ? '❌ YES' : '✅ NO');
        console.log('   Admin Panel visible:', navCheck.hasAdminPanel ? '❌ YES' : '✅ NO');
        
    } catch (error) {
        console.log('❌ Teacher navigation test failed:', error.message);
    }
    
    await teacherPage.close();
    
    // Test 2: Admin Teacher Requests
    console.log('\n📍 TEST 2: Admin Teacher Requests');
    const adminPage = await browser.newPage();
    
    try {
        await adminPage.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Clear storage
        await adminPage.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        // Login as admin
        await adminPage.type('#email', 'admin@vidpod.com');
        await adminPage.type('#password', 'vidpod');
        await adminPage.click('button[type="submit"]');
        
        await adminPage.waitForNavigation({ timeout: 10000 });
        console.log('✅ Admin logged in successfully');
        
        // Go to admin panel
        await adminPage.goto(`${baseUrl}/admin.html`, { waitUntil: 'networkidle0' });
        
        // Click teacher requests tab
        await adminPage.evaluate(() => {
            if (typeof window.showTab === 'function') {
                window.showTab('teachers');
            } else {
                const btn = document.querySelector('[data-tab="teachers"], .tab-btn:nth-child(3)');
                if (btn) btn.click();
            }
        });
        
        // Wait for data to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check filter and buttons
        const requestsCheck = await adminPage.evaluate(() => {
            // Check filter
            const statusFilter = document.getElementById('statusFilter');
            const allStatusOption = statusFilter ? 
                Array.from(statusFilter.options).find(opt => 
                    opt.textContent.toLowerCase().includes('all')) : null;
            
            // Check table
            const table = document.getElementById('teacherRequestsTable');
            const rows = table ? Array.from(table.querySelectorAll('tr')) : [];
            
            // Check action buttons in first row
            let actionButtons = [];
            if (rows.length > 0) {
                const buttons = rows[0].querySelectorAll('button');
                actionButtons = Array.from(buttons).map(btn => ({
                    title: btn.getAttribute('title') || btn.textContent.trim()
                }));
            }
            
            return {
                hasAllStatusFilter: !!allStatusOption,
                allStatusValue: allStatusOption?.value,
                requestCount: rows.length,
                actionButtons: actionButtons
            };
        });
        
        console.log('✅ Teacher requests tab loaded');
        console.log('   "All Status" filter exists:', requestsCheck.hasAllStatusFilter ? '✅ YES' : '❌ NO');
        console.log('   "All Status" value:', requestsCheck.allStatusValue === '' ? '✅ Empty (correct)' : `❌ "${requestsCheck.allStatusValue}"`);
        console.log('   Requests in table:', requestsCheck.requestCount);
        
        if (requestsCheck.actionButtons.length > 0) {
            console.log('   Action buttons found:');
            requestsCheck.actionButtons.forEach(btn => {
                console.log(`      - ${btn.title}`);
            });
            
            const hasEdit = requestsCheck.actionButtons.some(b => 
                b.title.toLowerCase().includes('edit') || b.title.includes('✏️'));
            const hasReset = requestsCheck.actionButtons.some(b => 
                b.title.toLowerCase().includes('reset') || b.title.includes('🔑'));
            const hasDelete = requestsCheck.actionButtons.some(b => 
                b.title.toLowerCase().includes('delete') || b.title.includes('🗑️'));
            
            console.log('   Edit button:', hasEdit ? '✅ YES' : '❌ NO');
            console.log('   Reset Password button:', hasReset ? '✅ YES' : '❌ NO');
            console.log('   Delete button:', hasDelete ? '✅ YES' : '❌ NO');
        } else {
            console.log('   No requests to check buttons');
        }
        
    } catch (error) {
        console.log('❌ Admin teacher requests test failed:', error.message);
    }
    
    await adminPage.close();
    
    // Summary
    console.log('\n' + '='*50);
    console.log('📊 TEST SUMMARY');
    console.log('='*50);
    console.log('\n✅ Deployment is active and responding');
    console.log('Check results above for specific feature status\n');
    
    await browser.close();
}

// Run test
quickTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});