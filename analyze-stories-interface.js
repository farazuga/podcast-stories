#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function analyzeStoriesInterface() {
    console.log('🔍 ANALYZING BROWSE STORIES INTERFACE');
    console.log('=' .repeat(50));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    try {
        // Login first
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
        
        // Look for stories on dashboard
        const storiesOnDashboard = await page.$$('.story-card');
        console.log(`📊 Found ${storiesOnDashboard.length} story cards on dashboard`);
        
        // Check for view toggle buttons
        const viewToggleButtons = await page.$$('[data-view]');
        console.log(`🔘 Found ${viewToggleButtons.length} view toggle buttons`);
        
        // Check for list/grid view classes
        const currentViewClass = await page.evaluate(() => {
            const container = document.querySelector('.stories-grid, .stories-list, .stories-container');
            return container ? container.className : 'No stories container found';
        });
        console.log(`📋 Current view class: ${currentViewClass}`);
        
        // Analyze story card structure
        console.log('\n📝 Step 3: Analyzing story card structure...');
        
        if (storiesOnDashboard.length > 0) {
            const cardAnalysis = await page.evaluate(() => {
                const firstCard = document.querySelector('.story-card');
                if (!firstCard) return 'No story card found';
                
                const rect = firstCard.getBoundingClientRect();
                const styles = window.getComputedStyle(firstCard);
                
                return {
                    dimensions: {
                        width: rect.width,
                        height: rect.height
                    },
                    spacing: {
                        margin: styles.margin,
                        padding: styles.padding
                    },
                    content: {
                        title: firstCard.querySelector('.story-title, h3, h2')?.textContent?.substring(0, 50) || 'No title found',
                        description: firstCard.querySelector('.story-description, p')?.textContent?.substring(0, 100) || 'No description found',
                        hasImage: !!firstCard.querySelector('img'),
                        hasActions: !!firstCard.querySelector('.story-actions, .btn'),
                        hasTags: !!firstCard.querySelector('.tag, .story-tags'),
                        hasMeta: !!firstCard.querySelector('.story-meta, .story-date, .story-author')
                    }
                };
            });
            
            console.log('📊 Story Card Analysis:');
            console.log(`   Dimensions: ${cardAnalysis.dimensions.width}px × ${cardAnalysis.dimensions.height}px`);
            console.log(`   Margin: ${cardAnalysis.spacing.margin}`);
            console.log(`   Padding: ${cardAnalysis.spacing.padding}`);
            console.log(`   Title: ${cardAnalysis.content.title}`);
            console.log(`   Description: ${cardAnalysis.content.description}`);
            console.log(`   Has Image: ${cardAnalysis.content.hasImage}`);
            console.log(`   Has Actions: ${cardAnalysis.content.hasActions}`);
            console.log(`   Has Tags: ${cardAnalysis.content.hasTags}`);
            console.log(`   Has Meta: ${cardAnalysis.content.hasMeta}`);
        }
        
        // Check for view switching functionality
        console.log('\n📝 Step 4: Testing view switching...');
        
        const listViewBtn = await page.$('[data-view="list"], .btn-list, .view-list');
        const gridViewBtn = await page.$('[data-view="grid"], .btn-grid, .view-grid');
        
        if (listViewBtn && gridViewBtn) {
            console.log('✅ Found list and grid view buttons');
            
            // Test list view
            await listViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const listViewAnalysis = await page.evaluate(() => {
                const container = document.querySelector('.stories-container, .stories-grid, .stories-list');
                const cards = document.querySelectorAll('.story-card');
                
                if (!container || cards.length === 0) return 'No content in list view';
                
                const containerStyles = window.getComputedStyle(container);
                const firstCard = cards[0];
                const cardRect = firstCard.getBoundingClientRect();
                
                return {
                    containerDisplay: containerStyles.display,
                    containerFlexDirection: containerStyles.flexDirection,
                    cardWidth: cardRect.width,
                    cardHeight: cardRect.height,
                    cardsPerRow: Math.floor(container.getBoundingClientRect().width / cardRect.width)
                };
            });
            
            console.log('📋 List View Analysis:', listViewAnalysis);
            
            // Test grid view
            await gridViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const gridViewAnalysis = await page.evaluate(() => {
                const container = document.querySelector('.stories-container, .stories-grid, .stories-list');
                const cards = document.querySelectorAll('.story-card');
                
                if (!container || cards.length === 0) return 'No content in grid view';
                
                const containerStyles = window.getComputedStyle(container);
                const firstCard = cards[0];
                const cardRect = firstCard.getBoundingClientRect();
                
                return {
                    containerDisplay: containerStyles.display,
                    gridTemplateColumns: containerStyles.gridTemplateColumns,
                    cardWidth: cardRect.width,
                    cardHeight: cardRect.height,
                    gap: containerStyles.gap
                };
            });
            
            console.log('📊 Grid View Analysis:', gridViewAnalysis);
            
        } else {
            console.log('❌ View toggle buttons not found');
        }
        
        // Analyze current spacing and layout issues
        console.log('\n📝 Step 5: Identifying spacing and layout issues...');
        
        const layoutIssues = await page.evaluate(() => {
            const issues = [];
            
            // Check for excessive whitespace
            const cards = document.querySelectorAll('.story-card');
            if (cards.length > 0) {
                const firstCard = cards[0];
                const styles = window.getComputedStyle(firstCard);
                
                // Check padding
                const padding = parseInt(styles.padding) || 0;
                if (padding > 20) {
                    issues.push(`Excessive padding: ${padding}px (recommend 12-16px)`);
                }
                
                // Check margin
                const margin = parseInt(styles.margin) || 0;
                if (margin > 15) {
                    issues.push(`Excessive margin: ${margin}px (recommend 8-12px)`);
                }
                
                // Check height
                const height = firstCard.getBoundingClientRect().height;
                if (height > 400) {
                    issues.push(`Cards too tall: ${height}px (recommend 200-300px)`);
                }
            }
            
            // Check container spacing
            const container = document.querySelector('.stories-container, .stories-grid');
            if (container) {
                const containerStyles = window.getComputedStyle(container);
                const gap = parseInt(containerStyles.gap) || 0;
                if (gap > 20) {
                    issues.push(`Excessive grid gap: ${gap}px (recommend 12-16px)`);
                }
            }
            
            return issues;
        });
        
        console.log('⚠️  Layout Issues Identified:');
        layoutIssues.forEach(issue => {
            console.log(`   - ${issue}`);
        });
        
        // Check for unnecessary elements that could be cleaned up
        console.log('\n📝 Step 6: Checking for interface cleanup opportunities...');
        
        const cleanupOpportunities = await page.evaluate(() => {
            const opportunities = [];
            
            // Check for empty elements
            const emptyElements = document.querySelectorAll('div:empty, span:empty, p:empty');
            if (emptyElements.length > 0) {
                opportunities.push(`${emptyElements.length} empty elements found`);
            }
            
            // Check for redundant wrappers
            const cards = document.querySelectorAll('.story-card');
            if (cards.length > 0) {
                const firstCard = cards[0];
                const nestedDivs = firstCard.querySelectorAll('div div div');
                if (nestedDivs.length > 3) {
                    opportunities.push(`Excessive nesting: ${nestedDivs.length} levels of divs`);
                }
            }
            
            // Check for inline styles
            const elementsWithInlineStyles = document.querySelectorAll('[style]');
            if (elementsWithInlineStyles.length > 5) {
                opportunities.push(`${elementsWithInlineStyles.length} elements with inline styles (should use CSS classes)`);
            }
            
            return opportunities;
        });
        
        console.log('🧹 Cleanup Opportunities:');
        cleanupOpportunities.forEach(opportunity => {
            console.log(`   - ${opportunity}`);
        });
        
        // Take a screenshot for reference
        await page.screenshot({ 
            path: './current-stories-interface.png', 
            fullPage: true 
        });
        console.log('📸 Screenshot saved as current-stories-interface.png');
        
        // Summary and Recommendations
        console.log('\n' + '=' .repeat(50));
        console.log('📋 ANALYSIS SUMMARY & RECOMMENDATIONS');
        console.log('=' .repeat(50));
        
        console.log('\n🎯 Recommendations for Compact & Clean Interface:');
        console.log('1. Reduce card padding from current to 12px');
        console.log('2. Decrease grid gap to 12px');
        console.log('3. Optimize card height to 200-250px max');
        console.log('4. Simplify card content hierarchy');
        console.log('5. Clean up excessive nesting');
        console.log('6. Improve list view to be more table-like');
        console.log('7. Add better visual separation without bulk');
        
        console.log('\n🔍 Browser will remain open for manual inspection...');
        console.log('Press Ctrl+C to close when ready to implement changes.');
        
        // Keep browser open for manual inspection
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Analysis error:', error.message);
    }

    await browser.close();
}

analyzeStoriesInterface().catch(console.error);