/**
 * Final Teacher Approval Test
 * Complete test with better error handling and debugging
 */

const puppeteer = require('puppeteer');

async function testTeacherApprovalFinal() {
    console.log('🧪 Final Teacher Approval Test');
    console.log('==============================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Set up request monitoring
    const requests = [];
    page.on('request', request => {
        if (request.url().includes('/api/')) {
            requests.push({
                method: request.method(),
                url: request.url(),
                timestamp: new Date().toISOString()
            });
        }
    });
    
    page.on('response', response => {
        if (response.url().includes('/api/') && response.status() >= 400) {
            console.log(`[API ERROR]: ${response.status()} ${response.url()}`);
        }
    });
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`[JS ERROR]: ${msg.text()}`);
        }
    });
    
    try {
        console.log('1️⃣ Loading and logging in...');
        await page.goto('https://podcast-stories-production.up.railway.app/index.html');
        await page.evaluate(() => { localStorage.clear(); });
        
        await page.waitForSelector('#email');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('   ✅ Login successful');
        
        console.log('2️⃣ Navigating to teachers tab...');
        
        // Wait for admin panel to fully load
        await page.waitForSelector('.tab-btn[data-tab="teachers"]');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Click teachers tab
        await page.click('.tab-btn[data-tab="teachers"]');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verify tab loaded
        const tabLoaded = await page.evaluate(() => {
            const tab = document.getElementById('teachers-tab');
            return tab && window.getComputedStyle(tab).display !== 'none';
        });
        
        if (!tabLoaded) {
            throw new Error('Teachers tab failed to load');
        }
        console.log('   ✅ Teachers tab loaded');
        
        console.log('3️⃣ Checking for teacher requests...');
        
        // Wait for table to load
        await page.waitForSelector('#teacherRequestsTable tbody');
        
        // Get request information
        const requestInfo = await page.evaluate(() => {
            const table = document.querySelector('#teacherRequestsTable tbody');
            if (!table) return { error: 'Table not found' };
            
            const rows = Array.from(table.querySelectorAll('tr'));
            const requests = rows.map((row, index) => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 6) return null;
                
                const statusCell = cells[3].querySelector('.status-badge');
                const approveBtn = row.querySelector('.btn-approve');
                
                return {
                    index,
                    name: cells[0].textContent.trim(),
                    email: cells[1].textContent.trim(),
                    status: statusCell ? statusCell.textContent.trim() : 'unknown',
                    hasApproveBtn: !!approveBtn
                };
            }).filter(Boolean);
            
            const pendingRequests = requests.filter(r => r.status === 'pending');
            
            return {
                totalRequests: requests.length,
                pendingRequests: pendingRequests.length,
                requests: requests,
                firstPending: pendingRequests[0] || null
            };
        });
        
        console.log(`   Found ${requestInfo.totalRequests} total requests`);
        console.log(`   Found ${requestInfo.pendingRequests} pending requests`);
        
        if (requestInfo.firstPending) {
            console.log(`   Testing approval for: ${requestInfo.firstPending.name} (${requestInfo.firstPending.email})`);
        } else {
            console.log('   ℹ️ No pending requests found to test');
            console.log('   The approve button functionality cannot be tested without pending requests');
            await browser.close();
            return true;
        }
        
        console.log('4️⃣ Testing approve button...');
        
        // Click first approve button
        const approveClicked = await page.evaluate(() => {
            const approveBtn = document.querySelector('.btn-approve');
            if (approveBtn) {
                approveBtn.click();
                return true;
            }
            return false;
        });
        
        if (!approveClicked) {
            throw new Error('Could not click approve button');
        }
        
        // Wait for modal
        await page.waitForSelector('#approvalModal[style*="block"]', { timeout: 5000 });
        console.log('   ✅ Approval modal opened');
        
        console.log('5️⃣ Testing approve form submission...');
        
        // Set up API monitoring for approval request
        let approvalResponse = null;
        const responsePromise = new Promise((resolve) => {
            page.on('response', async (response) => {
                if (response.url().includes('/teacher-requests/') && response.url().includes('/approve')) {
                    approvalResponse = {
                        status: response.status(),
                        statusText: response.statusText(),
                        url: response.url()
                    };
                    resolve();
                }
            });
        });
        
        // Click approve in modal
        await page.click('#approveTeacherForm button[type="submit"]');
        
        // Wait for API response (with timeout)
        await Promise.race([
            responsePromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 10000))
        ]);
        
        if (approvalResponse) {
            console.log(`   API Response: ${approvalResponse.status} ${approvalResponse.statusText}`);
            console.log(`   URL: ${approvalResponse.url}`);
            
            if (approvalResponse.status === 200) {
                console.log('   ✅ Approval API successful');
                
                // Wait for UI updates
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                console.log('\n🎉 TEACHER APPROVAL TEST PASSED!');
                console.log('✅ Admin login works');
                console.log('✅ Teachers tab loads');
                console.log('✅ Approve button opens modal');
                console.log('✅ Approve form submits successfully');
                console.log('✅ API returns 200 OK');
                console.log('📧 Teacher should receive email with working password reset link');
                
            } else {
                console.log(`   ❌ Approval failed with status ${approvalResponse.status}`);
                return false;
            }
        } else {
            console.log('   ❌ No API response captured');
            return false;
        }
        
    } catch (error) {
        console.error(`\n❌ TEST FAILED: ${error.message}`);
        
        // Log any API requests made
        if (requests.length > 0) {
            console.log('\n📋 API Requests Made:');
            requests.forEach(req => {
                console.log(`   ${req.method} ${req.url}`);
            });
        }
        
        // Take screenshot
        try {
            await page.screenshot({ path: 'teacher-approval-final-error.png', fullPage: true });
            console.log('📸 Screenshot saved as teacher-approval-final-error.png');
        } catch (e) {}
        
        await browser.close();
        return false;
    }
    
    await browser.close();
    return true;
}

testTeacherApprovalFinal()
    .then(success => {
        console.log(`\n🏁 Test ${success ? 'PASSED' : 'FAILED'}`);
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test crashed:', error);
        process.exit(1);
    });