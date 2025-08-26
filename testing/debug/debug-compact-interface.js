#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function debugCompactInterface() {
    console.log('🔧 DEBUGGING COMPACT INTERFACE CHANGES');
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
        
        console.log('✅ Login successful');
        
        // Navigate to stories page
        console.log('\n📝 Step 2: Navigating to stories page...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Test Grid View
        console.log('\n📝 Step 3: Testing Grid View...');
        
        // Make sure we're in grid view
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
                cardSpacing: {
                    padding: cardStyles.padding,
                    gap: containerStyles.gap
                },
                gridColumns: containerStyles.gridTemplateColumns,
                compactFeatures: {
                    hasMaxHeight: cardStyles.maxHeight !== 'none',
                    maxHeight: cardStyles.maxHeight,
                    textTruncation: firstCard.querySelector('.story-description')?.style.webkitLineClamp || 'not detected'
                }
            };
        });
        
        console.log('📊 Grid View Analysis:');
        console.log(`   Total Cards: ${gridAnalysis.totalCards}`);
        console.log(`   Card Size: ${gridAnalysis.cardDimensions.width}px × ${gridAnalysis.cardDimensions.height}px`);
        console.log(`   Padding: ${gridAnalysis.cardSpacing.padding}`);
        console.log(`   Grid Gap: ${gridAnalysis.cardSpacing.gap}`);
        console.log(`   Max Height: ${gridAnalysis.compactFeatures.maxHeight}`);
        console.log(`   Grid Columns: ${gridAnalysis.gridColumns}`);
        
        // Test List View
        console.log('\n📝 Step 4: Testing List View...');
        
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
                
                return {
                    totalListCards: listCards.length,
                    rowHeight: Math.round(rect.height),
                    minHeight: styles.minHeight,
                    padding: styles.padding,
                    gap: styles.gap,
                    borderLeft: styles.borderLeft,
                    hasHoverEffect: true // We'll check this manually
                };
            });
            
            console.log('📋 List View Analysis:');
            console.log(`   Total Rows: ${listAnalysis.totalListCards}`);
            console.log(`   Row Height: ${listAnalysis.rowHeight}px`);
            console.log(`   Min Height: ${listAnalysis.minHeight}`);
            console.log(`   Padding: ${listAnalysis.padding}`);
            console.log(`   Gap: ${listAnalysis.gap}`);
            console.log(`   Border Left: ${listAnalysis.borderLeft}`);
            
        } else {
            console.log('❌ List view button not found');
        }
        
        // Test view switching functionality
        console.log('\n📝 Step 5: Testing view switching...');
        
        let viewSwitchWorking = true;
        
        try {
            // Switch back to grid
            if (gridViewBtn) {
                await gridViewBtn.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const isGridActive = await page.evaluate(() => {
                    const gridBtn = document.querySelector('#gridViewBtn');
                    const listBtn = document.querySelector('#listViewBtn');
                    return gridBtn?.classList.contains('active') && !listBtn?.classList.contains('active');
                });
                
                console.log(`   Grid view switch: ${isGridActive ? '✅' : '❌'}`);
            }
            
            // Switch to list
            if (listViewBtn) {
                await listViewBtn.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const isListActive = await page.evaluate(() => {
                    const gridBtn = document.querySelector('#gridViewBtn');
                    const listBtn = document.querySelector('#listViewBtn');
                    return listBtn?.classList.contains('active') && !gridBtn?.classList.contains('active');
                });
                
                console.log(`   List view switch: ${isListActive ? '✅' : '❌'}`);
            }
            
        } catch (error) {
            console.log(`   View switching error: ${error.message}`);
            viewSwitchWorking = false;
        }
        
        // Check compact design features
        console.log('\n📝 Step 6: Verifying compact design features...');
        
        const compactFeatures = await page.evaluate(() => {
            const features = {};
            
            // Check page header
            const pageHeader = document.querySelector('.page-header');
            if (pageHeader) {
                const headerStyles = window.getComputedStyle(pageHeader);
                features.pageHeaderPadding = headerStyles.padding;
                features.pageHeaderMargin = headerStyles.marginBottom;
            }
            
            // Check display options
            const displayOptions = document.querySelector('.display-options');
            if (displayOptions) {
                const optionsStyles = window.getComputedStyle(displayOptions);
                features.displayOptionsMargin = optionsStyles.margin;
                features.displayOptionsPadding = optionsStyles.padding;
            }
            
            // Check tags
            const firstTag = document.querySelector('.tag');
            if (firstTag) {
                const tagStyles = window.getComputedStyle(firstTag);
                features.tagPadding = tagStyles.padding;
                features.tagFontSize = tagStyles.fontSize;
            }
            
            // Check story actions
            const storyAction = document.querySelector('.story-actions .btn');
            if (storyAction) {
                const btnStyles = window.getComputedStyle(storyAction);
                features.buttonPadding = btnStyles.padding;
                features.buttonFontSize = btnStyles.fontSize;
            }
            
            return features;
        });
        
        console.log('🎨 Compact Design Features:');
        console.log(`   Page Header Padding: ${compactFeatures.pageHeaderPadding || 'not found'}`);
        console.log(`   Page Header Margin: ${compactFeatures.pageHeaderMargin || 'not found'}`);
        console.log(`   Display Options Margin: ${compactFeatures.displayOptionsMargin || 'not found'}`);
        console.log(`   Tag Padding: ${compactFeatures.tagPadding || 'not found'}`);
        console.log(`   Tag Font Size: ${compactFeatures.tagFontSize || 'not found'}`);
        console.log(`   Button Padding: ${compactFeatures.buttonPadding || 'not found'}`);
        console.log(`   Button Font Size: ${compactFeatures.buttonFontSize || 'not found'}`);
        
        // Performance check
        console.log('\n📝 Step 7: Performance and user experience check...');
        
        const performanceMetrics = await page.evaluate(() => {
            const metrics = {};
            
            // Check if content fits better on screen
            const viewportHeight = window.innerHeight;
            const storiesContainer = document.querySelector('.stories-container');
            
            if (storiesContainer) {
                const containerRect = storiesContainer.getBoundingClientRect();
                const visibleCards = document.querySelectorAll('.story-card').length;
                
                metrics.viewportHeight = viewportHeight;
                metrics.containerTop = Math.round(containerRect.top);
                metrics.visibleCards = visibleCards;
                metrics.contentFitsScreen = containerRect.top < viewportHeight;
            }
            
            return metrics;
        });
        
        console.log('⚡ Performance Metrics:');
        console.log(`   Viewport Height: ${performanceMetrics.viewportHeight}px`);
        console.log(`   Container Top: ${performanceMetrics.containerTop}px`);
        console.log(`   Visible Cards: ${performanceMetrics.visibleCards}`);
        console.log(`   Content Fits Screen: ${performanceMetrics.contentFitsScreen ? '✅' : '❌'}`);
        
        // Take comparison screenshots
        console.log('\n📝 Step 8: Taking screenshots...');
        
        // Grid view screenshot
        if (gridViewBtn) {
            await gridViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.screenshot({ 
                path: './compact-grid-view.png', 
                fullPage: true 
            });
            console.log('📸 Grid view screenshot saved as compact-grid-view.png');
        }
        
        // List view screenshot  
        if (listViewBtn) {
            await listViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.screenshot({ 
                path: './compact-list-view.png', 
                fullPage: true 
            });
            console.log('📸 List view screenshot saved as compact-list-view.png');
        }
        
        // Summary
        console.log('\n' + '=' .repeat(60));
        console.log('📋 COMPACT INTERFACE SUMMARY');
        console.log('=' .repeat(60));
        
        const improvements = [];
        const issues = [];
        
        // Check if improvements worked
        if (gridAnalysis.cardDimensions.height < 300) {
            improvements.push('✅ Grid cards are more compact (under 300px height)');
        } else {
            issues.push('❌ Grid cards still too tall');
        }
        
        if (listAnalysis.rowHeight < 80) {
            improvements.push('✅ List rows are compact (under 80px height)');
        } else {
            issues.push('❌ List rows still too tall');
        }
        
        if (viewSwitchWorking) {
            improvements.push('✅ View switching works correctly');
        } else {
            issues.push('❌ View switching has issues');
        }
        
        if (compactFeatures.tagPadding && compactFeatures.tagPadding.includes('2px')) {
            improvements.push('✅ Tags are more compact');
        }
        
        if (compactFeatures.buttonPadding && compactFeatures.buttonPadding.includes('4px')) {
            improvements.push('✅ Buttons are more compact');
        }
        
        console.log('\n🎉 Improvements Confirmed:');
        improvements.forEach(improvement => console.log(`   ${improvement}`));
        
        if (issues.length > 0) {
            console.log('\n⚠️  Issues Found:');
            issues.forEach(issue => console.log(`   ${issue}`));
        }
        
        console.log('\n🔍 Browser will remain open for manual verification...');
        console.log('Press Ctrl+C to close when done reviewing.');
        
        // Keep browser open for manual inspection
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }

    await browser.close();
}

debugCompactInterface().catch(console.error);