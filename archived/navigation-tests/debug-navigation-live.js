const puppeteer = require('puppeteer');

/**
 * Debug navigation loading to see what's actually happening
 */

async function debugNavigation() {
    console.log('🔍 Debug: Checking navigation loading...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    // Listen to console logs from the page
    page.on('console', msg => {
        console.log('PAGE LOG:', msg.text());
    });
    
    // Listen to page errors
    page.on('pageerror', error => {
        console.log('PAGE ERROR:', error.message);
    });
    
    try {
        console.log('📄 Loading dashboard page...');
        await page.goto('https://frontend-production-b75b.up.railway.app/dashboard.html', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        console.log('⏳ Waiting for navigation to load...');
        await page.waitForSelector('#vidpodNavbar', { timeout: 10000 });
        
        // Set up test user
        console.log('👤 Setting up teacher user...');
        await page.evaluate(() => {
            const teacherUser = {
                id: 2,
                name: 'Test Teacher',
                username: 'teacher@vidpod.com', 
                email: 'teacher@vidpod.com',
                role: 'teacher'
            };
            localStorage.setItem('user', JSON.stringify(teacherUser));
            localStorage.setItem('token', 'test-token');
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check navigation structure
        console.log('\n🔍 Checking navigation structure...');
        const navStructure = await page.evaluate(() => {
            const navbar = document.getElementById('vidpodNavbar');
            if (!navbar) return 'Navigation not found';
            
            const structure = {
                exists: true,
                innerHTML: navbar.innerHTML.substring(0, 500) + '...',
                allButtons: Array.from(document.querySelectorAll('button')).map(btn => ({
                    id: btn.id,
                    class: btn.className,
                    text: btn.textContent?.trim(),
                    visible: window.getComputedStyle(btn).display !== 'none'
                })),
                allElementsWithDataRole: Array.from(document.querySelectorAll('[data-role]')).map(el => ({
                    tag: el.tagName,
                    id: el.id,
                    class: el.className,
                    dataRole: el.getAttribute('data-role'),
                    text: el.textContent?.trim(),
                    visible: window.getComputedStyle(el).display !== 'none'
                }))
            };
            
            return structure;
        });

        console.log('Navigation structure:', JSON.stringify(navStructure, null, 2));

        // Check if VidPODNav is available
        console.log('\n🔍 Checking VidPODNav...');
        const navStatus = await page.evaluate(() => {
            return {
                VidPODNavExists: typeof window.VidPODNav !== 'undefined',
                NavigationLoaderExists: typeof window.NavigationLoader !== 'undefined',
                currentUser: window.VidPODNav?.currentUser || 'Not available',
                allScripts: Array.from(document.querySelectorAll('script')).map(s => s.src).filter(Boolean)
            };
        });

        console.log('Navigation status:', JSON.stringify(navStatus, null, 2));

        // Trigger navigation update manually
        console.log('\n🔄 Triggering navigation update...');
        await page.evaluate(() => {
            if (window.VidPODNav) {
                const user = JSON.parse(localStorage.getItem('user'));
                console.log('Updating navigation with user:', user);
                window.VidPODNav.updateUser(user);
            }
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check elements after update
        console.log('\n🔍 Checking elements after update...');
        const elementsAfterUpdate = await page.evaluate(() => {
            return {
                csvImportBtn: {
                    exists: !!document.getElementById('csvImportBtn'),
                    element: document.getElementById('csvImportBtn')?.outerHTML || 'Not found'
                },
                allDataRoleElements: Array.from(document.querySelectorAll('[data-role]')).map(el => ({
                    tag: el.tagName,
                    id: el.id,
                    class: el.className,
                    dataRole: el.getAttribute('data-role'),
                    text: el.textContent?.trim(),
                    display: window.getComputedStyle(el).display,
                    visibility: window.getComputedStyle(el).visibility
                }))
            };
        });

        console.log('Elements after update:', JSON.stringify(elementsAfterUpdate, null, 2));

        // Keep browser open for manual inspection
        console.log('\n🔍 Keeping browser open for manual inspection...');
        console.log('Press Enter to close when done inspecting...');
        
        // Wait for user input
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });

    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await browser.close();
    }
}

debugNavigation().catch(console.error);