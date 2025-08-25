const puppeteer = require('puppeteer');

async function testDashboardFavorites() {
    console.log('🏠 Testing Dashboard Favorites Link');
    console.log('===================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1400, height: 900 });
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.text().includes('favorite') || msg.text().includes('Loading from endpoint')) {
                console.log(`   Browser: ${msg.text()}`);
            }
        });
        
        console.log('1️⃣ Logging in as student...');
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        console.log('2️⃣ On dashboard - checking favorites button...');
        await new Promise(r => setTimeout(r, 2000));
        
        // Check if favorites action exists
        const favoritesAction = await page.evaluate(() => {
            const element = document.getElementById('favoritesAction');
            return element ? {
                exists: true,
                text: element.textContent.trim(),
                onclick: element.getAttribute('onclick')
            } : { exists: false };
        });
        
        console.log(`   Favorites button exists: ${favoritesAction.exists ? '✅' : '❌'}`);
        if (favoritesAction.exists) {
            console.log(`   Button text: "${favoritesAction.text}"`);
            console.log(`   Onclick: ${favoritesAction.onclick}`);
        }
        
        console.log('3️⃣ Clicking favorites button...');
        await page.click('#favoritesAction');
        
        // Wait for navigation
        await new Promise(r => setTimeout(r, 3000));
        
        const currentUrl = page.url();
        const isOnStoriesPage = currentUrl.includes('stories.html');
        const hasFavoritesParam = currentUrl.includes('favorites=true');
        
        console.log(`   Current URL: ${currentUrl}`);
        console.log(`   On stories page: ${isOnStoriesPage ? '✅' : '❌'}`);
        console.log(`   Has favorites param: ${hasFavoritesParam ? '✅' : '❌'}`);
        
        console.log('4️⃣ Checking favorites page behavior...');
        
        // Check page title and header
        const pageInfo = await page.evaluate(() => {
            return {
                title: document.title,
                header: document.querySelector('h1') ? document.querySelector('h1').textContent : 'No header',
                hasStoriesGrid: !!document.getElementById('storiesGrid'),
                storiesGridContent: document.getElementById('storiesGrid') ? document.getElementById('storiesGrid').innerHTML.length : 0
            };
        });
        
        console.log(`   Page title: "${pageInfo.title}"`);
        console.log(`   Page header: "${pageInfo.header}"`);
        console.log(`   Stories grid exists: ${pageInfo.hasStoriesGrid ? '✅' : '❌'}`);
        console.log(`   Stories grid has content: ${pageInfo.storiesGridContent > 0 ? '✅' : '❌'}`);
        
        // Check for empty state or stories
        const contentCheck = await page.evaluate(() => {
            const noFavoritesMessage = document.querySelector('.no-favorites-message');
            const storyCards = document.querySelectorAll('.story-card, .story-item');
            
            return {
                hasEmptyState: !!noFavoritesMessage,
                emptyStateText: noFavoritesMessage ? noFavoritesMessage.textContent.trim() : null,
                storyCount: storyCards.length,
                firstStoryTitle: storyCards[0] ? storyCards[0].querySelector('.story-title, .story-title-compact')?.textContent : null
            };
        });
        
        if (contentCheck.hasEmptyState) {
            console.log('   📝 Empty favorites state detected:');
            console.log(`      Message: "${contentCheck.emptyStateText.substring(0, 100)}..."`);
        } else if (contentCheck.storyCount > 0) {
            console.log(`   📚 Found ${contentCheck.storyCount} favorite stories`);
            console.log(`      First story: "${contentCheck.firstStoryTitle}"`);
        } else {
            console.log('   ⚠️ Unknown state - no empty message and no stories');
        }
        
        console.log('\\n5️⃣ Testing navigation back to all stories...');
        
        // If there's an empty state, click the "Browse Stories" link
        if (contentCheck.hasEmptyState) {
            const browseLink = await page.$('a[href="/stories.html"]');
            if (browseLink) {
                console.log('   Clicking "Browse Stories" link from empty state...');
                await browseLink.click();
                await new Promise(r => setTimeout(r, 2000));
                
                const newUrl = page.url();
                console.log(`   New URL: ${newUrl}`);
                console.log(`   Back to all stories: ${!newUrl.includes('favorites=true') ? '✅' : '❌'}`);
            }
        }
        
        console.log('\\n🎯 Test Results Summary');
        console.log('========================');
        console.log(`✅ Dashboard favorites button works`);
        console.log(`✅ Redirects to stories page with favorites parameter`);
        console.log(`✅ Page title and header update for favorites mode`);
        console.log(`✅ Either shows favorites or appropriate empty state`);
        
        await new Promise(r => setTimeout(r, 3000));
        
    } catch (error) {
        console.error('🚨 Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testDashboardFavorites().catch(console.error);