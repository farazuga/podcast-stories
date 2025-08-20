#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * DEBUG FAVORITES FUNCTIONALITY
 * Focus on the last 28.6% to reach 100%
 */

async function debugFavorites() {
    console.log('🔧 DEBUGGING FAVORITES - Push to 100%');
    console.log('=' .repeat(50));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    
    // Track console messages
    const messages = [];
    page.on('console', msg => {
        messages.push({
            type: msg.type(),
            text: msg.text()
        });
    });
    
    try {
        console.log('\n🔐 Login and navigate to stories');
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        
        await page.waitForSelector('#email', { timeout: 10000 });
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        console.log('\\n⭐ STEP 1: Check favorite buttons exist');
        const favoriteCheck = await page.evaluate(() => {
            const favoriteButtons = document.querySelectorAll('.favorite-star, .favorite-btn');
            const firstButton = favoriteButtons[0];
            
            return {
                totalFavoriteButtons: favoriteButtons.length,
                firstButtonExists: !!firstButton,
                firstButtonText: firstButton ? firstButton.textContent : null,
                firstButtonOnClick: firstButton ? firstButton.getAttribute('onclick') : null
            };
        });
        
        console.log(`   Favorite buttons found: ${favoriteCheck.totalFavoriteButtons}`);
        console.log(`   First button text: "${favoriteCheck.firstButtonText}"`);
        console.log(`   First button onclick: ${favoriteCheck.firstButtonOnClick}`);
        
        if (favoriteCheck.totalFavoriteButtons > 0) {
            console.log('\\n⭐ STEP 2: Test clicking favorite button');
            
            // Clear messages before clicking
            messages.length = 0;
            
            // Click the first favorite button
            await page.evaluate(() => {
                const favoriteButton = document.querySelector('.favorite-star, .favorite-btn');
                if (favoriteButton) {
                    favoriteButton.click();
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check for errors
            const favoriteMessages = messages.filter(msg => 
                msg.text.includes('favorite') ||
                msg.text.includes('Failed') ||
                msg.text.includes('error') ||
                msg.text.includes('404') ||
                msg.text.includes('API')
            );
            
            console.log(`   Messages after click: ${favoriteMessages.length}`);
            favoriteMessages.forEach(msg => {
                console.log(`     [${msg.type}] ${msg.text}`);
            });
            
            console.log('\\n⭐ STEP 3: Check if toggleFavorite function exists');
            const functionCheck = await page.evaluate(() => {
                return {
                    toggleFavorite: typeof window.toggleFavorite === 'function',
                    API_URL: window.API_URL,
                    token: !!localStorage.getItem('token')
                };
            });
            
            console.log(`   toggleFavorite function: ${functionCheck.toggleFavorite ? '✅' : '❌'}`);
            console.log(`   API_URL available: ${functionCheck.API_URL ? '✅' : '❌'}`);
            console.log(`   Token available: ${functionCheck.token ? '✅' : '❌'}`);
            
            if (functionCheck.toggleFavorite) {
                console.log('\\n⭐ STEP 4: Test manual toggleFavorite call');
                
                const manualTest = await page.evaluate(async () => {
                    try {
                        // Find a story ID from the page
                        const storyCard = document.querySelector('.story-card[data-story-id]');
                        if (!storyCard) return { error: 'No story cards found' };
                        
                        const storyId = storyCard.getAttribute('data-story-id');
                        console.log('Testing toggleFavorite with story ID:', storyId);
                        
                        // Call toggleFavorite manually
                        await window.toggleFavorite(parseInt(storyId));
                        
                        return { success: true, storyId };
                    } catch (error) {
                        return { error: error.message, stack: error.stack };
                    }
                });
                
                if (manualTest.error) {
                    console.log(`   Manual test error: ${manualTest.error}`);
                } else {
                    console.log(`   Manual test success: Story ${manualTest.storyId}`);
                }
            }
        }
        
        console.log('\\n📊 SUMMARY');
        console.log('='.repeat(50));
        
        if (favoriteCheck.totalFavoriteButtons === 0) {
            console.log('❌ No favorite buttons found - UI rendering issue');
        } else if (!functionCheck.toggleFavorite) {
            console.log('❌ Favorite buttons exist but toggleFavorite function missing');
        } else if (!functionCheck.token) {
            console.log('❌ Functions exist but no auth token for API calls');
        } else {
            console.log('✅ Everything should work - check API endpoint');
        }
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
    
    await browser.close();
}

debugFavorites().catch(console.error);