/**
 * Quick Admin Debug Test
 */

const puppeteer = require('puppeteer');

async function quickAdminDebug() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        // Login
        await page.goto('https://podcast-stories-production.up.railway.app/index.html');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        // Wait for admin panel
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check tab system
        const result = await page.evaluate(() => {
            const showTabExists = typeof window.showTab === 'function';
            const teachersButton = document.querySelector('.tab-btn[data-tab="teachers"]');
            const teachersTab = document.getElementById('teachers-tab');
            
            // Try to click teachers tab
            if (teachersButton) {
                teachersButton.click();
            }
            
            setTimeout(() => {
                // Check after click
                const isVisible = teachersTab && window.getComputedStyle(teachersTab).display !== 'none';
                console.log('Teachers tab visible after click:', isVisible);
            }, 1000);
            
            return {
                showTabExists,
                hasTeachersButton: !!teachersButton,
                hasTeachersTab: !!teachersTab,
                teachersTabDisplay: teachersTab ? window.getComputedStyle(teachersTab).display : 'not found'
            };
        });
        
        console.log('🔍 Quick Admin Debug Results:');
        console.log(`   showTab function exists: ${result.showTabExists}`);
        console.log(`   Teachers button exists: ${result.hasTeachersButton}`);
        console.log(`   Teachers tab exists: ${result.hasTeachersTab}`);
        console.log(`   Teachers tab display: ${result.teachersTabDisplay}`);
        
        // Wait a bit more and check again
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const finalCheck = await page.evaluate(() => {
            const teachersTab = document.getElementById('teachers-tab');
            return teachersTab ? window.getComputedStyle(teachersTab).display !== 'none' : false;
        });
        
        console.log(`   Teachers tab visible after wait: ${finalCheck}`);
        
        if (!finalCheck) {
            console.log('\n❌ ISSUE: Teachers tab not becoming visible');
            console.log('   Possible causes:');
            console.log('   - showTab function not working');
            console.log('   - Click event not registered');
            console.log('   - CSS/JS not loading properly');
            console.log('   - Tab content not being populated');
        }
        
    } catch (error) {
        console.error('❌ Quick debug failed:', error.message);
    } finally {
        await browser.close();
    }
}

quickAdminDebug();