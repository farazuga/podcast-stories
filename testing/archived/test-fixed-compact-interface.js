#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testFixedCompactInterface() {
    console.log('🔧 TESTING FIXED COMPACT INTERFACE');
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
        
        // Test Grid View First
        console.log('\n📊 TESTING GRID VIEW');
        console.log('-'.repeat(40));
        
        const gridViewBtn = await page.$('#gridViewBtn');
        if (gridViewBtn) {
            await gridViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const gridAnalysis = await page.evaluate(() => {
            const container = document.querySelector('.stories-grid');
            const cards = document.querySelectorAll('.story-card');
            
            if (!container || cards.length === 0) {
                return { error: 'No grid content found' };
            }
            
            const firstCard = cards[0];
            const cardRect = firstCard.getBoundingClientRect();
            const containerStyles = window.getComputedStyle(container);
            const cardStyles = window.getComputedStyle(firstCard);
            
            return {
                totalCards: cards.length,
                cardDimensions: {
                    width: Math.round(cardRect.width),
                    height: Math.round(cardRect.height)
                },
                spacing: {
                    padding: cardStyles.padding,
                    gap: containerStyles.gap,
                    maxHeight: cardStyles.maxHeight
                },
                isCompact: cardRect.height < 300 && cardStyles.padding.includes('12px')
            };
        });
        
        console.log(`📊 Grid Cards: ${gridAnalysis.totalCards} cards`);
        console.log(`📏 Card Size: ${gridAnalysis.cardDimensions.width}px × ${gridAnalysis.cardDimensions.height}px`);
        console.log(`📦 Padding: ${gridAnalysis.spacing.padding}`);
        console.log(`📐 Gap: ${gridAnalysis.spacing.gap}`);
        console.log(`📈 Max Height: ${gridAnalysis.spacing.maxHeight}`);
        console.log(`✅ Is Compact: ${gridAnalysis.isCompact ? 'YES' : 'NO'}`);
        
        // Test List View
        console.log('\n📋 TESTING LIST VIEW');
        console.log('-'.repeat(40));
        
        const listViewBtn = await page.$('#listViewBtn');
        if (listViewBtn) {
            await listViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const listAnalysis = await page.evaluate(() => {
                const listCards = document.querySelectorAll('.story-card-list');
                const container = document.querySelector('.stories-list');
                
                if (listCards.length === 0) {
                    return { error: 'No list view cards found' };
                }
                
                const firstListCard = listCards[0];
                const rect = firstListCard.getBoundingClientRect();
                const styles = window.getComputedStyle(firstListCard);
                
                // Check if our CSS fixes are applied
                const hasFlex = styles.display === 'flex';
                const hasCompactPadding = styles.padding.includes('8px') && styles.padding.includes('12px');
                const hasCompactHeight = rect.height < 80;
                
                return {
                    totalListCards: listCards.length,
                    rowHeight: Math.round(rect.height),
                    padding: styles.padding,
                    display: styles.display,
                    gap: styles.gap,
                    minHeight: styles.minHeight,
                    isCompactList: hasFlex && hasCompactPadding && hasCompactHeight,
                    cssChecks: {
                        hasFlex,
                        hasCompactPadding,
                        hasCompactHeight
                    }
                };
            });
            
            console.log(`📋 List Rows: ${listAnalysis.totalListCards} rows`);
            console.log(`📏 Row Height: ${listAnalysis.rowHeight}px`);
            console.log(`📦 Padding: ${listAnalysis.padding}`);
            console.log(`📐 Display: ${listAnalysis.display}`);
            console.log(`📊 Gap: ${listAnalysis.gap}`);
            console.log(`✅ Is Compact List: ${listAnalysis.isCompactList ? 'YES' : 'NO'}`);
            
            console.log('\n🔍 CSS Checks:');
            console.log(`   Flex Display: ${listAnalysis.cssChecks.hasFlex ? '✅' : '❌'}`);
            console.log(`   Compact Padding: ${listAnalysis.cssChecks.hasCompactPadding ? '✅' : '❌'}`);
            console.log(`   Compact Height: ${listAnalysis.cssChecks.hasCompactHeight ? '✅' : '❌'}`);
            
        } else {
            console.log('❌ List view button not found');
        }
        
        // Take comparison screenshots
        console.log('\n📸 TAKING SCREENSHOTS');
        console.log('-'.repeat(40));
        
        // Grid view
        if (gridViewBtn) {
            await gridViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.screenshot({ 
                path: './fixed-compact-grid.png', 
                fullPage: true 
            });
            console.log('📸 Fixed grid view: fixed-compact-grid.png');
        }
        
        // List view
        if (listViewBtn) {
            await listViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.screenshot({ 
                path: './fixed-compact-list.png', 
                fullPage: true 
            });
            console.log('📸 Fixed list view: fixed-compact-list.png');
        }
        
        // Summary
        console.log('\n' + '=' .repeat(60));
        console.log('📋 COMPACT INTERFACE FIX SUMMARY');
        console.log('=' .repeat(60));
        
        const improvements = [];
        const issues = [];
        
        if (gridAnalysis.isCompact) {
            improvements.push('✅ Grid view is now compact');
        } else {
            issues.push('❌ Grid view still needs work');
        }
        
        if (listAnalysis && listAnalysis.isCompactList) {
            improvements.push('✅ List view is now compact');
        } else {
            issues.push('❌ List view CSS fixes not applied properly');
        }
        
        console.log('\n🎉 Improvements:');
        improvements.forEach(improvement => console.log(`   ${improvement}`));
        
        if (issues.length > 0) {
            console.log('\n⚠️  Remaining Issues:');
            issues.forEach(issue => console.log(`   ${issue}`));
        }
        
        const successRate = improvements.length / (improvements.length + issues.length) * 100;
        console.log(`\n📊 Success Rate: ${successRate.toFixed(1)}%`);
        
        if (successRate >= 90) {
            console.log('\n🎉 COMPACT INTERFACE SUCCESSFULLY IMPLEMENTED!');
        } else {
            console.log('\n⚠️  Additional fixes may be needed');
        }
        
        console.log('\n🔍 Browser staying open for manual verification...');
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }

    await browser.close();
}

testFixedCompactInterface().catch(console.error);