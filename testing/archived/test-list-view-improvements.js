#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testListViewImprovements() {
    console.log('📋 TESTING LIST VIEW IMPROVEMENTS');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    try {
        // Login
        console.log('📝 Step 1: Logging in...');
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.waitForSelector('#email');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        // Navigate to stories page
        console.log('📝 Step 2: Navigating to stories page...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Switch to list view
        console.log('\n📋 Step 3: Testing List View Improvements...');
        const listViewBtn = await page.$('#listViewBtn');
        if (listViewBtn) {
            await listViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Test 1: Date Display in List View
        console.log('\n📅 TEST 1: DATE DISPLAY');
        console.log('-'.repeat(40));
        
        const dateDisplayTest = await page.evaluate(() => {
            const listCards = document.querySelectorAll('.story-card-list');
            if (listCards.length === 0) return { error: 'No list cards found' };
            
            const firstCard = listCards[0];
            const dateElement = firstCard.querySelector('.story-date-compact');
            
            return {
                hasDateElement: !!dateElement,
                dateText: dateElement ? dateElement.textContent.trim() : null,
                dateVisible: dateElement ? window.getComputedStyle(dateElement).display !== 'none' : false
            };
        });
        
        console.log(`   Date Element Present: ${dateDisplayTest.hasDateElement ? '✅' : '❌'}`);
        console.log(`   Date Visible: ${dateDisplayTest.dateVisible ? '✅' : '❌'}`);
        console.log(`   Date Text: ${dateDisplayTest.dateText || 'None'}`);
        
        // Test 2: Date Sorting Functionality
        console.log('\n📊 TEST 2: DATE SORTING');
        console.log('-'.repeat(40));
        
        const sortingTest = await page.evaluate(() => {
            const sortSelect = document.querySelector('#sortBy');
            if (!sortSelect) return { error: 'Sort dropdown not found' };
            
            // Check for new sorting options
            const options = Array.from(sortSelect.options).map(opt => ({
                value: opt.value,
                text: opt.textContent
            }));
            
            const hasCoverageSorting = options.some(opt => opt.value === 'coverage_newest');
            
            return {
                sortOptions: options,
                hasCoverageSorting,
                totalOptions: options.length
            };
        });
        
        console.log(`   Coverage Date Sorting: ${sortingTest.hasCoverageSorting ? '✅' : '❌'}`);
        console.log(`   Total Sort Options: ${sortingTest.totalOptions}`);
        console.log('   Available Options:');
        sortingTest.sortOptions.forEach(opt => {
            console.log(`     • ${opt.text} (${opt.value})`);
        });
        
        // Test sorting functionality
        await page.select('#sortBy', 'coverage_newest');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const sortingWorking = await page.evaluate(() => {
            const sortSelect = document.querySelector('#sortBy');
            return sortSelect.value === 'coverage_newest';
        });
        
        console.log(`   Sorting Selection Working: ${sortingWorking ? '✅' : '❌'}`);
        
        // Test 3: Fixed Checkbox (No Double Box)
        console.log('\n☑️ TEST 3: CHECKBOX IMPROVEMENTS');
        console.log('-'.repeat(40));
        
        const checkboxTest = await page.evaluate(() => {
            const firstCard = document.querySelector('.story-card-list');
            if (!firstCard) return { error: 'No list card found' };
            
            const checkboxContainer = firstCard.querySelector('.story-checkbox-compact');
            const checkbox = checkboxContainer ? checkboxContainer.querySelector('input[type="checkbox"]') : null;
            const customCheckmark = checkboxContainer ? checkboxContainer.querySelector('.checkmark-compact') : null;
            
            return {
                hasCheckboxContainer: !!checkboxContainer,
                hasCheckbox: !!checkbox,
                hasCustomCheckmark: !!customCheckmark,
                checkboxVisible: checkbox ? window.getComputedStyle(checkbox).display !== 'none' : false,
                containerStyles: checkboxContainer ? window.getComputedStyle(checkboxContainer).padding : null
            };
        });
        
        console.log(`   Checkbox Container: ${checkboxTest.hasCheckboxContainer ? '✅' : '❌'}`);
        console.log(`   Native Checkbox: ${checkboxTest.hasCheckbox ? '✅' : '❌'}`);
        console.log(`   Custom Checkmark: ${!checkboxTest.hasCustomCheckmark ? '✅ (Removed)' : '❌ (Still Present)'}`);
        console.log(`   Checkbox Visible: ${checkboxTest.checkboxVisible ? '✅' : '❌'}`);
        console.log(`   Container Padding: ${checkboxTest.containerStyles}`);
        
        // Test checkbox functionality
        const checkboxFunctional = await page.evaluate(() => {
            const firstCheckbox = document.querySelector('.story-checkbox-compact input[type="checkbox"]');
            if (!firstCheckbox) return false;
            
            const initialState = firstCheckbox.checked;
            firstCheckbox.click();
            const newState = firstCheckbox.checked;
            
            // Reset to original state
            firstCheckbox.click();
            
            return initialState !== newState;
        });
        
        console.log(`   Checkbox Functional: ${checkboxFunctional ? '✅' : '❌'}`);
        
        // Test 4: Tag Hover Tooltips
        console.log('\n🏷️ TEST 4: TAG HOVER TOOLTIPS');
        console.log('-'.repeat(40));
        
        const tooltipTest = await page.evaluate(() => {
            const firstCard = document.querySelector('.story-card-list');
            if (!firstCard) return { error: 'No list card found' };
            
            const titleElement = firstCard.querySelector('.story-title-compact');
            if (!titleElement) return { error: 'No title element found' };
            
            const hasTooltip = titleElement.hasAttribute('title');
            const tooltipText = titleElement.getAttribute('title');
            
            return {
                hasTooltip,
                tooltipText,
                containsTags: tooltipText ? tooltipText.includes('Tags:') : false
            };
        });
        
        console.log(`   Title Has Tooltip: ${tooltipTest.hasTooltip ? '✅' : '❌'}`);
        console.log(`   Contains Tags: ${tooltipTest.containsTags ? '✅' : '❌'}`);
        console.log(`   Tooltip Text: ${tooltipTest.tooltipText || 'None'}`);
        
        // Test hover functionality (simulate)
        const hoverTest = await page.evaluate(() => {
            const titleElement = document.querySelector('.story-title-compact');
            if (!titleElement) return false;
            
            // Trigger hover event
            const event = new MouseEvent('mouseenter', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            titleElement.dispatchEvent(event);
            
            return true;
        });
        
        console.log(`   Hover Event Triggered: ${hoverTest ? '✅' : '❌'}`);
        
        // Test 5: Overall List View Layout
        console.log('\n📐 TEST 5: LIST VIEW LAYOUT');
        console.log('-'.repeat(40));
        
        const layoutTest = await page.evaluate(() => {
            const listCards = document.querySelectorAll('.story-card-list');
            if (listCards.length === 0) return { error: 'No list cards' };
            
            const firstCard = listCards[0];
            const cardRect = firstCard.getBoundingClientRect();
            const cardStyles = window.getComputedStyle(firstCard);
            
            // Check layout components
            const hasHeader = !!firstCard.querySelector('.story-header-compact');
            const hasDate = !!firstCard.querySelector('.story-date-compact');
            const hasActions = !!firstCard.querySelector('.story-actions-compact');
            const hasStar = !!firstCard.querySelector('.favorite-star');
            
            return {
                cardHeight: Math.round(cardRect.height),
                padding: cardStyles.padding,
                hasHeader,
                hasDate,
                hasActions,
                hasStar,
                isCompactLayout: cardRect.height <= 60 && hasHeader && hasDate && hasActions && hasStar
            };
        });
        
        console.log(`   Card Height: ${layoutTest.cardHeight}px`);
        console.log(`   Card Padding: ${layoutTest.padding}`);
        console.log(`   Has Header: ${layoutTest.hasHeader ? '✅' : '❌'}`);
        console.log(`   Has Date: ${layoutTest.hasDate ? '✅' : '❌'}`);
        console.log(`   Has Actions: ${layoutTest.hasActions ? '✅' : '❌'}`);
        console.log(`   Has Star: ${layoutTest.hasStar ? '✅' : '❌'}`);
        console.log(`   Compact Layout: ${layoutTest.isCompactLayout ? '✅' : '❌'}`);
        
        // Take screenshots
        console.log('\n📸 Step 4: Taking screenshots...');
        await page.screenshot({ 
            path: './list-view-improvements.png', 
            fullPage: true 
        });
        console.log('📸 Screenshot saved: list-view-improvements.png');
        
        // Summary
        console.log('\n' + '=' .repeat(60));
        console.log('📋 LIST VIEW IMPROVEMENTS SUMMARY');
        console.log('=' .repeat(60));
        
        const improvements = [];
        const issues = [];
        
        if (dateDisplayTest.hasDateElement && dateDisplayTest.dateVisible) {
            improvements.push('✅ Date display in list view working');
        } else {
            issues.push('❌ Date display not working properly');
        }
        
        if (sortingTest.hasCoverageSorting && sortingWorking) {
            improvements.push('✅ Coverage date sorting implemented');
        } else {
            issues.push('❌ Date sorting not working');
        }
        
        if (checkboxTest.hasCheckbox && !checkboxTest.hasCustomCheckmark && checkboxFunctional) {
            improvements.push('✅ Checkbox double box issue fixed');
        } else {
            issues.push('❌ Checkbox issues remain');
        }
        
        if (tooltipTest.hasTooltip && tooltipTest.containsTags) {
            improvements.push('✅ Tag hover tooltips working');
        } else {
            issues.push('❌ Tag tooltips not working');
        }
        
        if (layoutTest.isCompactLayout) {
            improvements.push('✅ Compact list layout achieved');
        } else {
            issues.push('❌ List layout needs improvement');
        }
        
        console.log('\n🎉 Successful Improvements:');
        improvements.forEach(improvement => console.log(`   ${improvement}`));
        
        if (issues.length > 0) {
            console.log('\n⚠️  Issues to Address:');
            issues.forEach(issue => console.log(`   ${issue}`));
        }
        
        const successRate = improvements.length / (improvements.length + issues.length) * 100;
        console.log(`\n📊 Success Rate: ${successRate.toFixed(1)}%`);
        
        if (successRate >= 80) {
            console.log('\n🎉 LIST VIEW IMPROVEMENTS: SUCCESS!');
        } else {
            console.log('\n⚠️  Some improvements need attention');
        }
        
        console.log('\n🔍 Browser staying open for manual verification...');
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }

    await browser.close();
}

testListViewImprovements().catch(console.error);