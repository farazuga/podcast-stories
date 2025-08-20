#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function verifyDeployments() {
    console.log('🔍 VERIFYING DEPLOYMENTS');
    console.log('=' .repeat(40));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    // Enable console logging to see JS errors
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    try {
        // Check files directly
        console.log('📝 Checking file deployments...');
        
        console.log('\n1. Testing JS files:');
        await page.goto('https://podcast-stories-production.up.railway.app/js/stories.js');
        const jsContent = await page.content();
        console.log(`   stories.js loads: ${jsContent.includes('story-date-compact') ? '✅' : '❌'}`);
        
        await page.goto('https://podcast-stories-production.up.railway.app/js/shared-filters.js');
        const filtersContent = await page.content();
        console.log(`   shared-filters.js loads: ${filtersContent.includes('coverage_newest') ? '✅' : '❌'}`);
        
        console.log('\n2. Testing page load:');
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.waitForSelector('#email');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        console.log('   Login: ✅');
        
        console.log('\n3. Testing stories page:');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const pageCheck = await page.evaluate(() => {
            return {
                hasStories: document.querySelectorAll('.story-card').length > 0,
                hasSortBy: !!document.querySelector('#sortBy'),
                hasListBtn: !!document.querySelector('#listViewBtn'),
                hasGridBtn: !!document.querySelector('#gridViewBtn'),
                sortOptions: Array.from(document.querySelectorAll('#sortBy option')).map(opt => opt.value),
                jsErrors: window.lastError || null
            };
        });
        
        console.log(`   Stories loaded: ${pageCheck.hasStories ? '✅' : '❌'}`);
        console.log(`   Sort dropdown: ${pageCheck.hasSortBy ? '✅' : '❌'}`);
        console.log(`   View buttons: ${pageCheck.hasListBtn && pageCheck.hasGridBtn ? '✅' : '❌'}`);
        console.log(`   Sort options: ${pageCheck.sortOptions.join(', ')}`);
        console.log(`   Coverage sorting: ${pageCheck.sortOptions.includes('coverage_newest') ? '✅' : '❌'}`);
        
        if (pageCheck.hasListBtn) {
            console.log('\n4. Testing list view switch:');
            await page.click('#listViewBtn');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const listCheck = await page.evaluate(() => {
                const listCards = document.querySelectorAll('.story-card-list');
                const firstCard = listCards[0];
                
                return {
                    hasListCards: listCards.length > 0,
                    hasDateElement: firstCard ? !!firstCard.querySelector('.story-date-compact') : false,
                    hasTooltip: firstCard ? firstCard.querySelector('.story-title-compact')?.hasAttribute('title') : false,
                    hasCheckbox: firstCard ? !!firstCard.querySelector('.story-checkbox-compact input[type="checkbox"]') : false
                };
            });
            
            console.log(`   List cards: ${listCheck.hasListCards ? '✅' : '❌'}`);
            console.log(`   Date element: ${listCheck.hasDateElement ? '✅' : '❌'}`);
            console.log(`   Title tooltip: ${listCheck.hasTooltip ? '✅' : '❌'}`);
            console.log(`   Native checkbox: ${listCheck.hasCheckbox ? '✅' : '❌'}`);
        }
        
        await page.screenshot({ 
            path: './deployment-verification.png', 
            fullPage: false,
            clip: { x: 0, y: 0, width: 1200, height: 800 }
        });
        console.log('\n📸 Screenshot: deployment-verification.png');
        
        console.log('\n✅ Verification complete!');
        
    } catch (error) {
        console.error('❌ Verification error:', error.message);
    }

    await browser.close();
}

verifyDeployments().catch(console.error);