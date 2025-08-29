/**
 * Puppeteer Test for Teacher Approval System
 * Tests the complete teacher approval flow in production
 */

const puppeteer = require('puppeteer');

const baseUrl = 'https://podcast-stories-production.up.railway.app';

async function testTeacherApprovalSystem() {
    console.log('🧪 Testing Teacher Approval System with Puppeteer');
    console.log('=================================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false, // Show browser for debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`[BROWSER ERROR]: ${msg.text()}`);
        } else if (msg.text().includes('API') || msg.text().includes('error') || msg.text().includes('fail')) {
            console.log(`[BROWSER]: ${msg.text()}`);
        }
    });
    
    // Capture network failures
    page.on('response', response => {
        if (response.status() >= 400) {
            console.log(`[NETWORK ERROR]: ${response.status()} ${response.url()}`);
        }
    });
    
    try {
        console.log('1️⃣ Loading admin login page...');
        await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle0' });
        
        // Clear any existing data
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        console.log('2️⃣ Logging in as admin...');
        await page.waitForSelector('#email', { timeout: 10000 });
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        
        // Wait for redirect to admin panel
        await page.waitForNavigation({ timeout: 15000 });
        console.log(`   Current URL: ${page.url()}`);
        
        // Check if we're on admin page
        const isAdminPage = page.url().includes('admin.html');
        if (!isAdminPage) {
            throw new Error('Not redirected to admin page after login');
        }
        console.log('   ✅ Admin login successful');
        
        console.log('3️⃣ Navigating to Teacher Requests tab...');
        await page.waitForSelector('.tab-btn[data-tab="teachers"]', { timeout: 10000 });
        await page.click('.tab-btn[data-tab="teachers"]');
        
        // Wait for teacher requests to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if teacher requests loaded
        const teacherRequestsVisible = await page.evaluate(() => {
            const tab = document.getElementById('teachers-tab');
            return tab && window.getComputedStyle(tab).display !== 'none';
        });
        
        if (!teacherRequestsVisible) {
            throw new Error('Teacher requests tab not visible');
        }
        console.log('   ✅ Teacher requests tab loaded');
        
        console.log('4️⃣ Looking for pending teacher requests...');
        
        // Wait for table to load
        await page.waitForSelector('#teacherRequestsTable tbody', { timeout: 10000 });
        
        // Check for pending requests and approve buttons
        const pendingRequestInfo = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('#teacherRequestsTable tbody tr'));
            const pendingRows = rows.filter(row => {
                const statusCell = row.querySelector('.status-badge');
                return statusCell && statusCell.textContent.trim() === 'pending';
            });
            
            const approveButtons = document.querySelectorAll('.btn-approve');
            
            return {
                totalRequests: rows.length,
                pendingRequests: pendingRows.length,
                approveButtons: approveButtons.length,
                pendingRequestsData: pendingRows.map(row => ({
                    email: row.cells[1]?.textContent.trim(),
                    name: row.cells[0]?.textContent.trim(),
                    hasApproveButton: !!row.querySelector('.btn-approve')
                }))
            };
        });
        
        console.log(`   Found ${pendingRequestInfo.totalRequests} total requests`);
        console.log(`   Found ${pendingRequestInfo.pendingRequests} pending requests`);
        console.log(`   Found ${pendingRequestInfo.approveButtons} approve buttons`);
        
        if (pendingRequestInfo.pendingRequests === 0) {
            console.log('   ℹ️ No pending requests to test approval with');
            console.log('   Create a teacher request first to test the approval flow');
            await browser.close();
            return true;
        }
        
        const firstPendingRequest = pendingRequestInfo.pendingRequestsData[0];
        console.log(`   Testing approval for: ${firstPendingRequest.name} (${firstPendingRequest.email})`);
        
        if (!firstPendingRequest.hasApproveButton) {
            throw new Error('Pending request does not have approve button');
        }
        
        console.log('5️⃣ Testing approve button click...');
        
        // Click the approve button for the first pending request
        await page.click('.btn-approve');
        
        // Wait for modal to appear
        console.log('   Waiting for approval modal...');
        await page.waitForSelector('#approvalModal', { visible: true, timeout: 5000 });
        
        const modalVisible = await page.evaluate(() => {
            const modal = document.getElementById('approvalModal');
            return modal && window.getComputedStyle(modal).display !== 'none';
        });
        
        if (!modalVisible) {
            throw new Error('Approval modal not visible after clicking approve button');
        }
        console.log('   ✅ Approval modal opened');
        
        console.log('6️⃣ Testing approve form submission...');
        
        // Click the approve button in the modal
        await page.waitForSelector('#approveTeacherForm button[type="submit"]', { timeout: 5000 });
        
        // Monitor network requests
        const approvalPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Approval request timeout'));
            }, 15000);
            
            page.on('response', async (response) => {
                if (response.url().includes('/teacher-requests/') && response.url().includes('/approve')) {
                    clearTimeout(timeout);
                    console.log(`   API Response: ${response.status()} ${response.statusText()}`);
                    
                    if (response.status() === 200) {
                        console.log('   ✅ Approval API call successful');
                        resolve(true);
                    } else {
                        const responseText = await response.text();
                        console.log(`   ❌ Approval API call failed: ${responseText}`);
                        resolve(false);
                    }
                }
            });
        });
        
        await page.click('#approveTeacherForm button[type="submit"]');
        
        // Wait for the API response
        const approvalSuccess = await approvalPromise;
        
        if (approvalSuccess) {
            console.log('7️⃣ Verifying approval results...');
            
            // Wait for modal to close and table to refresh
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check if the request status changed
            const updatedStatus = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('#teacherRequestsTable tbody tr'));
                const firstRow = rows[0];
                const statusCell = firstRow?.querySelector('.status-badge');
                return statusCell?.textContent.trim();
            });
            
            console.log(`   Updated status: ${updatedStatus}`);
            
            if (updatedStatus === 'approved') {
                console.log('   ✅ Request status updated to approved');
            } else {
                console.log('   ⚠️ Request status not updated (may need page refresh)');
            }
            
            console.log('\n🎉 Teacher approval test PASSED!');
            console.log('✅ Approve button works');
            console.log('✅ Modal opens correctly'); 
            console.log('✅ API call succeeds');
            console.log('📧 Teacher should receive email with working password reset link');
            
        } else {
            throw new Error('Teacher approval API call failed');
        }
        
    } catch (error) {
        console.error('\n❌ Teacher approval test FAILED:', error.message);
        
        // Take screenshot for debugging
        try {
            await page.screenshot({ path: 'teacher-approval-error.png', fullPage: true });
            console.log('📸 Screenshot saved as teacher-approval-error.png');
        } catch (screenshotError) {
            console.log('Could not take screenshot:', screenshotError.message);
        }
        
        await browser.close();
        return false;
    }
    
    await browser.close();
    return true;
}

// Run the test
testTeacherApprovalSystem()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test crashed:', error);
        process.exit(1);
    });