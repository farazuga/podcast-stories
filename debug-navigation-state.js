/**
 * Debug Navigation State - August 30, 2025  
 * Simple test to check navigation visibility for each role
 */

const puppeteer = require('puppeteer');

async function debugNavigationState() {
    console.log('🔍 DEBUG NAVIGATION STATE TEST');
    console.log('Testing each role individually with detailed debugging\n');

    const browser = await puppeteer.launch({ 
        headless: false, 
        slowMo: 500,
        devtools: true
    });

    const roles = [
        { role: 'student', email: 'student@vidpod.com', password: 'vidpod' },
        { role: 'teacher', email: 'teacher@vidpod.com', password: 'vidpod' },
        { role: 'admin', email: 'admin@vidpod.com', password: 'vidpod' }
    ];

    for (const roleConfig of roles) {
        console.log(`\n📍 DEBUGGING ${roleConfig.role.toUpperCase()} NAVIGATION`);
        console.log('-'.repeat(50));

        const page = await browser.newPage();

        try {
            // Step 1: Navigate and login
            console.log('1. Going to login page...');
            await page.goto('https://podcast-stories-production.up.railway.app/index.html', {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Clear storage
            console.log('2. Clearing storage...');
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });

            // Login
            console.log('3. Logging in...');
            await page.waitForSelector('#email', { timeout: 10000 });
            await page.type('#email', roleConfig.email);
            await page.type('#password', roleConfig.password);
            
            // Wait for form submission and redirect
            const [response] = await Promise.all([
                page.waitForNavigation({ 
                    waitUntil: 'networkidle0', 
                    timeout: 15000 
                }),
                page.click('button[type="submit"]')
            ]);

            console.log(`   ✅ Login successful, redirected to: ${page.url()}`);

            // Step 2: Wait for page to fully load
            console.log('4. Waiting for page initialization...');
            await page.waitForSelector('#vidpodNavbar', { timeout: 10000 });
            
            // Wait extra time for JavaScript to initialize
            await new Promise(resolve => setTimeout(resolve, 4000));

            // Step 3: Analyze navigation
            console.log('5. Analyzing navigation state...');
            
            const analysis = await page.evaluate(() => {
                // Get user info
                const userStr = localStorage.getItem('user');
                const user = userStr ? JSON.parse(userStr) : null;
                
                console.log('🔍 Page analysis starting...');
                console.log('🔍 User from localStorage:', user);
                
                // Check navigation initialization
                const navbar = document.getElementById('vidpodNavbar');
                const isInitialized = navbar?.hasAttribute('data-initialized');
                const hasVidPODNav = typeof window.VidPODNav !== 'undefined';
                
                console.log('🔍 Navigation initialized:', isInitialized);
                console.log('🔍 VidPODNav available:', hasVidPODNav);
                
                // Get all navigation elements
                const navElements = Array.from(document.querySelectorAll('[data-page]'));
                console.log('🔍 Found navigation elements:', navElements.length);
                
                const elementAnalysis = navElements.map((element, i) => {
                    const dataPage = element.getAttribute('data-page');
                    const dataRole = element.getAttribute('data-role');
                    const computedStyle = window.getComputedStyle(element);
                    const isVisible = computedStyle.display !== 'none' && element.offsetParent !== null;
                    const parent = element.closest('.navbar-nav') ? 'desktop' : 
                                  element.closest('.mobile-nav') ? 'mobile' : 'other';
                    
                    console.log(`🔍 Element ${i}: ${dataPage} | role="${dataRole}" | visible=${isVisible} | parent=${parent}`);
                    
                    return {
                        index: i,
                        dataPage,
                        dataRole,
                        isVisible,
                        parent,
                        displayStyle: computedStyle.display,
                        text: element.textContent.trim().replace(/\s+/g, ' ')
                    };
                });
                
                // Group unique pages by visibility
                const visiblePages = [...new Set(elementAnalysis.filter(el => el.isVisible).map(el => el.dataPage))];
                const hiddenPages = [...new Set(elementAnalysis.filter(el => !el.isVisible).map(el => el.dataPage))];
                
                console.log('🔍 Visible pages:', visiblePages);
                console.log('🔍 Hidden pages:', hiddenPages);
                
                return {
                    user,
                    isInitialized,
                    hasVidPODNav,
                    totalElements: navElements.length,
                    elementAnalysis,
                    visiblePages,
                    hiddenPages,
                    bodyClasses: document.body.className,
                    currentUrl: window.location.href
                };
            });

            // Display results
            console.log(`\n📊 ANALYSIS RESULTS:`);
            console.log(`   Current URL: ${analysis.currentUrl}`);
            console.log(`   User Role: ${analysis.user?.role || 'Unknown'}`);
            console.log(`   Navigation Initialized: ${analysis.isInitialized}`);
            console.log(`   VidPODNav Available: ${analysis.hasVidPODNav}`);
            console.log(`   Total Navigation Elements: ${analysis.totalElements}`);
            console.log(`   Body Classes: ${analysis.bodyClasses}`);
            
            console.log(`\n✅ VISIBLE PAGES (${analysis.visiblePages.length}):`);
            analysis.visiblePages.forEach(page => console.log(`      ✓ ${page}`));
            
            console.log(`\n❌ HIDDEN PAGES (${analysis.hiddenPages.length}):`);
            analysis.hiddenPages.forEach(page => console.log(`      ✗ ${page}`));
            
            // Expected behavior check
            const expectedVisible = {
                student: ['dashboard', 'stories', 'add-story', 'rundowns'],
                teacher: ['dashboard', 'stories', 'add-story', 'teacher-dashboard', 'rundowns'],
                admin: ['dashboard', 'admin-browse-stories', 'add-story', 'admin', 'rundowns']
            };
            
            const expectedHidden = {
                student: ['teacher-dashboard', 'admin-browse-stories', 'admin'],
                teacher: ['admin-browse-stories', 'admin'],
                admin: ['teacher-dashboard']
            };
            
            const role = roleConfig.role;
            const shouldSee = expectedVisible[role] || [];
            const shouldNotSee = expectedHidden[role] || [];
            
            console.log(`\n🎯 EXPECTATIONS FOR ${role.toUpperCase()}:`);
            console.log(`   Should see: ${shouldSee.join(', ')}`);
            console.log(`   Should NOT see: ${shouldNotSee.join(', ')}`);
            
            const correctVisible = shouldSee.filter(page => analysis.visiblePages.includes(page));
            const correctHidden = shouldNotSee.filter(page => analysis.hiddenPages.includes(page));
            const wrongVisible = analysis.visiblePages.filter(page => shouldNotSee.includes(page));
            const wrongHidden = analysis.hiddenPages.filter(page => shouldSee.includes(page));
            
            console.log(`\n📋 VALIDATION:`);
            console.log(`   ✅ Correctly visible: ${correctVisible.join(', ')}`);
            console.log(`   ✅ Correctly hidden: ${correctHidden.join(', ')}`);
            
            if (wrongVisible.length > 0) {
                console.log(`   ❌ INCORRECTLY visible: ${wrongVisible.join(', ')}`);
            }
            if (wrongHidden.length > 0) {
                console.log(`   ❌ INCORRECTLY hidden: ${wrongHidden.join(', ')}`);
            }
            
            const success = wrongVisible.length === 0 && wrongHidden.length === 0;
            console.log(`\n🏁 ${role.toUpperCase()} RESULT: ${success ? '✅ PERFECT' : '❌ ISSUES FOUND'}`);
            
        } catch (error) {
            console.log(`❌ Failed to test ${roleConfig.role}:`, error.message);
        }

        await page.close();
        console.log(`\n${'='.repeat(50)}`);
    }

    await browser.close();
    console.log('\n🏁 DEBUG NAVIGATION STATE TEST COMPLETE');
}

debugNavigationState().catch(console.error);