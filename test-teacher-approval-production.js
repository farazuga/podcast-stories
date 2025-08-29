const puppeteer = require('puppeteer');

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function testTeacherApproval() {
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

    // Log network responses
    page.on('response', response => {
        if (response.url().includes('/api/')) {
            console.log(`API Response: ${response.status()} ${response.url()}`);
        }
    });

    // Log network errors
    page.on('requestfailed', request => {
        console.log(`Request failed: ${request.url()} - ${request.failure().errorText}`);
    });

    try {
        console.log('\n=== Testing Teacher Approval in Production ===\n');

        // Step 1: Login as admin
        console.log('1. Navigating to login page...');
        await page.goto(`${PRODUCTION_URL}/index.html`, { waitUntil: 'networkidle2' });

        console.log('2. Logging in as admin...');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);

        console.log('   ✓ Logged in successfully');
        console.log(`   Current URL: ${page.url()}`);

        // Step 2: Navigate to admin panel
        console.log('\n3. Navigating to admin panel...');
        await page.goto(`${PRODUCTION_URL}/admin.html`, { waitUntil: 'networkidle2' });
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

        // Step 3: Click on Teacher Requests tab
        console.log('4. Clicking Teacher Requests tab...');
        
        // Try to find and click the Teacher Requests tab
        const tabClicked = await page.evaluate(() => {
            // Look for the tab button
            const tabs = Array.from(document.querySelectorAll('.tab-button'));
            const teacherTab = tabs.find(tab => tab.textContent.includes('Teacher Requests'));
            
            if (teacherTab) {
                console.log('Found Teacher Requests tab, clicking...');
                teacherTab.click();
                
                // Also try calling showTab directly
                if (typeof showTab === 'function') {
                    console.log('Calling showTab("teacher-requests") directly');
                    showTab('teacher-requests');
                }
                return true;
            }
            console.log('Teacher Requests tab not found');
            return false;
        });

        if (!tabClicked) {
            console.log('   ✗ Could not find Teacher Requests tab');
        } else {
            console.log('   ✓ Clicked Teacher Requests tab');
        }

        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

        // Step 4: Check if there are pending requests
        console.log('\n5. Checking for pending teacher requests...');
        
        const pendingRequests = await page.evaluate(() => {
            const container = document.getElementById('pendingRequests');
            if (!container) {
                console.log('Pending requests container not found');
                return [];
            }
            
            const cards = container.querySelectorAll('.teacher-request-card');
            console.log(`Found ${cards.length} teacher request cards`);
            
            const requests = [];
            cards.forEach((card, index) => {
                const nameEl = card.querySelector('h3');
                const emailEl = card.querySelector('p');
                const approveBtn = card.querySelector('.approve-btn');
                
                requests.push({
                    index,
                    name: nameEl?.textContent || 'Unknown',
                    email: emailEl?.textContent || 'Unknown',
                    hasApproveButton: !!approveBtn,
                    buttonText: approveBtn?.textContent || 'N/A'
                });
            });
            
            return requests;
        });

        console.log(`   Found ${pendingRequests.length} pending requests:`);
        pendingRequests.forEach(req => {
            console.log(`   - ${req.name} (${req.email}) - Has button: ${req.hasApproveButton}`);
        });

        if (pendingRequests.length === 0) {
            console.log('\n   No pending teacher requests found.');
            console.log('   Checking if the tab content is visible...');
            
            const tabVisibility = await page.evaluate(() => {
                const teacherTab = document.getElementById('teacher-requests');
                if (!teacherTab) return 'Tab not found';
                
                const style = window.getComputedStyle(teacherTab);
                return {
                    display: style.display,
                    visibility: style.visibility,
                    innerHTML: teacherTab.innerHTML.substring(0, 200)
                };
            });
            
            console.log('   Tab visibility:', tabVisibility);
        } else {
            // Step 5: Try to approve the first request
            console.log('\n6. Attempting to approve first teacher request...');
            
            // Click the approve button
            const approveResult = await page.evaluate(() => {
                const firstCard = document.querySelector('.teacher-request-card');
                if (!firstCard) return { error: 'No card found' };
                
                const approveBtn = firstCard.querySelector('.approve-btn');
                if (!approveBtn) return { error: 'No approve button found' };
                
                console.log('Clicking approve button...');
                approveBtn.click();
                
                // Check if modal opened
                setTimeout(() => {
                    const modal = document.getElementById('approvalModal');
                    if (modal) {
                        console.log('Modal found, checking visibility:', modal.style.display);
                    }
                }, 500);
                
                return { success: true };
            });
            
            console.log('   Approve button click result:', approveResult);
            
            // Wait for modal to appear
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
            
            // Check if modal is visible
            console.log('\n7. Checking if approval modal appeared...');
            const modalState = await page.evaluate(() => {
                const modal = document.getElementById('approvalModal');
                if (!modal) return { found: false };
                
                const confirmBtn = document.getElementById('confirmApproval');
                const cancelBtn = document.querySelector('.cancel-approval');
                
                return {
                    found: true,
                    display: modal.style.display,
                    hasConfirmButton: !!confirmBtn,
                    hasCancelButton: !!cancelBtn,
                    modalContent: modal.textContent.substring(0, 200)
                };
            });
            
            console.log('   Modal state:', modalState);
            
            if (modalState.found && modalState.display !== 'none') {
                console.log('\n8. Modal is visible, clicking Confirm...');
                
                // Intercept the API call
                page.on('response', async response => {
                    if (response.url().includes('/teacher-requests') && response.url().includes('/approve')) {
                        console.log(`\n   Approval API Response: ${response.status()}`);
                        if (response.status() !== 200) {
                            const text = await response.text();
                            console.log('   Response body:', text);
                        }
                    }
                });
                
                // Click confirm
                const confirmResult = await page.evaluate(() => {
                    const confirmBtn = document.getElementById('confirmApproval');
                    if (!confirmBtn) return { error: 'Confirm button not found' };
                    
                    console.log('Clicking confirm button...');
                    confirmBtn.click();
                    return { success: true };
                });
                
                console.log('   Confirm click result:', confirmResult);
                
                // Wait for API response
                await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
                
                // Check if modal closed and if success message appeared
                console.log('\n9. Checking post-approval state...');
                const postApprovalState = await page.evaluate(() => {
                    const modal = document.getElementById('approvalModal');
                    const modalVisible = modal ? modal.style.display !== 'none' : false;
                    
                    // Check for any success messages
                    const alerts = Array.from(document.querySelectorAll('.alert, .success-message, .notification'));
                    
                    // Check if the request card is still there
                    const cards = document.querySelectorAll('.teacher-request-card');
                    
                    return {
                        modalStillVisible: modalVisible,
                        modalDisplay: modal?.style.display,
                        alerts: alerts.map(a => a.textContent),
                        remainingCards: cards.length,
                        pageErrors: document.body.textContent.includes('Error') || 
                                   document.body.textContent.includes('error')
                    };
                });
                
                console.log('   Post-approval state:', postApprovalState);
                
                if (postApprovalState.modalStillVisible) {
                    console.log('\n   ⚠️ Modal is still visible - approval may have failed');
                    
                    // Check console for errors
                    const consoleErrors = await page.evaluate(() => {
                        return window.__errors || [];
                    });
                    
                    if (consoleErrors.length > 0) {
                        console.log('   Console errors detected:', consoleErrors);
                    }
                }
            }
        }

        // Step 6: Check browser console for any errors
        console.log('\n10. Checking for JavaScript errors...');
        await page.evaluate(() => {
            window.__errors = [];
            window.addEventListener('error', (e) => {
                window.__errors.push(e.message);
            });
        });

        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

        const jsErrors = await page.evaluate(() => window.__errors || []);
        if (jsErrors.length > 0) {
            console.log('   JavaScript errors found:', jsErrors);
        } else {
            console.log('   No JavaScript errors detected');
        }

        console.log('\n=== Test Summary ===');
        console.log('Test completed. Please review the results above.');
        console.log('Keep the browser open to inspect the current state.');
        
        // Keep browser open for manual inspection
        console.log('\nBrowser will remain open for manual inspection...');
        console.log('Press Ctrl+C to close when done.');
        
        // Keep the process alive
        await new Promise(() => {});

    } catch (error) {
        console.error('\nTest failed with error:', error);
        await browser.close();
    }
}

// Run the test
testTeacherApproval().catch(console.error);