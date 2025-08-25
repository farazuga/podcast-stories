const puppeteer = require('puppeteer');

async function testFavoritesDirect() {
    console.log('⭐ Testing Favorites Functionality Directly');
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.text().includes('favorite') || msg.text().includes('Loading from endpoint')) {
            console.log('CONSOLE:', msg.text());
        }
    });
    
    try {
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ Logged in, now testing direct favorites URL...');
        
        // Navigate directly to favorites
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html?favorites=true');
        await new Promise(r => setTimeout(r, 5000));
        
        const pageCheck = await page.evaluate(() => {
            return {
                title: document.title,
                header: document.querySelector('h1') ? document.querySelector('h1').textContent : 'No header',
                url: window.location.href,
                storiesCount: document.querySelectorAll('.story-card, .story-item').length,
                hasEmptyState: !!document.querySelector('.no-favorites-message'),
                emptyStateText: document.querySelector('.no-favorites-message') ? document.querySelector('.no-favorites-message').textContent.substring(0, 100) : null
            };
        });
        
        console.log('\\n📊 Page Results:');
        console.log(`Title: "${pageCheck.title}"`);
        console.log(`Header: "${pageCheck.header}"`);
        console.log(`URL: ${pageCheck.url}`);
        console.log(`Stories found: ${pageCheck.storiesCount}`);
        
        if (pageCheck.hasEmptyState) {
            console.log(`Empty state: "${pageCheck.emptyStateText}"`);
        }
        
        const titleCheck = pageCheck.title.includes('Favorites');
        const headerCheck = pageCheck.header.includes('Favorite');
        const hasContent = pageCheck.storiesCount > 0 || pageCheck.hasEmptyState;
        
        console.log(`\\nResults:`);
        console.log(`- Title updated: ${titleCheck ? '✅' : '❌'}`);
        console.log(`- Header updated: ${headerCheck ? '✅' : '❌'}`);  
        console.log(`- Has content or empty state: ${hasContent ? '✅' : '❌'}`);
        
        const overallSuccess = titleCheck && headerCheck && hasContent;
        console.log(`\\nFavorites functionality working: ${overallSuccess ? '✅' : '❌'}`);
        
        await new Promise(r => setTimeout(r, 5000));
        
    } catch (error) {
        console.error('Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testFavoritesDirect().catch(console.error);