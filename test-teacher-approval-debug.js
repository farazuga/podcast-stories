const puppeteer = require('puppeteer');

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function testTeacherApprovalWithDebug() {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 100,
        devtools: true,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    // Capture all console messages
    const consoleMessages = [];
    page.on('console', msg => {
        const message = `${msg.type()}: ${msg.text()}`;
        console.log('CONSOLE:', message);
        consoleMessages.push(message);
    });

    // Capture all network responses
    const apiResponses = [];
    page.on('response', async response => {
        if (response.url().includes('/api/teacher-requests')) {
            try {
                const responseText = await response.text();
                const logEntry = {
                    url: response.url(),
                    status: response.status(),
                    body: responseText
                };
                console.log('API RESPONSE:', JSON.stringify(logEntry, null, 2));
                apiResponses.push(logEntry);
            } catch (e) {
                console.log('Error reading response body:', e.message);
            }
        }
    });

    try {
        console.log('\n=== Testing Teacher Approval with Debug Info ===\n');

        // Login
        console.log('1. Logging in...');
        await page.goto(`${PRODUCTION_URL}/index.html`, { waitUntil: 'networkidle2' });
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);
        console.log('   ✓ Logged in');

        // Go to admin panel
        console.log('2. Loading admin panel...');
        await page.goto(`${PRODUCTION_URL}/admin.html`, { waitUntil: 'networkidle2' });
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
        console.log('   ✓ Admin panel loaded');

        // Switch to Teacher Requests tab
        console.log('3. Switching to Teacher Requests tab...');
        await page.evaluate(() => {
            const tabButtons = Array.from(document.querySelectorAll('button'));
            const teacherButton = tabButtons.find(btn => btn.textContent.includes('Teacher'));
            if (teacherButton) {
                teacherButton.click();
                return true;
            }
            return false;
        });
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
        console.log('   ✓ Switched to Teacher Requests tab');

        // Find and click approve button
        console.log('4. Finding pending teacher to approve...');
        const teacherInfo = await page.evaluate(() => {
            const table = document.getElementById('teacherRequestsTable');
            if (!table) return null;

            const rows = Array.from(table.querySelectorAll('tr'));
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.querySelectorAll('td');
                if (cells.length >= 7) {
                    const statusCell = cells[4];
                    const approveBtn = row.querySelector('.btn-approve');
                    
                    if (statusCell.textContent.includes('pending') && approveBtn) {
                        return {
                            name: cells[0].textContent.trim(),
                            email: cells[1].textContent.trim(),
                            index: i,
                            onclick: approveBtn.getAttribute('onclick')
                        };
                    }
                }
            }
            return null;
        });

        if (!teacherInfo) {
            console.log('   ❌ No pending teachers found to approve');
            await browser.close();
            return;
        }

        console.log(`   ✓ Found pending teacher: ${teacherInfo.name} (${teacherInfo.email})`);

        // Click approve button
        console.log('5. Clicking approve button...');
        await page.evaluate((index) => {
            const table = document.getElementById('teacherRequestsTable');
            const rows = table.querySelectorAll('tr');
            const targetRow = rows[index];
            const approveBtn = targetRow.querySelector('.btn-approve');
            if (approveBtn) {
                approveBtn.click();
                return true;
            }
            return false;
        }, teacherInfo.index);

        // Wait for modal
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
        console.log('   ✓ Clicked approve button');

        // Check modal appeared
        console.log('6. Checking modal...');
        const modalVisible = await page.evaluate(() => {
            const modal = document.getElementById('approvalModal');
            return modal && modal.style.display !== 'none';
        });

        if (!modalVisible) {
            console.log('   ❌ Modal not visible');
            await browser.close();
            return;
        }
        console.log('   ✓ Modal is visible');

        // Clear previous API responses to focus on the approval call
        apiResponses.length = 0;

        // Click the submit button in the modal
        console.log('7. Clicking Approve & Generate Account button...');
        await page.evaluate(() => {
            const form = document.getElementById('approveTeacherForm');
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.click();
                return true;
            }
            return false;
        });

        // Wait for API call to complete
        console.log('8. Waiting for API response...');
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));

        // Check for error messages in the page
        const errorMessages = await page.evaluate(() => {
            const errors = [];
            // Look for error divs, alerts, etc.
            const errorElements = document.querySelectorAll('.error, .alert-error, [class*="error"]');
            errorElements.forEach(el => {
                if (el.textContent.trim()) {
                    errors.push(el.textContent.trim());
                }
            });
            return errors;
        });

        console.log('\n=== RESULTS ===');
        console.log('Console Messages:');
        consoleMessages.forEach(msg => console.log(`  ${msg}`));
        
        console.log('\nAPI Responses:');
        apiResponses.forEach(resp => {
            console.log(`  ${resp.status} ${resp.url}`);
            if (resp.body) {
                try {
                    const parsed = JSON.parse(resp.body);
                    console.log('  Response Body:', JSON.stringify(parsed, null, 4));
                } catch (e) {
                    console.log('  Response Body (raw):', resp.body);
                }
            }
        });

        console.log('\nError Messages on Page:');
        if (errorMessages.length > 0) {
            errorMessages.forEach(msg => console.log(`  ${msg}`));
        } else {
            console.log('  No error messages found on page');
        }

        // Check modal state after attempt
        const finalModalState = await page.evaluate(() => {
            const modal = document.getElementById('approvalModal');
            return {
                visible: modal && modal.style.display !== 'none',
                display: modal ? modal.style.display : 'not found'
            };
        });

        console.log('\nFinal Modal State:', finalModalState);

        console.log('\n=== Test Complete ===');
        console.log('Browser will remain open for 10 seconds for manual inspection...');
        
        setTimeout(async () => {
            await browser.close();
        }, 10000);

        // Keep the process alive for a bit
        await new Promise(resolve => setTimeout(resolve, 10000));

    } catch (error) {
        console.error('\nTest failed with error:', error);
        await browser.close();
    }
}

testTeacherApprovalWithDebug().catch(console.error);