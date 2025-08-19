const puppeteer = require('puppeteer');

async function debugFavoritesAPI() {
    console.log('🔍 Debugging Favorites API Issues\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const page = await browser.newPage();
    
    // Capture all console messages
    page.on('console', msg => {
        console.log(`🔵 BROWSER: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
        console.log(`❌ PAGE ERROR: ${error.message}`);
    });

    try {
        console.log('Step 1: Login and get token...');
        await page.goto('https://podcast-stories-production.up.railway.app');
        await page.type('#email', 'teacher@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        console.log('Step 2: Navigate to stories page...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('Step 3: Debug API responses...');
        
        // Get token and test API directly
        const debugInfo = await page.evaluate(async () => {
            const token = localStorage.getItem('token');
            const apiUrl = window.API_URL || 'https://podcast-stories-production.up.railway.app/api';
            
            try {
                // Test stories API
                const storiesResponse = await fetch(`${apiUrl}/stories`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const stories = await storiesResponse.json();
                
                // Test favorites API  
                const favoritesResponse = await fetch(`${apiUrl}/favorites`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const favorites = await favoritesResponse.json();
                
                // Test adding a favorite
                const testStoryId = stories.length > 0 ? stories[0].id : null;
                let favoriteAddResult = null;
                
                if (testStoryId) {
                    try {
                        const addResponse = await fetch(`${apiUrl}/favorites/${testStoryId}`, {
                            method: 'POST',
                            headers: { 
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        favoriteAddResult = {
                            status: addResponse.status,
                            ok: addResponse.ok,
                            response: addResponse.ok ? await addResponse.json() : await addResponse.text()
                        };
                    } catch (err) {
                        favoriteAddResult = { error: err.message };
                    }
                }
                
                return {
                    token: token ? 'present' : 'missing',
                    tokenLength: token ? token.length : 0,
                    apiUrl,
                    storiesAPI: {
                        status: storiesResponse.status,
                        ok: storiesResponse.ok,
                        count: Array.isArray(stories) ? stories.length : 'not array',
                        firstStory: stories.length > 0 ? {
                            id: stories[0].id,
                            title: stories[0].idea_title,
                            favorite_count: stories[0].favorite_count,
                            hasAllFields: {
                                id: 'id' in stories[0],
                                title: 'idea_title' in stories[0],
                                favorite_count: 'favorite_count' in stories[0],
                                uploaded_by_name: 'uploaded_by_name' in stories[0]
                            }
                        } : null
                    },
                    favoritesAPI: {
                        status: favoritesResponse.status,
                        ok: favoritesResponse.ok,
                        count: Array.isArray(favorites) ? favorites.length : 'not array',
                        sample: favorites.length > 0 ? favorites[0] : null
                    },
                    favoriteAddTest: favoriteAddResult,
                    globalVariables: {
                        allStories: typeof allStories !== 'undefined' ? allStories.length : 'undefined',
                        userFavorites: typeof userFavorites !== 'undefined' ? userFavorites.size : 'undefined',
                        currentUser: typeof currentUser !== 'undefined' ? currentUser.role : 'undefined'
                    }
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        
        console.log('\n📊 API DEBUG RESULTS:');
        console.log('Token:', debugInfo.token);
        console.log('API URL:', debugInfo.apiUrl);
        
        console.log('\n📚 Stories API:');
        console.log(`  Status: ${debugInfo.storiesAPI.status} (${debugInfo.storiesAPI.ok ? 'OK' : 'ERROR'})`);
        console.log(`  Stories count: ${debugInfo.storiesAPI.count}`);
        
        if (debugInfo.storiesAPI.firstStory) {
            console.log('  First story:');
            console.log(`    ID: ${debugInfo.storiesAPI.firstStory.id}`);
            console.log(`    Title: ${debugInfo.storiesAPI.firstStory.title}`);
            console.log(`    Favorite count: ${debugInfo.storiesAPI.firstStory.favorite_count}`);
            console.log('    Has fields:', debugInfo.storiesAPI.firstStory.hasAllFields);
        }
        
        console.log('\n❤️ Favorites API:');
        console.log(`  Status: ${debugInfo.favoritesAPI.status} (${debugInfo.favoritesAPI.ok ? 'OK' : 'ERROR'})`);
        console.log(`  Favorites count: ${debugInfo.favoritesAPI.count}`);
        if (debugInfo.favoritesAPI.sample) {
            console.log('  Sample favorite:', debugInfo.favoritesAPI.sample);
        }
        
        console.log('\n🧪 Favorite Add Test:');
        if (debugInfo.favoriteAddTest) {
            console.log(`  Status: ${debugInfo.favoriteAddTest.status}`);
            console.log(`  OK: ${debugInfo.favoriteAddTest.ok}`);
            console.log('  Response:', debugInfo.favoriteAddTest.response);
        }
        
        console.log('\n🌐 Global Variables:');
        console.log('  allStories:', debugInfo.globalVariables.allStories);
        console.log('  userFavorites:', debugInfo.globalVariables.userFavorites);
        console.log('  currentUser:', debugInfo.globalVariables.currentUser);
        
        console.log('\nStep 4: Check DOM elements...');
        
        const domDebug = await page.evaluate(() => {
            const storyCards = document.querySelectorAll('[data-story-id]');
            const favoriteButtons = document.querySelectorAll('.favorite-btn');
            const favoriteCounts = document.querySelectorAll('.favorite-count');
            
            const firstCard = storyCards[0];
            const firstBtn = firstCard ? firstCard.querySelector('.favorite-btn') : null;
            const firstCount = firstBtn ? firstBtn.querySelector('.favorite-count') : null;
            
            return {
                storyCards: storyCards.length,
                favoriteButtons: favoriteButtons.length,
                favoriteCounts: favoriteCounts.length,
                firstCard: {
                    exists: !!firstCard,
                    storyId: firstCard ? firstCard.getAttribute('data-story-id') : null,
                    innerHTML: firstCard ? firstCard.innerHTML.substring(0, 200) : null
                },
                firstButton: {
                    exists: !!firstBtn,
                    classes: firstBtn ? firstBtn.className : null,
                    innerHTML: firstBtn ? firstBtn.innerHTML : null
                },
                firstCount: {
                    exists: !!firstCount,
                    text: firstCount ? firstCount.textContent : null,
                    innerHTML: firstCount ? firstCount.innerHTML : null
                }
            };
        });
        
        console.log('\n🏗️ DOM DEBUG RESULTS:');
        console.log(`  Story cards: ${domDebug.storyCards}`);
        console.log(`  Favorite buttons: ${domDebug.favoriteButtons}`);
        console.log(`  Favorite counts: ${domDebug.favoriteCounts}`);
        
        console.log('  First card:', domDebug.firstCard.exists ? '✅' : '❌');
        if (domDebug.firstCard.exists) {
            console.log(`    Story ID: ${domDebug.firstCard.storyId}`);
        }
        
        console.log('  First button:', domDebug.firstButton.exists ? '✅' : '❌');
        if (domDebug.firstButton.exists) {
            console.log(`    Classes: ${domDebug.firstButton.classes}`);
            console.log(`    HTML: ${domDebug.firstButton.innerHTML}`);
        }
        
        console.log('  First count:', domDebug.firstCount.exists ? '✅' : '❌');
        if (domDebug.firstCount.exists) {
            console.log(`    Text: "${domDebug.firstCount.text}"`);
            console.log(`    HTML: ${domDebug.firstCount.innerHTML}`);
        }
        
        console.log('\n🎯 SUMMARY:');
        if (debugInfo.storiesAPI.ok && debugInfo.storiesAPI.firstStory && debugInfo.storiesAPI.firstStory.hasAllFields.favorite_count) {
            console.log('✅ API returning favorite_count correctly');
        } else {
            console.log('❌ API not returning favorite_count');
        }
        
        if (domDebug.favoriteCounts > 0) {
            console.log('✅ Favorite count elements exist in DOM');
        } else {
            console.log('❌ No favorite count elements in DOM');
        }
        
        await page.screenshot({ path: 'favorites-debug.png', fullPage: true });
        console.log('📸 Screenshot saved as favorites-debug.png');
        
        console.log('\nBrowser staying open for manual inspection. Press Ctrl+C to close.');
        await new Promise(() => {}); // Keep browser open
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        await browser.close();
    }
}

debugFavoritesAPI();