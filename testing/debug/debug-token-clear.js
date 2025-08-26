const puppeteer = require('puppeteer');

async function debugTokenClear() {
    console.log('🕵️ Debugging Exact Token Clear Location...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Override localStorage methods to track when token is removed
        await page.evaluateOnNewDocument(() => {
            const originalRemoveItem = Storage.prototype.removeItem;
            const originalClear = Storage.prototype.clear;
            
            Storage.prototype.removeItem = function(key) {
                if (key === 'token' || key === 'user') {
                    console.log(`🚨 ALERT: localStorage.removeItem("${key}") called!`);
                    console.trace('Stack trace:');
                }
                return originalRemoveItem.apply(this, arguments);
            };
            
            Storage.prototype.clear = function() {
                console.log('🚨 ALERT: localStorage.clear() called!');
                console.trace('Stack trace:');
                return originalClear.apply(this, arguments);
            };
            
            // Also monitor token changes
            let lastToken = null;
            setInterval(() => {
                const currentToken = localStorage.getItem('token');
                if (currentToken !== lastToken) {
                    console.log(`🔄 Token changed from "${lastToken ? lastToken.substring(0, 20) + '...' : 'null'}" to "${currentToken ? currentToken.substring(0, 20) + '...' : 'null'}"`);
                    lastToken = currentToken;
                }
            }, 100);
        });
        
        // Enable console logging
        page.on('console', msg => console.log(`📄 PAGE:`, msg.text()));
        page.on('error', err => console.log(`❌ ERROR:`, err.message));
        
        // Navigate and login
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2' 
        });
        
        console.log('🔐 Logging in...');
        
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        
        // Wait longer to see all the token changes
        console.log('⏳ Waiting to observe token changes...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        console.log('✅ Debug complete');
        
    } catch (error) {
        console.error('🚨 Debug failed:', error.message);
    } finally {
        await browser.close();
    }
}

debugTokenClear().catch(console.error);