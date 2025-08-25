const puppeteer = require('puppeteer');

async function testFavorites() {
    console.log('⭐ Testing Favorites Fix');
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.text().includes('favorite')) {
            console.log('Browser:', msg.text());
        }
    });
    
    try {
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(r => setTimeout(r, 3000));
        
        console.log('📚 Testing stories page favorites...');
        
        const before = await page.evaluate(() => {
            const btn = document.querySelector('.favorite-star');
            return btn ? {
                favorited: btn.classList.contains('favorited'),
                icon: btn.textContent.trim()
            } : null;
        });
        
        const beforeText = before ? `${before.favorited ? 'Favorited' : 'Not favorited'} (${before.icon})` : 'No button';
        console.log(`Before: ${beforeText}`);
        
        if (before) {
            await page.click('.favorite-star');
            await new Promise(r => setTimeout(r, 2000));
            
            const after = await page.evaluate(() => {
                const btn = document.querySelector('.favorite-star');
                return btn ? {
                    favorited: btn.classList.contains('favorited'),
                    icon: btn.textContent.trim()
                } : null;
            });
            
            const afterText = after ? `${after.favorited ? 'Favorited' : 'Not favorited'} (${after.icon})` : 'No button';
            console.log(`After: ${afterText}`);
            
            const changed = before.favorited !== after.favorited;
            console.log(`State changed: ${changed ? '✅' : '❌'}`);
        }
        
        await new Promise(r => setTimeout(r, 2000));
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

testFavorites().catch(console.error);