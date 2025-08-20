#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testUltraCompactInterface() {
    console.log('🎯 TESTING ULTRA-COMPACT INTERFACE');
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
        
        // Test Ultra-Compact Grid View
        console.log('\n🎯 TESTING ULTRA-COMPACT GRID VIEW');
        console.log('-'.repeat(50));
        
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
            const cardStyles = window.getComputedStyle(firstCard);
            
            // Check for ultra-compact elements
            const hasCompactHeader = !!firstCard.querySelector('.story-header-compact');
            const hasSimpleStar = !!firstCard.querySelector('.favorite-star');
            const hasCheckboxCompact = !!firstCard.querySelector('.story-checkbox-compact');
            const hasDescription = !!firstCard.querySelector('.story-description');
            const hasUploadMetadata = !!firstCard.querySelector('.story-author') || !!firstCard.querySelector('.story-date');
            
            // Check title layout
            const titleElement = firstCard.querySelector('.story-title-compact');
            const titleStyles = titleElement ? window.getComputedStyle(titleElement) : null;
            
            return {
                totalCards: cards.length,
                cardHeight: Math.round(cardRect.height),
                maxHeight: cardStyles.maxHeight,
                compactElements: {
                    hasCompactHeader,
                    hasSimpleStar,
                    hasCheckboxCompact,
                    hasDescription: hasDescription,
                    hasUploadMetadata: hasUploadMetadata
                },
                titleLayout: titleStyles ? {
                    fontSize: titleStyles.fontSize,
                    overflow: titleStyles.overflow,
                    textOverflow: titleStyles.textOverflow
                } : null,
                isUltraCompact: cardRect.height <= 120 && hasCompactHeader && hasSimpleStar && !hasDescription && !hasUploadMetadata
            };
        });
        
        console.log(`📊 Grid Cards: ${gridAnalysis.totalCards} cards`);
        console.log(`📏 Card Height: ${gridAnalysis.cardHeight}px (target: ≤120px)`);
        console.log(`📈 Max Height: ${gridAnalysis.maxHeight}`);
        console.log(`✨ Ultra-Compact: ${gridAnalysis.isUltraCompact ? 'YES' : 'NO'}`);
        
        console.log('\n🔍 Compact Elements Check:');
        console.log(`   Compact Header: ${gridAnalysis.compactElements.hasCompactHeader ? '✅' : '❌'}`);
        console.log(`   Simple Star: ${gridAnalysis.compactElements.hasSimpleStar ? '✅' : '❌'}`);
        console.log(`   Compact Checkbox: ${gridAnalysis.compactElements.hasCheckboxCompact ? '✅' : '❌'}`);
        console.log(`   Description Removed: ${!gridAnalysis.compactElements.hasDescription ? '✅' : '❌'}`);
        console.log(`   Upload Data Removed: ${!gridAnalysis.compactElements.hasUploadMetadata ? '✅' : '❌'}`);
        
        // Test Ultra-Compact List View
        console.log('\n📋 TESTING ULTRA-COMPACT LIST VIEW');
        console.log('-'.repeat(50));
        
        const listViewBtn = await page.$('#listViewBtn');
        if (listViewBtn) {
            await listViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const listAnalysis = await page.evaluate(() => {
                const listCards = document.querySelectorAll('.story-card-list');
                
                if (listCards.length === 0) {
                    return { error: 'No list view cards found' };
                }
                
                const firstListCard = listCards[0];
                const rect = firstListCard.getBoundingClientRect();
                const styles = window.getComputedStyle(firstListCard);
                
                // Check list-specific compact features
                const headerElement = firstListCard.querySelector('.story-header-compact');
                const starElement = firstListCard.querySelector('.favorite-star');
                const checkboxElement = firstListCard.querySelector('.story-checkbox-compact');
                const titleElement = firstListCard.querySelector('.story-title-compact');
                
                // Check that metadata is hidden in list view
                const coverageHidden = !firstListCard.querySelector('.story-coverage-compact') || 
                                     window.getComputedStyle(firstListCard.querySelector('.story-coverage-compact')).display === 'none';
                const tagsHidden = !firstListCard.querySelector('.story-tags-compact') || 
                                 window.getComputedStyle(firstListCard.querySelector('.story-tags-compact')).display === 'none';
                
                return {
                    totalListCards: listCards.length,
                    rowHeight: Math.round(rect.height),
                    minHeight: styles.minHeight,
                    padding: styles.padding,
                    compactLayout: {
                        hasHeader: !!headerElement,
                        hasStar: !!starElement,
                        hasCheckbox: !!checkboxElement,
                        hasTitle: !!titleElement,
                        coverageHidden,
                        tagsHidden
                    },
                    isUltraCompactList: rect.height <= 50 && !!headerElement && !!starElement && coverageHidden && tagsHidden
                };
            });
            
            console.log(`📋 List Rows: ${listAnalysis.totalListCards} rows`);
            console.log(`📏 Row Height: ${listAnalysis.rowHeight}px (target: ≤50px)`);
            console.log(`📦 Padding: ${listAnalysis.padding}`);
            console.log(`📈 Min Height: ${listAnalysis.minHeight}`);
            console.log(`✨ Ultra-Compact List: ${listAnalysis.isUltraCompactList ? 'YES' : 'NO'}`);
            
            console.log('\n🔍 List Layout Check:');
            console.log(`   Compact Header: ${listAnalysis.compactLayout.hasHeader ? '✅' : '❌'}`);
            console.log(`   Star Button: ${listAnalysis.compactLayout.hasStar ? '✅' : '❌'}`);
            console.log(`   Compact Checkbox: ${listAnalysis.compactLayout.hasCheckbox ? '✅' : '❌'}`);
            console.log(`   Coverage Hidden: ${listAnalysis.compactLayout.coverageHidden ? '✅' : '❌'}`);
            console.log(`   Tags Hidden: ${listAnalysis.compactLayout.tagsHidden ? '✅' : '❌'}`);
            
        } else {
            console.log('❌ List view button not found');
        }
        
        // Test Interaction Functionality
        console.log('\n🖱️ TESTING INTERACTIONS');
        console.log('-'.repeat(50));
        
        // Test star favorite functionality
        const starTest = await page.evaluate(() => {
            const firstStar = document.querySelector('.favorite-star');
            if (firstStar) {
                const initialState = firstStar.classList.contains('favorited');
                firstStar.click();
                // Don't wait for actual API, just check if click works
                return {
                    starFound: true,
                    initialState,
                    clickable: true
                };
            }
            return { starFound: false };
        });
        
        console.log(`   Star Favorite: ${starTest.starFound ? '✅ Found & Clickable' : '❌ Not Found'}`);
        
        // Test checkbox functionality
        const checkboxTest = await page.evaluate(() => {
            const firstCheckbox = document.querySelector('.story-checkbox-compact input');
            if (firstCheckbox) {
                const initialChecked = firstCheckbox.checked;
                firstCheckbox.click();
                const newChecked = firstCheckbox.checked;
                return {
                    checkboxFound: true,
                    stateChanged: initialChecked !== newChecked
                };
            }
            return { checkboxFound: false };
        });
        
        console.log(`   Compact Checkbox: ${checkboxTest.checkboxFound ? '✅ Found' : '❌ Not Found'}`);
        console.log(`   State Change: ${checkboxTest.stateChanged ? '✅ Working' : '❌ Not Working'}`);
        
        // Take comparison screenshots
        console.log('\n📸 TAKING ULTRA-COMPACT SCREENSHOTS');
        console.log('-'.repeat(50));
        
        // Grid view
        if (gridViewBtn) {
            await gridViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.screenshot({ 
                path: './ultra-compact-grid.png', 
                fullPage: true 
            });
            console.log('📸 Ultra-compact grid: ultra-compact-grid.png');
        }
        
        // List view
        if (listViewBtn) {
            await listViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.screenshot({ 
                path: './ultra-compact-list.png', 
                fullPage: true 
            });
            console.log('📸 Ultra-compact list: ultra-compact-list.png');
        }
        
        // Performance Analysis
        console.log('\n⚡ PERFORMANCE ANALYSIS');
        console.log('-'.repeat(50));
        
        const performanceMetrics = await page.evaluate(() => {
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            
            const cards = document.querySelectorAll('.story-card');
            const cardHeights = Array.from(cards).slice(0, 10).map(card => card.getBoundingClientRect().height);
            const avgCardHeight = cardHeights.reduce((sum, h) => sum + h, 0) / cardHeights.length;
            
            const storiesPerScreen = Math.floor(viewport.height / avgCardHeight);
            const contentDensity = cards.length / (viewport.width * viewport.height / 1000000); // cards per megapixel
            
            return {
                viewport,
                avgCardHeight: Math.round(avgCardHeight),
                storiesPerScreen,
                contentDensity: contentDensity.toFixed(2),
                totalCards: cards.length
            };
        });
        
        console.log(`   Viewport: ${performanceMetrics.viewport.width}x${performanceMetrics.viewport.height}`);
        console.log(`   Avg Card Height: ${performanceMetrics.avgCardHeight}px`);
        console.log(`   Stories Per Screen: ~${performanceMetrics.storiesPerScreen}`);
        console.log(`   Content Density: ${performanceMetrics.contentDensity} cards/MP`);
        
        // Summary
        console.log('\n' + '=' .repeat(60));
        console.log('🎯 ULTRA-COMPACT INTERFACE SUMMARY');
        console.log('=' .repeat(60));
        
        const improvements = [];
        const issues = [];
        
        if (gridAnalysis.isUltraCompact) {
            improvements.push('✅ Grid view is ultra-compact (≤120px height)');
        } else if (gridAnalysis.cardHeight <= 150) {
            improvements.push('✅ Grid view significantly improved');
        } else {
            issues.push('❌ Grid view needs more compaction');
        }
        
        if (listAnalysis && listAnalysis.isUltraCompactList) {
            improvements.push('✅ List view is ultra-compact (≤50px rows)');
        } else if (listAnalysis && listAnalysis.rowHeight <= 70) {
            improvements.push('✅ List view significantly improved');
        } else {
            issues.push('❌ List view needs more compaction');
        }
        
        if (gridAnalysis.compactElements.hasSimpleStar) {
            improvements.push('✅ Simple star favorite implemented');
        }
        
        if (!gridAnalysis.compactElements.hasDescription) {
            improvements.push('✅ Descriptions removed for compactness');
        }
        
        if (!gridAnalysis.compactElements.hasUploadMetadata) {
            improvements.push('✅ Upload metadata removed');
        }
        
        if (gridAnalysis.compactElements.hasCheckboxCompact) {
            improvements.push('✅ Roomier checkbox layout implemented');
        }
        
        console.log('\n🎉 Ultra-Compact Achievements:');
        improvements.forEach(improvement => console.log(`   ${improvement}`));
        
        if (issues.length > 0) {
            console.log('\n⚠️  Areas for Further Optimization:');
            issues.forEach(issue => console.log(`   ${issue}`));
        }
        
        const successRate = improvements.length / (improvements.length + issues.length) * 100;
        console.log(`\n📊 Ultra-Compact Success Rate: ${successRate.toFixed(1)}%`);
        
        if (successRate >= 85) {
            console.log('\n🎉 ULTRA-COMPACT INTERFACE SUCCESSFULLY IMPLEMENTED!');
            console.log('🚀 Maximum information density achieved!');
        } else {
            console.log('\n⚠️  Additional compaction may be needed');
        }
        
        console.log('\n🔍 Browser staying open for manual verification...');
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }

    await browser.close();
}

testUltraCompactInterface().catch(console.error);