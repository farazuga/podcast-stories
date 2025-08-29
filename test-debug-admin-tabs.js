/**
 * Debug Admin Panel Tab System
 */

const puppeteer = require('puppeteer');

async function debugAdminTabs() {
    console.log('🔧 Debugging Admin Panel Tab System');
    console.log('===================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const page = await browser.newPage();
    
    // Enable detailed console logging
    page.on('console', msg => {
        console.log(`[BROWSER ${msg.type()}]: ${msg.text()}`);
    });
    
    try {
        // Login first
        console.log('1️⃣ Logging in...');
        await page.goto('https://podcast-stories-production.up.railway.app/index.html');
        await page.evaluate(() => { localStorage.clear(); });
        
        await page.waitForSelector('#email');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('2️⃣ Checking admin panel structure...');
        
        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const tabInfo = await page.evaluate(() => {
            // Check if showTab function exists
            const hasShowTabFunction = typeof window.showTab === 'function';
            
            // Get all tab buttons
            const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
            const tabButtonInfo = tabButtons.map(btn => ({
                text: btn.textContent.trim(),
                dataTab: btn.getAttribute('data-tab'),
                classes: btn.className,
                visible: window.getComputedStyle(btn).display !== 'none'
            }));
            
            // Get all tab content divs
            const tabContents = Array.from(document.querySelectorAll('.tab-content'));
            const tabContentInfo = tabContents.map(tab => ({
                id: tab.id,
                classes: tab.className,
                display: window.getComputedStyle(tab).display,
                visible: window.getComputedStyle(tab).display !== 'none'
            }));
            
            // Check if teacher requests tab exists
            const teachersTab = document.getElementById('teachers-tab');
            const teachersTabInfo = teachersTab ? {
                id: teachersTab.id,
                classes: teachersTab.className,
                display: window.getComputedStyle(teachersTab).display,
                innerHTML: teachersTab.innerHTML.length
            } : null;
            
            return {
                hasShowTabFunction,
                tabButtons: tabButtonInfo,
                tabContents: tabContentInfo,
                teachersTab: teachersTabInfo,
                bodyClasses: document.body.className
            };
        });
        
        console.log('\n📊 Tab System Analysis:');
        console.log(`   showTab function exists: ${tabInfo.hasShowTabFunction}`);
        console.log(`   Body classes: ${tabInfo.bodyClasses}`);
        
        console.log('\n🔘 Tab Buttons:');
        tabInfo.tabButtons.forEach(btn => {
            console.log(`   - ${btn.text} (data-tab: ${btn.dataTab}, visible: ${btn.visible})`);
        });
        
        console.log('\n📁 Tab Contents:');
        tabInfo.tabContents.forEach(content => {
            console.log(`   - ${content.id} (display: ${content.display}, visible: ${content.visible})`);
        });
        
        if (tabInfo.teachersTab) {
            console.log(`\n👥 Teachers Tab: ${tabInfo.teachersTab.id} (display: ${tabInfo.teachersTab.display})`);
        } else {
            console.log('\n❌ Teachers tab not found!');
        }
        
        console.log('\n3️⃣ Testing tab click...');
        
        // Try clicking the teachers tab button
        const teachersButton = await page.$('.tab-btn[data-tab="teachers"]');
        if (teachersButton) {
            console.log('   Found teachers tab button, clicking...');
            await teachersButton.click();
            
            // Wait and check if it worked
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const afterClick = await page.evaluate(() => {
                const teachersTab = document.getElementById('teachers-tab');
                const activeButton = document.querySelector('.tab-btn.active');
                
                return {
                    teachersTabVisible: teachersTab ? window.getComputedStyle(teachersTab).display !== 'none' : false,
                    activeButtonText: activeButton ? activeButton.textContent.trim() : 'none',
                    activeButtonDataTab: activeButton ? activeButton.getAttribute('data-tab') : 'none'
                };
            });
            
            console.log('   After click:');
            console.log(`     Teachers tab visible: ${afterClick.teachersTabVisible}`);
            console.log(`     Active button: ${afterClick.activeButtonText} (${afterClick.activeButtonDataTab})`);
            
            if (!afterClick.teachersTabVisible) {
                console.log('\n🔧 Attempting manual showTab call...');
                await page.evaluate(() => {
                    if (typeof window.showTab === 'function') {
                        window.showTab('teachers');
                    }
                });
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const manualResult = await page.evaluate(() => {
                    const teachersTab = document.getElementById('teachers-tab');
                    return teachersTab ? window.getComputedStyle(teachersTab).display !== 'none' : false;
                });
                
                console.log(`     Manual showTab result: ${manualResult}`);
            }
        } else {
            console.log('   ❌ Teachers tab button not found!');
        }
        
        // Take screenshot for visual inspection
        await page.screenshot({ path: 'admin-tabs-debug.png', fullPage: true });
        console.log('\n📸 Screenshot saved as admin-tabs-debug.png');
        
        // Keep browser open for manual inspection
        console.log('\n🔍 Browser staying open for manual inspection...');
        console.log('   Press Ctrl+C to close');
        
        await new Promise(() => {}); // Keep open indefinitely
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        await page.screenshot({ path: 'admin-tabs-error.png' });
    } finally {
        // Browser will stay open for manual inspection
    }
}

debugAdminTabs().catch(console.error);