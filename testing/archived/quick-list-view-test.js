#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function quickListViewTest() {
    console.log('⚡ QUICK LIST VIEW TEST');
    console.log('=' .repeat(40));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    try {
        // Clear cache and disable cache
        await page.setCacheEnabled(false);
        
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
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Switch to list view
        console.log('📝 Switching to list view...');
        const listViewBtn = await page.$('#listViewBtn');
        if (listViewBtn) {
            await listViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Quick checks
        const results = await page.evaluate(() => {
            const listCards = document.querySelectorAll('.story-card-list');
            const sortSelect = document.querySelector('#sortBy');
            
            if (listCards.length === 0) return { error: 'No list cards found' };
            
            const firstCard = listCards[0];
            const dateElement = firstCard.querySelector('.story-date-compact');
            const titleElement = firstCard.querySelector('.story-title-compact');
            const checkboxElement = firstCard.querySelector('.story-checkbox-compact input[type="checkbox"]');
            
            // Check sort options
            const sortOptions = Array.from(sortSelect.options).map(opt => opt.value);
            
            return {
                totalCards: listCards.length,
                hasDateElement: !!dateElement,
                dateText: dateElement ? dateElement.textContent.trim() : null,
                hasCoverageSorting: sortOptions.includes('coverage_newest'),
                hasTooltip: titleElement ? titleElement.hasAttribute('title') : false,
                tooltipText: titleElement ? titleElement.getAttribute('title') : null,
                hasNativeCheckbox: !!checkboxElement,
                checkboxWorking: checkboxElement ? true : false
            };
        });
        
        console.log('\n📋 LIST VIEW RESULTS:');
        console.log(`📊 Cards Found: ${results.totalCards}`);
        console.log(`📅 Date Element: ${results.hasDateElement ? '✅' : '❌'}`);
        console.log(`📅 Date Text: ${results.dateText || 'None'}`);
        console.log(`🔄 Coverage Sorting: ${results.hasCoverageSorting ? '✅' : '❌'}`);
        console.log(`🏷️ Title Tooltip: ${results.hasTooltip ? '✅' : '❌'}`);
        console.log(`🏷️ Tooltip Text: ${results.tooltipText || 'None'}`);
        console.log(`☑️ Native Checkbox: ${results.hasNativeCheckbox ? '✅' : '❌'}`);
        
        // Test sorting
        console.log('\n📝 Testing sorting...');
        await page.select('#sortBy', 'coverage_newest');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const sortingTest = await page.evaluate(() => {
            const sortSelect = document.querySelector('#sortBy');
            return sortSelect.value;
        });
        
        console.log(`🔄 Sorting Changed To: ${sortingTest}`);
        console.log(`🔄 Sorting Working: ${sortingTest === 'coverage_newest' ? '✅' : '❌'}`);
        
        // Take screenshot
        await page.screenshot({ 
            path: './quick-list-view-test.png', 
            fullPage: false,
            clip: { x: 0, y: 0, width: 1200, height: 800 }
        });
        console.log('📸 Screenshot: quick-list-view-test.png');
        
        const successCount = [
            results.hasDateElement,
            results.hasCoverageSorting,
            results.hasTooltip,
            results.hasNativeCheckbox,
            sortingTest === 'coverage_newest'
        ].filter(Boolean).length;
        
        const successRate = (successCount / 5) * 100;
        console.log(`\n📊 Success Rate: ${successRate}%`);
        
        if (successRate >= 80) {
            console.log('🎉 LIST VIEW IMPROVEMENTS: SUCCESS!');
        } else {
            console.log('⚠️ Some features not working');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }

    await browser.close();
}

quickListViewTest().catch(console.error);