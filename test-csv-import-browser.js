const puppeteer = require('puppeteer');
const path = require('path');

async function testCSVImportUI() {
    console.log('🧪 Testing CSV Import via Browser UI');
    console.log('=====================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Browser Error:', msg.text());
            }
        });
        
        page.on('response', response => {
            if (response.url().includes('/api/stories/import')) {
                console.log(`📡 Import Response: ${response.status()}`);
            }
        });
        
        // Set viewport
        await page.setViewport({ width: 1400, height: 900 });
        
        console.log('1️⃣ Navigating to login page...\n');
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2' 
        });
        
        // Login as admin
        console.log('2️⃣ Logging in as admin...\n');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Navigate to admin browse stories
        console.log('3️⃣ Navigating to Admin Browse Stories...\n');
        await page.goto('https://podcast-stories-production.up.railway.app/admin-browse-stories.html', {
            waitUntil: 'networkidle2'
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if import button exists
        const importBtnExists = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const importBtn = btns.find(btn => btn.textContent.includes('Import CSV'));
            return {
                exists: !!importBtn,
                text: importBtn ? importBtn.textContent : null,
                onclick: importBtn ? importBtn.getAttribute('onclick') : null
            };
        });
        
        console.log('📦 Import Button Check:');
        console.log(`  Exists: ${importBtnExists.exists ? '✅' : '❌'}`);
        console.log(`  Text: ${importBtnExists.text}`);
        console.log(`  OnClick: ${importBtnExists.onclick}\n`);
        
        if (importBtnExists.exists) {
            // Click import button
            console.log('4️⃣ Opening CSV Import Modal...\n');
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const importBtn = btns.find(btn => btn.textContent.includes('Import CSV'));
                if (importBtn) importBtn.click();
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check modal
            const modalCheck = await page.evaluate(() => {
                const modal = document.getElementById('csvModal');
                const fileInput = document.getElementById('csvFile');
                const form = document.getElementById('csvForm');
                
                return {
                    modal: {
                        exists: !!modal,
                        display: modal ? window.getComputedStyle(modal).display : null,
                        visible: modal ? modal.style.display !== 'none' : false
                    },
                    fileInput: {
                        exists: !!fileInput,
                        type: fileInput ? fileInput.type : null,
                        accept: fileInput ? fileInput.accept : null
                    },
                    form: {
                        exists: !!form,
                        action: form ? form.action : null
                    }
                };
            });
            
            console.log('🔍 Modal Status:');
            console.log(`  Modal Exists: ${modalCheck.modal.exists ? '✅' : '❌'}`);
            console.log(`  Modal Display: ${modalCheck.modal.display}`);
            console.log(`  File Input: ${modalCheck.fileInput.exists ? '✅' : '❌'}`);
            console.log(`  Form Exists: ${modalCheck.form.exists ? '✅' : '❌'}\n`);
            
            // Check JavaScript errors
            const jsErrors = await page.evaluate(() => {
                // Check if showCSVImportModal function exists
                const funcExists = typeof showCSVImportModal !== 'undefined';
                
                // Check for any error messages
                const errorElements = Array.from(document.querySelectorAll('.error, .alert-danger'));
                
                return {
                    showCSVImportModalExists: funcExists,
                    errorMessages: errorElements.map(el => el.textContent)
                };
            });
            
            console.log('🔧 JavaScript Check:');
            console.log(`  showCSVImportModal function: ${jsErrors.showCSVImportModalExists ? '✅ Exists' : '❌ Missing'}`);
            if (jsErrors.errorMessages.length > 0) {
                console.log(`  Error Messages: ${jsErrors.errorMessages.join(', ')}`);
            }
            
            // Check network for import endpoint
            console.log('\n5️⃣ Testing API Endpoint Directly...\n');
            const apiTest = await page.evaluate(async () => {
                const token = localStorage.getItem('token');
                
                // Create test CSV content
                const csvContent = 'idea_title,idea_description,question_1,question_2,question_3,question_4,question_5,question_6,coverage_start_date,coverage_end_date,tags,interviewees\n' +
                    'API Test Story,Testing CSV import via API,Q1,Q2,Q3,Q4,Q5,Q6,2025-01-01,2025-01-31,Test,Tester';
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const formData = new FormData();
                formData.append('csv', blob, 'test.csv');
                
                try {
                    const response = await fetch('/api/stories/import', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });
                    
                    const result = await response.json();
                    return {
                        status: response.status,
                        ok: response.ok,
                        result: result
                    };
                } catch (error) {
                    return {
                        error: error.message
                    };
                }
            });
            
            console.log('📡 API Test Result:');
            console.log(`  Status: ${apiTest.status || 'N/A'}`);
            console.log(`  Success: ${apiTest.ok ? '✅' : '❌'}`);
            if (apiTest.result) {
                console.log(`  Response:`, JSON.stringify(apiTest.result, null, 2));
            }
            if (apiTest.error) {
                console.log(`  Error: ${apiTest.error}`);
            }
        }
        
        // Take screenshot
        await page.screenshot({ path: 'csv-import-debug.png', fullPage: true });
        console.log('\n📸 Screenshot saved: csv-import-debug.png');
        
    } catch (error) {
        console.error('🚨 Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testCSVImportUI().catch(console.error);