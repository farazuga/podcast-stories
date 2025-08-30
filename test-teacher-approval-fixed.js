const puppeteer = require('puppeteer');

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function testTeacherApprovalFixed() {
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
        console.log('Browser:', msg.type(), msg.text());
    });

    // Log API responses
    page.on('response', response => {
        if (response.url().includes('/api/teacher-requests')) {
            console.log(`API: ${response.status()} ${response.url()}`);
        }
    });

    try {
        console.log('\n=== Testing Teacher Approval (Fixed Version) ===\n');

        // Step 1: Login as admin
        console.log('1. Logging in as admin...');
        await page.goto(`${PRODUCTION_URL}/index.html`, { waitUntil: 'networkidle2' });
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);
        console.log('   ✓ Logged in successfully');

        // Step 2: Navigate to admin panel and wait for data to load
        console.log('\n2. Loading admin panel...');
        await page.goto(`${PRODUCTION_URL}/admin.html`, { waitUntil: 'networkidle2' });
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
        console.log('   ✓ Admin panel loaded');

        // Step 3: Click Teacher Requests tab
        console.log('\n3. Switching to Teacher Requests tab...');
        
        const tabSwitch = await page.evaluate(() => {
            // First, let's see what buttons are available
            const allButtons = Array.from(document.querySelectorAll('button'));
            console.log('All buttons found:', allButtons.map(b => b.textContent.trim()));
            
            // Look for tab buttons more broadly
            const tabButtons = Array.from(document.querySelectorAll('.tab-button, button'));
            console.log('Tab buttons found:', tabButtons.map(b => b.textContent.trim()));
            
            // Try different variations
            const teacherButton = tabButtons.find(btn => 
                btn.textContent.includes('Teacher') || 
                btn.textContent.includes('Requests') ||
                btn.textContent.includes('teacher')
            );
            
            if (teacherButton) {
                console.log('Found teacher button:', teacherButton.textContent);
                teacherButton.click();
                return { success: true, buttonText: teacherButton.textContent };
            }
            
            // Try calling showTab directly with different names
            if (typeof showTab === 'function') {
                console.log('Trying showTab function...');
                try {
                    showTab('teachers');
                    return { success: true, method: 'showTab("teachers")' };
                } catch (e) {
                    console.log('showTab("teachers") failed:', e.message);
                    try {
                        showTab('teacher-requests');
                        return { success: true, method: 'showTab("teacher-requests")' };
                    } catch (e2) {
                        console.log('showTab("teacher-requests") failed:', e2.message);
                    }
                }
            }
            
            return { success: false, reason: 'No teacher button or showTab function found' };
        });
        
        console.log(`   Tab switch: ${JSON.stringify(tabSwitch)}`);
        
        if (!tabSwitch.success) {
            console.log('   ❌ Could not switch to Teacher Requests tab');
            return;
        }
        
        // Wait for tab to load
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

        // Step 4: Check the teacher requests table
        console.log('\n4. Analyzing teacher requests table...');
        
        const tableAnalysis = await page.evaluate(() => {
            const table = document.getElementById('teacherRequestsTable');
            if (!table) return { found: false, reason: 'Table not found' };
            
            const rows = table.querySelectorAll('tr');
            const teachers = [];
            
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 7) { // Ensure it's a data row
                    const approveBtn = row.querySelector('.btn-approve');
                    teachers.push({
                        index,
                        name: cells[0]?.textContent?.trim() || 'Unknown',
                        email: cells[1]?.textContent?.trim() || 'Unknown', 
                        school: cells[2]?.textContent?.trim() || 'Unknown',
                        status: cells[4]?.textContent?.trim() || 'Unknown',
                        hasApproveButton: !!approveBtn,
                        approveBtnOnclick: approveBtn?.getAttribute('onclick') || null
                    });
                }
            });
            
            return {
                found: true,
                totalRows: rows.length,
                teachers: teachers,
                tableHTML: table.innerHTML.substring(0, 500)
            };
        });
        
        console.log('   Table analysis:');
        console.log(`   - Found: ${tableAnalysis.found}`);
        console.log(`   - Total rows: ${tableAnalysis.totalRows}`);
        console.log(`   - Teachers: ${tableAnalysis.teachers?.length}`);
        
        if (tableAnalysis.teachers) {
            tableAnalysis.teachers.forEach(teacher => {
                console.log(`     * ${teacher.name} (${teacher.email}) - Status: ${teacher.status} - Has approve btn: ${teacher.hasApproveButton}`);
            });
        }

        // Step 5: Try to approve a teacher
        if (tableAnalysis.teachers && tableAnalysis.teachers.length > 0) {
            const pendingTeacher = tableAnalysis.teachers.find(t => t.status === 'pending' && t.hasApproveButton);
            
            if (pendingTeacher) {
                console.log(`\n5. Attempting to approve: ${pendingTeacher.name} (${pendingTeacher.email})`);
                
                // Click the approve button
                const approveClick = await page.evaluate((teacherIndex) => {
                    const table = document.getElementById('teacherRequestsTable');
                    const rows = table.querySelectorAll('tr');
                    const targetRow = rows[teacherIndex];
                    const approveBtn = targetRow?.querySelector('.btn-approve');
                    
                    if (approveBtn) {
                        console.log('Clicking approve button...');
                        approveBtn.click();
                        return { success: true };
                    }
                    return { success: false, reason: 'Approve button not found' };
                }, pendingTeacher.index);
                
                console.log(`   Approve click: ${JSON.stringify(approveClick)}`);
                
                if (approveClick.success) {
                    // Wait for modal to appear
                    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
                    
                    console.log('\n6. Checking for approval modal...');
                    
                    const modalCheck = await page.evaluate(() => {
                        const modal = document.getElementById('approvalModal');
                        if (!modal) return { found: false };
                        
                        const confirmBtn = document.getElementById('confirmApproval');
                        const cancelBtn = document.querySelector('.cancel-approval');
                        
                        return {
                            found: true,
                            visible: modal.style.display !== 'none',
                            display: modal.style.display,
                            hasConfirmBtn: !!confirmBtn,
                            hasCancelBtn: !!cancelBtn,
                            modalContent: modal.textContent.substring(0, 200)
                        };
                    });
                    
                    console.log(`   Modal check: ${JSON.stringify(modalCheck)}`);
                    
                    if (modalCheck.found && modalCheck.visible) {
                        console.log('\n7. Modal is visible, clicking Confirm...');
                        
                        // Listen for the API response
                        const apiPromise = new Promise((resolve) => {
                            const handler = async (response) => {
                                if (response.url().includes('/approve')) {
                                    page.off('response', handler);
                                    const text = await response.text();
                                    resolve({
                                        status: response.status(),
                                        url: response.url(),
                                        body: text
                                    });
                                }
                            };
                            page.on('response', handler);
                        });
                        
                        // Click confirm
                        const confirmClick = await page.evaluate(() => {
                            const confirmBtn = document.getElementById('confirmApproval');
                            if (confirmBtn) {
                                confirmBtn.click();
                                return { success: true };
                            }
                            return { success: false };
                        });
                        
                        console.log(`   Confirm click: ${JSON.stringify(confirmClick)}`);
                        
                        if (confirmClick.success) {
                            // Wait for API response
                            console.log('   Waiting for API response...');
                            const apiResponse = await Promise.race([
                                apiPromise,
                                new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 5000))
                            ]);
                            
                            console.log(`   API Response: ${JSON.stringify(apiResponse)}`);
                            
                            // Check post-approval state
                            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
                            
                            console.log('\n8. Checking post-approval state...');
                            
                            const finalState = await page.evaluate(() => {
                                const modal = document.getElementById('approvalModal');
                                const modalVisible = modal ? modal.style.display !== 'none' : false;
                                
                                // Check for any success/error messages
                                const messages = [];
                                const alerts = document.querySelectorAll('.alert, .success, .error, .notification');
                                alerts.forEach(alert => {
                                    if (alert.textContent.trim()) {
                                        messages.push(alert.textContent.trim());
                                    }
                                });
                                
                                // Check if teacher request is still in table
                                const table = document.getElementById('teacherRequestsTable');
                                const rows = table ? table.querySelectorAll('tr') : [];
                                const remainingTeachers = rows.length - 1; // -1 for header
                                
                                return {
                                    modalStillVisible: modalVisible,
                                    messages: messages,
                                    remainingTeachersInTable: remainingTeachers
                                };
                            });
                            
                            console.log(`   Final state: ${JSON.stringify(finalState)}`);
                            
                            if (apiResponse.status === 200 && !finalState.modalStillVisible) {
                                console.log('\n   ✅ Teacher approval appears successful!');
                            } else if (finalState.modalStillVisible) {
                                console.log('\n   ⚠️ Modal still visible - approval may have failed');
                            } else {
                                console.log('\n   ❓ Unclear state - check manually');
                            }
                        }
                    } else {
                        console.log('   ❌ Approval modal not visible');
                    }
                } else {
                    console.log('   ❌ Could not click approve button');
                }
            } else {
                console.log('\n5. No pending teachers found to approve');
            }
        } else {
            console.log('\n5. No teachers found in table');
        }

        console.log('\n=== Test Summary ===');
        console.log('Test completed. Browser will remain open for manual inspection.');
        console.log('Check the Teacher Requests tab to see if the approval worked.');
        console.log('Press Ctrl+C to close when done.');
        
        // Keep browser open for manual inspection
        await new Promise(() => {});

    } catch (error) {
        console.error('\nTest failed with error:', error);
        await browser.close();
    }
}

testTeacherApprovalFixed().catch(console.error);