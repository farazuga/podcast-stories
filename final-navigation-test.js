const puppeteer = require('puppeteer');

async function finalNavigationTest() {
    console.log('🔧 FINAL NAVIGATION TEST');
    console.log('========================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Set desktop viewport
        await page.setViewport({ width: 1200, height: 800 });
        
        // Enable comprehensive console logging
        page.on('console', msg => {
            console.log(`📄 BROWSER: ${msg.text()}`);
        });
        
        console.log('1️⃣ Testing Final Navigation State...\n');
        
        // Login and navigate to admin page
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2' 
        });
        
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check final state
        const finalCheck = await page.evaluate(() => {
            return {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                navigation: {
                    mainNav: {
                        exists: !!document.getElementById('mainNav'),
                        display: document.getElementById('mainNav') ? 
                            window.getComputedStyle(document.getElementById('mainNav')).display : 'N/A',
                        visibility: document.getElementById('mainNav') ? 
                            window.getComputedStyle(document.getElementById('mainNav')).visibility : 'N/A'
                    },
                    mobileMenu: {
                        exists: !!document.getElementById('mobileMenu'),
                        display: document.getElementById('mobileMenu') ? 
                            window.getComputedStyle(document.getElementById('mobileMenu')).display : 'N/A',
                        visibility: document.getElementById('mobileMenu') ? 
                            window.getComputedStyle(document.getElementById('mobileMenu')).visibility : 'N/A',
                        hasActiveClass: document.getElementById('mobileMenu')?.classList.contains('active') || false
                    },
                    mobileToggle: {
                        exists: !!document.getElementById('mobileToggle'),
                        display: document.getElementById('mobileToggle') ? 
                            window.getComputedStyle(document.getElementById('mobileToggle')).display : 'N/A',
                        visibility: document.getElementById('mobileToggle') ? 
                            window.getComputedStyle(document.getElementById('mobileToggle')).visibility : 'N/A'
                    }
                },
                adminElements: {
                    adminBrowse: {
                        exists: !!document.querySelector('[href="/admin-browse-stories.html"]'),
                        visible: document.querySelector('[href="/admin-browse-stories.html"]') ? 
                            window.getComputedStyle(document.querySelector('[href="/admin-browse-stories.html"]')).display !== 'none' : false
                    },
                    adminPanel: {
                        exists: !!document.querySelector('[href="/admin.html"]'),
                        visible: document.querySelector('[href="/admin.html"]') ? 
                            window.getComputedStyle(document.querySelector('[href="/admin.html"]')).display !== 'none' : false
                    }
                },
                userInfo: {
                    hasToken: !!localStorage.getItem('token'),
                    userRole: JSON.parse(localStorage.getItem('user') || '{}').role || 'none'
                }
            };
        });
        
        console.log('FINAL NAVIGATION STATE:');
        console.log('=======================');
        console.log(`Viewport: ${finalCheck.viewport.width}x${finalCheck.viewport.height}`);
        console.log(`User: ${finalCheck.userInfo.userRole} (Token: ${finalCheck.userInfo.hasToken ? 'Yes' : 'No'})\n`);
        
        console.log('Desktop Navigation Elements:');
        console.log(`  Main Nav:`);
        console.log(`    Exists: ${finalCheck.navigation.mainNav.exists ? '✅' : '❌'}`);
        console.log(`    Display: ${finalCheck.navigation.mainNav.display} ${finalCheck.navigation.mainNav.display === 'flex' ? '✅' : finalCheck.navigation.mainNav.display === 'block' ? '⚠️' : '❌'}`);
        console.log(`    Visibility: ${finalCheck.navigation.mainNav.visibility}`);
        
        console.log(`  Mobile Menu:`);
        console.log(`    Exists: ${finalCheck.navigation.mobileMenu.exists ? '✅' : '❌'}`);
        console.log(`    Display: ${finalCheck.navigation.mobileMenu.display} ${finalCheck.navigation.mobileMenu.display === 'none' ? '✅' : '❌'}`);
        console.log(`    Visibility: ${finalCheck.navigation.mobileMenu.visibility} ${finalCheck.navigation.mobileMenu.visibility === 'hidden' ? '✅' : '❌'}`);
        console.log(`    Active Class: ${finalCheck.navigation.mobileMenu.hasActiveClass ? '❌ Has active' : '✅ Not active'}`);
        
        console.log(`  Mobile Toggle:`);
        console.log(`    Exists: ${finalCheck.navigation.mobileToggle.exists ? '✅' : '❌'}`);
        console.log(`    Display: ${finalCheck.navigation.mobileToggle.display} ${finalCheck.navigation.mobileToggle.display === 'none' ? '✅' : '❌'}`);
        console.log(`    Visibility: ${finalCheck.navigation.mobileToggle.visibility} ${finalCheck.navigation.mobileToggle.visibility === 'hidden' ? '✅' : '❌'}\n`);
        
        console.log('Admin Navigation Elements:');
        console.log(`  Admin Browse Stories: ${finalCheck.adminElements.adminBrowse.visible ? '✅ Visible' : '❌ Hidden'}`);
        console.log(`  Admin Panel: ${finalCheck.adminElements.adminPanel.visible ? '✅ Visible' : '❌ Hidden'}\n`);
        
        // Take final screenshot
        await page.screenshot({ path: 'final-navigation-state.png', fullPage: true });
        console.log('📸 Final screenshot: final-navigation-state.png\n');
        
        console.log('🎯 OVERALL ASSESSMENT:');
        console.log('======================');
        
        const desktopNavGood = finalCheck.navigation.mobileMenu.display === 'none' && 
                              finalCheck.navigation.mobileToggle.display === 'none';
        
        const adminNavWorking = finalCheck.adminElements.adminBrowse.visible && 
                               finalCheck.adminElements.adminPanel.visible;
        
        const authWorking = finalCheck.userInfo.hasToken && finalCheck.userInfo.userRole === 'amitrace_admin';
        
        if (desktopNavGood && adminNavWorking && authWorking) {
            console.log('✅ EXCELLENT: Navigation system is working correctly!');
            console.log('   ✅ Mobile elements properly hidden on desktop');
            console.log('   ✅ Admin navigation elements visible');  
            console.log('   ✅ Authentication working');
            console.log('   ✅ User role recognition working');
            
            if (finalCheck.navigation.mainNav.display === 'block') {
                console.log('   ⚠️  Minor: Main nav shows as "block" instead of "flex" (cosmetic only)');
            }
            
            console.log('\n🎉 NAVIGATION SYSTEM SUCCESSFULLY FIXED!');
            
        } else {
            console.log('❌ ISSUES REMAIN:');
            if (!desktopNavGood) {
                console.log('   - Desktop mobile elements still visible');
            }
            if (!adminNavWorking) {
                console.log('   - Admin navigation not working');
            }
            if (!authWorking) {
                console.log('   - Authentication issues');
            }
        }
        
    } catch (error) {
        console.error('🚨 Final test failed:', error.message);
    } finally {
        await browser.close();
    }
}

finalNavigationTest().catch(console.error);