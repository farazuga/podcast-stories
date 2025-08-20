const puppeteer = require('puppeteer');

async function testAdminPanel() {
    const browser = await puppeteer.launch({ 
        headless: false, // Show browser for debugging
        defaultViewport: null,
        args: ['--start-maximized'],
        devtools: true // Open DevTools
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔧 Starting Admin Panel Debug Test...\n');
        
        // Step 1: Login as admin
        console.log('📝 Step 1: Logging in as admin...');
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await page.waitForSelector('#email');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        
        await page.waitForNavigation({ timeout: 10000 });
        console.log(`✅ Login successful! Current URL: ${page.url()}`);
        
        // Step 2: Check if we're on admin panel
        const currentUrl = page.url();
        if (!currentUrl.includes('admin.html')) {
            console.log('⚠️  Not on admin panel, navigating...');
            await page.goto('https://podcast-stories-production.up.railway.app/admin.html');
            await page.waitForTimeout(2000);
        }
        
        // Step 3: Check page title and main elements
        console.log('\n📊 Step 2: Analyzing admin panel structure...');
        const pageTitle = await page.title();
        console.log(`Page title: ${pageTitle}`);
        
        // Check for main admin sections
        const adminSections = await page.evaluate(() => {
            const sections = [];
            
            // Check for tab buttons
            const tabButtons = document.querySelectorAll('button[onclick*="showTab"]');
            tabButtons.forEach(btn => {
                sections.push({
                    type: 'tab',
                    text: btn.textContent.trim(),
                    onclick: btn.getAttribute('onclick')
                });
            });
            
            // Check for main containers
            const containers = document.querySelectorAll('[id*="tab"], .admin-section, .tab-content');
            containers.forEach(container => {
                sections.push({
                    type: 'container',
                    id: container.id,
                    class: container.className,
                    visible: container.style.display !== 'none'
                });
            });
            
            return sections;
        });
        
        console.log('Admin sections found:', adminSections);
        
        // Step 4: Test tab functionality
        console.log('\n🔄 Step 3: Testing tab functionality...');
        
        const tabs = ['schools', 'teachers', 'requests', 'stories', 'tags'];
        
        for (const tab of tabs) {
            console.log(`\n  Testing ${tab} tab...`);
            
            try {
                // Check if showTab function exists
                const showTabExists = await page.evaluate(() => {
                    return typeof window.showTab === 'function';
                });
                
                console.log(`    showTab function exists: ${showTabExists}`);
                
                if (showTabExists) {
                    // Try to call showTab function
                    await page.evaluate((tabName) => {
                        window.showTab(tabName);
                    }, tab);
                    
                    await page.waitForTimeout(1000);
                    
                    // Check if tab is now visible
                    const tabVisible = await page.evaluate((tabName) => {
                        const tabContent = document.getElementById(`${tabName}Tab`);
                        return tabContent ? tabContent.style.display !== 'none' : false;
                    }, tab);
                    
                    console.log(`    ${tab} tab visible: ${tabVisible}`);
                } else {
                    // Try clicking the button directly
                    const buttonSelector = `button[onclick*="showTab('${tab}')"]`;
                    const buttonExists = await page.$(buttonSelector);
                    
                    if (buttonExists) {
                        await page.click(buttonSelector);
                        await page.waitForTimeout(1000);
                        console.log(`    Clicked ${tab} button directly`);
                    } else {
                        console.log(`    ❌ No button found for ${tab}`);
                    }
                }
            } catch (error) {
                console.log(`    ❌ Error testing ${tab}: ${error.message}`);
            }
        }
        
        // Step 5: Test JavaScript console for errors
        console.log('\n🐛 Step 4: Checking for JavaScript errors...');
        
        const jsErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                jsErrors.push(msg.text());
            }
        });
        
        page.on('pageerror', error => {
            jsErrors.push(`Page Error: ${error.message}`);
        });
        
        // Reload page to catch any errors
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForTimeout(3000);
        
        if (jsErrors.length > 0) {
            console.log('JavaScript errors found:');
            jsErrors.forEach(error => console.log(`  ❌ ${error}`));
        } else {
            console.log('✅ No JavaScript errors detected');
        }
        
        // Step 6: Test specific admin functions
        console.log('\n⚙️  Step 5: Testing admin functions...');
        
        const functionsToTest = [
            'showTab',
            'editSchool',
            'deleteSchool',
            'showApprovalModal',
            'closeApprovalModal',
            'rejectTeacherRequest',
            'deleteTag'
        ];
        
        for (const funcName of functionsToTest) {
            const funcExists = await page.evaluate((name) => {
                return typeof window[name] === 'function';
            }, funcName);
            
            console.log(`  ${funcName}: ${funcExists ? '✅ Available' : '❌ Missing'}`);
        }
        
        // Step 7: Test data loading
        console.log('\n📊 Step 6: Testing data loading...');
        
        try {
            // Check if there are any API calls being made
            const apiCalls = [];
            page.on('response', response => {
                if (response.url().includes('/api/')) {
                    apiCalls.push({
                        url: response.url(),
                        status: response.status()
                    });
                }
            });
            
            // Trigger page refresh to see API calls
            await page.reload({ waitUntil: 'networkidle2' });
            await page.waitForTimeout(5000);
            
            console.log('API calls detected:');
            apiCalls.forEach(call => {
                console.log(`  ${call.status === 200 ? '✅' : '❌'} ${call.url} (${call.status})`);
            });
            
        } catch (error) {
            console.log(`❌ Error testing data loading: ${error.message}`);
        }
        
        // Step 8: Check for specific UI elements
        console.log('\n🎨 Step 7: Checking UI elements...');
        
        const uiElements = await page.evaluate(() => {
            const elements = {};
            
            // Check for forms
            elements.forms = document.querySelectorAll('form').length;
            
            // Check for buttons
            elements.buttons = document.querySelectorAll('button').length;
            
            // Check for tables
            elements.tables = document.querySelectorAll('table').length;
            
            // Check for input fields
            elements.inputs = document.querySelectorAll('input').length;
            
            // Check for navigation
            elements.nav = document.querySelector('nav') ? true : false;
            
            return elements;
        });
        
        console.log('UI Elements found:', uiElements);
        
        console.log('\n🎉 Admin Panel Debug Test Completed!');
        console.log('📋 Summary:');
        console.log(`- Page loads: ✅`);
        console.log(`- Authentication: ✅`);
        console.log(`- JavaScript errors: ${jsErrors.length === 0 ? '✅ None' : '❌ ' + jsErrors.length}`);
        console.log(`- Admin functions: Check individual results above`);
        
        // Keep browser open for manual inspection
        console.log('\n🔍 Browser will stay open for manual inspection...');
        console.log('Press Ctrl+C to close when done.');
        
        // Wait indefinitely for manual inspection
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Commented out to keep browser open
        // await browser.close();
    }
}

// Run the test
testAdminPanel().catch(console.error);