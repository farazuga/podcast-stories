const puppeteer = require('puppeteer');

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function debugTeacherTab() {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 100,
        devtools: true,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    // Enable console logging
    page.on('console', msg => {
        console.log('Browser console:', msg.type(), msg.text());
    });

    try {
        console.log('\n=== Debugging Teacher Tab Issue ===\n');

        // Login as admin
        await page.goto(`${PRODUCTION_URL}/index.html`, { waitUntil: 'networkidle2' });
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);

        // Go to admin panel and wait for it to load
        await page.goto(`${PRODUCTION_URL}/admin.html`, { waitUntil: 'networkidle2' });
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

        console.log('\n=== Analyzing Tab System ===\n');
        
        // Check the DOM structure
        const domAnalysis = await page.evaluate(() => {
            const results = {};
            
            // Check for tab buttons
            const tabButtons = document.querySelectorAll('.tab-button');
            results.tabButtons = Array.from(tabButtons).map(btn => ({
                text: btn.textContent.trim(),
                onclick: btn.getAttribute('onclick'),
                visible: btn.offsetParent !== null,
                id: btn.id
            }));
            
            // Check for tab contents
            const tabContents = document.querySelectorAll('[id$="-tab"]');
            results.tabContents = Array.from(tabContents).map(tab => ({
                id: tab.id,
                display: window.getComputedStyle(tab).display,
                visible: tab.offsetParent !== null
            }));
            
            // Specifically look for teacher requests elements
            const teacherRequestsTab = document.getElementById('teacher-requests-tab') || document.getElementById('teacher-requests');
            results.teacherRequestsTab = teacherRequestsTab ? {
                id: teacherRequestsTab.id,
                display: window.getComputedStyle(teacherRequestsTab).display,
                innerHTML: teacherRequestsTab.innerHTML.substring(0, 300),
                visible: teacherRequestsTab.offsetParent !== null
            } : null;
            
            // Check for pending requests container
            const pendingContainer = document.getElementById('pendingRequests');
            results.pendingContainer = pendingContainer ? {
                innerHTML: pendingContainer.innerHTML.substring(0, 500),
                children: pendingContainer.children.length,
                visible: pendingContainer.offsetParent !== null
            } : null;
            
            // Check for teacher request cards
            const cards = document.querySelectorAll('.teacher-request-card');
            results.teacherCards = {
                count: cards.length,
                cards: Array.from(cards).map(card => ({
                    innerHTML: card.innerHTML.substring(0, 200),
                    visible: card.offsetParent !== null
                }))
            };
            
            return results;
        });
        
        console.log('Tab Buttons:', JSON.stringify(domAnalysis.tabButtons, null, 2));
        console.log('Tab Contents:', JSON.stringify(domAnalysis.tabContents, null, 2));
        console.log('Teacher Requests Tab:', JSON.stringify(domAnalysis.teacherRequestsTab, null, 2));
        console.log('Pending Container:', JSON.stringify(domAnalysis.pendingContainer, null, 2));
        console.log('Teacher Cards:', JSON.stringify(domAnalysis.teacherCards, null, 2));
        
        console.log('\n=== Trying Manual Tab Switch ===\n');
        
        // Try to click the teacher requests tab manually
        const tabClickResult = await page.evaluate(() => {
            // Look for any button that might be the teacher requests tab
            const buttons = Array.from(document.querySelectorAll('.tab-button, button'));
            
            for (let btn of buttons) {
                if (btn.textContent.includes('Teacher') || btn.textContent.includes('Requests')) {
                    console.log('Found teacher button:', btn.textContent);
                    btn.click();
                    return { success: true, buttonText: btn.textContent };
                }
            }
            
            // Also try calling showTab directly if it exists
            if (typeof showTab === 'function') {
                console.log('Calling showTab("teacher-requests")');
                showTab('teacher-requests');
                return { success: true, method: 'showTab function' };
            }
            
            return { success: false, reason: 'No teacher button found and no showTab function' };
        });
        
        console.log('Tab click result:', tabClickResult);
        
        // Wait and check again
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
        
        console.log('\n=== Post-Click Analysis ===\n');
        
        const postClickAnalysis = await page.evaluate(() => {
            // Check what's now visible
            const teacherTab = document.getElementById('teacher-requests-tab') || document.getElementById('teacher-requests');
            const pendingContainer = document.getElementById('pendingRequests');
            const cards = document.querySelectorAll('.teacher-request-card');
            
            return {
                teacherTabVisible: teacherTab ? teacherTab.offsetParent !== null : false,
                teacherTabDisplay: teacherTab ? window.getComputedStyle(teacherTab).display : 'not found',
                pendingContainerVisible: pendingContainer ? pendingContainer.offsetParent !== null : false,
                cardCount: cards.length,
                currentActiveTab: document.querySelector('.tab-content:not([style*="display: none"])')?.id || 'unknown'
            };
        });
        
        console.log('Post-click analysis:', postClickAnalysis);
        
        console.log('\n=== Manual Inspection ===');
        console.log('Browser window will remain open for manual inspection.');
        console.log('Please check:');
        console.log('1. Are the tab buttons visible and clickable?');
        console.log('2. Does clicking "Teacher Requests" manually work?');
        console.log('3. Are there teacher request cards in the DOM?');
        console.log('4. Is the showTab() function working?');
        console.log('\nPress Ctrl+C to close when done.');
        
        // Keep browser open
        await new Promise(() => {});

    } catch (error) {
        console.error('Debug failed:', error);
        await browser.close();
    }
}

debugTeacherTab().catch(console.error);