/**
 * Simple Teacher Approval Test - Focus on functionality
 */

const puppeteer = require('puppeteer');

async function testTeacherApproval() {
    console.log('🧪 Simple Teacher Approval Test');
    console.log('=================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const page = await browser.newPage();
    
    // Monitor API requests
    const apiRequests = [];
    page.on('response', async response => {
        if (response.url().includes('/api/teacher-requests/') && response.url().includes('/approve')) {
            const status = response.status();
            console.log(`📡 API Response: ${status} ${response.statusText()}`);
            
            if (status === 200) {
                console.log('✅ Approval API succeeded');
            } else {
                console.log(`❌ Approval API failed: ${status}`);
                try {
                    const text = await response.text();
                    console.log(`Error details: ${text}`);
                } catch (e) {}
            }
        }
    });
    
    try {
        console.log('1️⃣ Login as admin...');
        await page.goto('https://podcast-stories-production.up.railway.app/index.html');
        
        // Force cache refresh
        await page.reload({ waitUntil: 'networkidle0' });
        await page.evaluate(() => { 
            localStorage.clear(); 
            sessionStorage.clear();
        });
        
        await page.waitForSelector('#email');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('2️⃣ Navigate to Teachers tab...');
        
        // Wait for admin panel to load
        await page.waitForSelector('.tab-btn[data-tab="teachers"]', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Click teachers tab
        await page.click('.tab-btn[data-tab="teachers"]');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('3️⃣ Look for pending requests...');
        
        // Check for table body (which has the teacherRequestsTable ID)
        const tableBody = await page.$('#teacherRequestsTable');
        if (!tableBody) {
            console.log('❌ Teacher requests table body not found');
            await browser.close();
            return false;
        }
        
        // Get all table rows
        const requestsInfo = await page.evaluate(() => {
            const tbody = document.querySelector('#teacherRequestsTable');
            if (!tbody) return { error: 'Table body not found' };
            
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const requests = [];
            
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 5) {
                    // Status is in column 4 (index 4), not column 3 (looking at the table structure)
                    const statusBadge = cells[4].querySelector('.status-badge') || cells[4];
                    const approveBtn = row.querySelector('.btn-approve');
                    
                    requests.push({
                        index,
                        name: cells[0]?.textContent?.trim(),
                        email: cells[1]?.textContent?.trim(),
                        school: cells[2]?.textContent?.trim(),
                        message: cells[3]?.textContent?.trim(),
                        status: statusBadge?.textContent?.trim(),
                        hasApproveBtn: !!approveBtn
                    });
                }
            });
            
            return { requests };
        });
        
        if (requestsInfo.error) {
            console.log(`❌ ${requestsInfo.error}`);
            await browser.close();
            return false;
        }
        
        console.log(`Found ${requestsInfo.requests.length} teacher requests:`);
        requestsInfo.requests.forEach((req, i) => {
            console.log(`  ${i + 1}. ${req.name} (${req.email}) - ${req.status} - ${req.hasApproveBtn ? 'Has approve button' : 'No approve button'}`);
        });
        
        // Find first pending request
        const pendingRequest = requestsInfo.requests.find(req => req.status === 'pending' && req.hasApproveBtn);
        
        if (!pendingRequest) {
            console.log('ℹ️ No pending requests with approve buttons found');
            await browser.close();
            return true;
        }
        
        console.log(`\n4️⃣ Testing approval for: ${pendingRequest.name}`);
        
        // Click the approve button for the pending request
        const approveBtn = await page.$('.btn-approve');
        if (!approveBtn) {
            console.log('❌ Approve button not found in DOM');
            await browser.close();
            return false;
        }
        
        await approveBtn.click();
        console.log('✅ Clicked approve button');
        
        // Wait for modal
        await page.waitForSelector('#approvalModal[style*="block"]', { timeout: 5000 });
        console.log('✅ Approval modal opened');
        
        console.log('5️⃣ Submit approval...');
        
        // Click approve in modal
        const approveFormBtn = await page.$('#approveTeacherForm button[type="submit"]');
        if (!approveFormBtn) {
            console.log('❌ Approve form button not found');
            await browser.close();
            return false;
        }
        
        await approveFormBtn.click();
        console.log('✅ Clicked approve form button');
        
        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('\n🎉 Teacher approval test completed!');
        console.log('Check the API response above to see if approval succeeded');
        
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        await page.screenshot({ path: 'teacher-approval-simple-error.png' });
        return false;
    } finally {
        await browser.close();
    }
    
    return true;
}

testTeacherApproval()
    .then(success => {
        console.log(`\n🏁 Test ${success ? 'COMPLETED' : 'FAILED'}`);
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test crashed:', error);
        process.exit(1);
    });