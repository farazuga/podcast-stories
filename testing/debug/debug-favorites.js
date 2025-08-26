const puppeteer = require('puppeteer');

async function debugFavorites() {
    console.log('🔍 Debugging Favorites Functionality');
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    try {
        console.log('1️⃣ Logging in as student...');
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('2️⃣ Navigating to stories page...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(r => setTimeout(r, 3000));
        
        console.log('3️⃣ Checking favorite buttons...');
        const info = await page.evaluate(() => {
            const favoriteStars = document.querySelectorAll('.favorite-star');
            const firstStar = favoriteStars[0];
            
            return {
                totalButtons: favoriteStars.length,
                firstButton: firstStar ? {
                    isFavorited: firstStar.classList.contains('favorited'),
                    icon: firstStar.textContent,
                    storyId: firstStar.getAttribute('data-story-id'),
                    classes: firstStar.className
                } : null
            };
        });
        
        console.log('Favorite buttons:', info.totalButtons);
        console.log('First button:', info.firstButton);
        
        if (info.totalButtons > 0) {
            console.log('4️⃣ Testing favorite click...');
            
            await page.click('.favorite-star');
            await new Promise(r => setTimeout(r, 2000));
            
            const afterClick = await page.evaluate(() => {
                const firstStar = document.querySelector('.favorite-star');
                return firstStar ? {
                    isFavorited: firstStar.classList.contains('favorited'),
                    icon: firstStar.textContent,
                    classes: firstStar.className
                } : null;
            });
            
            console.log('After click:', afterClick);
        }
        
        await new Promise(r => setTimeout(r, 5000));
        
    } catch (error) {
        console.error('Debug failed:', error);
    } finally {
        await browser.close();
    }
}

debugFavorites().catch(console.error);
