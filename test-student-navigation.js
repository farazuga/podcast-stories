/**
 * Test Student Navigation - Only Dashboard and Browse Stories should be visible
 */

const puppeteer = require('puppeteer');

async function testStudentNavigation() {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    console.log('🎓 Testing Student Navigation\n');
    console.log('='*40 + '\n');
    
    const page = await browser.newPage();
    
    try {
        await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Clear storage
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        // Login as student
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        
        await page.waitForNavigation({ timeout: 10000 });
        
        // Wait for navigation to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check navigation items
        const navCheck = await page.evaluate(() => {
            const visibleNavItems = Array.from(document.querySelectorAll('.nav-item'))
                .filter(item => item.offsetParent !== null)
                .map(item => item.textContent.trim());
            
            const hasDashboard = visibleNavItems.some(text => 
                text.toLowerCase().includes('dashboard'));
            const hasBrowseStories = visibleNavItems.some(text => 
                text.toLowerCase().includes('browse stories') && !text.toLowerCase().includes('admin'));
            const hasAddStory = visibleNavItems.some(text => 
                text.toLowerCase().includes('add story'));
            const hasMyClasses = visibleNavItems.some(text => 
                text.toLowerCase().includes('my classes'));
            const hasAdminBrowse = visibleNavItems.some(text => 
                text.toLowerCase().includes('admin browse'));
            const hasAdminPanel = visibleNavItems.some(text => 
                text.toLowerCase().includes('admin panel'));
            
            return {
                visibleItems: visibleNavItems.slice(0, 10), // First 10 items
                hasDashboard,
                hasBrowseStories,
                hasAddStory,
                hasMyClasses,
                hasAdminBrowse,
                hasAdminPanel
            };
        });
        
        console.log('✅ Student logged in successfully');
        console.log('📋 Visible nav items for student:');
        navCheck.visibleItems.forEach(item => {
            console.log(`   - ${item}`);
        });
        
        console.log('\n📊 Student Navigation Results:');
        console.log(`   Dashboard visible: ${navCheck.hasDashboard ? '✅ YES' : '❌ NO'}`);
        console.log(`   Browse Stories visible: ${navCheck.hasBrowseStories ? '✅ YES' : '❌ NO'}`);
        console.log(`   Add Story hidden: ${!navCheck.hasAddStory ? '✅ YES' : '❌ NO'}`);
        console.log(`   My Classes hidden: ${!navCheck.hasMyClasses ? '✅ YES' : '❌ NO'}`);
        console.log(`   Admin Browse hidden: ${!navCheck.hasAdminBrowse ? '✅ YES' : '❌ NO'}`);
        console.log(`   Admin Panel hidden: ${!navCheck.hasAdminPanel ? '✅ YES' : '❌ NO'}`);
        
        // Summary
        const correctItems = navCheck.hasDashboard && navCheck.hasBrowseStories;
        const hiddenItems = !navCheck.hasAddStory && !navCheck.hasMyClasses && !navCheck.hasAdminBrowse && !navCheck.hasAdminPanel;
        
        console.log('\n' + '='*40);
        if (correctItems && hiddenItems) {
            console.log('✅ STUDENT NAVIGATION: PERFECT');
            console.log('   Students see exactly: Dashboard + Browse Stories');
        } else {
            console.log('❌ STUDENT NAVIGATION: NEEDS FIX');
            if (!correctItems) {
                console.log('   Missing required items (Dashboard/Browse Stories)');
            }
            if (!hiddenItems) {
                console.log('   Showing restricted items (Add Story/My Classes/Admin)');
            }
        }
        
    } catch (error) {
        console.log('❌ Student navigation test failed:', error.message);
    }
    
    await page.close();
    await browser.close();
}

// Run test
testStudentNavigation().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});