#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function quickUltraCompactTest() {
    console.log('⚡ QUICK ULTRA-COMPACT TEST');
    console.log('=' .repeat(40));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    try {
        // Login
        console.log('📝 Logging in...');
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.waitForSelector('#email');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        // Navigate to stories
        console.log('📝 Navigating to stories...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check ultra-compact elements
        const compactCheck = await page.evaluate(() => {
            const cards = document.querySelectorAll('.story-card');
            if (cards.length === 0) return { error: 'No cards found' };
            
            const firstCard = cards[0];
            const cardHeight = firstCard.getBoundingClientRect().height;
            
            return {
                totalCards: cards.length,
                cardHeight: Math.round(cardHeight),
                hasCompactHeader: !!firstCard.querySelector('.story-header-compact'),
                hasFavoriteStar: !!firstCard.querySelector('.favorite-star'),
                hasCompactCheckbox: !!firstCard.querySelector('.story-checkbox-compact'),
                hasDescription: !!firstCard.querySelector('.story-description'),
                hasUploadMeta: !!firstCard.querySelector('.story-author') || !!firstCard.querySelector('.story-date')
            };
        });
        
        console.log('\n🎯 ULTRA-COMPACT RESULTS:');
        console.log(`📊 Cards Found: ${compactCheck.totalCards}`);
        console.log(`📏 Card Height: ${compactCheck.cardHeight}px`);
        console.log(`📋 Compact Header: ${compactCheck.hasCompactHeader ? '✅' : '❌'}`);
        console.log(`⭐ Favorite Star: ${compactCheck.hasFavoriteStar ? '✅' : '❌'}`);
        console.log(`☑️ Compact Checkbox: ${compactCheck.hasCompactCheckbox ? '✅' : '❌'}`);
        console.log(`🗑️ Description Removed: ${!compactCheck.hasDescription ? '✅' : '❌'}`);
        console.log(`🚫 Upload Meta Removed: ${!compactCheck.hasUploadMeta ? '✅' : '❌'}`);
        
        const successCount = [
            compactCheck.hasCompactHeader,
            compactCheck.hasFavoriteStar,
            compactCheck.hasCompactCheckbox,
            !compactCheck.hasDescription,
            !compactCheck.hasUploadMeta
        ].filter(Boolean).length;
        
        const successRate = (successCount / 5) * 100;
        console.log(`\n📊 Success Rate: ${successRate}%`);
        
        if (successRate >= 80) {
            console.log('🎉 ULTRA-COMPACT INTERFACE: SUCCESS!');
        } else {
            console.log('⚠️ Some ultra-compact features not working');
        }
        
        // Take screenshot
        await page.screenshot({ 
            path: './ultra-compact-verified.png', 
            fullPage: false,
            clip: { x: 0, y: 0, width: 1200, height: 800 }
        });
        console.log('📸 Screenshot: ultra-compact-verified.png');
        
        console.log('\n✅ Test complete!');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }

    await browser.close();
}

quickUltraCompactTest().catch(console.error);