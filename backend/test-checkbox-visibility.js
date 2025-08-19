/**
 * DEBUG: Checkbox visibility CSS investigation
 */

const puppeteer = require('puppeteer');

async function debugCheckboxVisibility() {
    console.log('🔍 DEBUGGING: Checkbox visibility CSS issues');
    console.log('='.repeat(50));
    
    let browser;
    let page;
    
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 200 });
        page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        
        // Navigate and login
        await page.goto('https://podcast-stories-production.up.railway.app/index.html', { 
            waitUntil: 'networkidle0' 
        });
        
        const emailInput = await page.$('input[type="email"]');
        const usernameInput = await page.$('input[type="text"]');
        
        if (emailInput) {
            await page.type('input[type="email"]', 'admin@vidpod.com');
        } else if (usernameInput) {
            await page.type('input[type="text"]', 'admin');
        }
        
        await page.type('input[type="password"]', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        // Navigate to stories
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { 
            waitUntil: 'networkidle0' 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Debug CSS properties of checkbox elements
        const cssDebug = await page.evaluate(() => {
            const firstCheckbox = document.querySelector('.story-checkbox');
            const firstSelection = document.querySelector('.story-selection');
            const firstContainer = document.querySelector('.story-selection .checkbox-container');
            const firstCard = document.querySelector('.story-card');
            
            function getComputedStyles(element, name) {
                if (!element) return { name, error: 'Element not found' };
                
                const styles = window.getComputedStyle(element);
                return {
                    name,
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: styles.opacity,
                    position: styles.position,
                    top: styles.top,
                    left: styles.left,
                    zIndex: styles.zIndex,
                    width: styles.width,
                    height: styles.height,
                    backgroundColor: styles.backgroundColor,
                    border: styles.border,
                    overflow: styles.overflow,
                    transform: styles.transform,
                    clipPath: styles.clipPath
                };
            }
            
            return {
                checkbox: getComputedStyles(firstCheckbox, 'story-checkbox'),
                selection: getComputedStyles(firstSelection, 'story-selection'),
                container: getComputedStyles(firstContainer, 'checkbox-container'),
                card: getComputedStyles(firstCard, 'story-card'),
                counts: {
                    checkboxes: document.querySelectorAll('.story-checkbox').length,
                    selections: document.querySelectorAll('.story-selection').length,
                    containers: document.querySelectorAll('.checkbox-container').length
                }
            };
        });
        
        console.log('📊 Element counts:', cssDebug.counts);
        console.log('\n🎨 CSS Debug Info:');
        console.log('Story Card styles:', JSON.stringify(cssDebug.card, null, 2));
        console.log('Story Selection styles:', JSON.stringify(cssDebug.selection, null, 2));
        console.log('Checkbox Container styles:', JSON.stringify(cssDebug.container, null, 2));
        console.log('Story Checkbox styles:', JSON.stringify(cssDebug.checkbox, null, 2));
        
        // Try to make checkboxes visible with custom CSS
        console.log('\n🛠️  Attempting to fix visibility with custom CSS...');
        
        await page.addStyleTag({
            content: `
                .story-selection {
                    position: absolute !important;
                    top: 10px !important;
                    left: 10px !important;
                    z-index: 1000 !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    background: red !important;
                    width: 30px !important;
                    height: 30px !important;
                }
                
                .story-selection .checkbox-container {
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    background: blue !important;
                    width: 24px !important;
                    height: 24px !important;
                }
                
                .story-selection .story-checkbox {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    width: 16px !important;
                    height: 16px !important;
                }
            `
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check visibility after custom CSS
        const afterFix = await page.evaluate(() => {
            const visibleSelections = Array.from(document.querySelectorAll('.story-selection')).filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
            });
            
            return {
                visibleAfterFix: visibleSelections.length,
                sampleRect: visibleSelections[0] ? visibleSelections[0].getBoundingClientRect() : null
            };
        });
        
        console.log('\n✨ After CSS fix:');
        console.log(`   Visible selections: ${afterFix.visibleAfterFix}`);
        console.log(`   Sample rect:`, afterFix.sampleRect);
        
        if (afterFix.visibleAfterFix > 0) {
            console.log('🎉 SUCCESS: Checkboxes are now visible with custom CSS!');
            
            // Try clicking a checkbox
            console.log('🖱️  Testing checkbox interaction...');
            try {
                await page.click('.story-selection .story-checkbox');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const interactionResult = await page.evaluate(() => {
                    const checkedBoxes = document.querySelectorAll('.story-checkbox:checked').length;
                    const bulkBar = document.getElementById('bulkActionsBar');
                    return {
                        checkedCount: checkedBoxes,
                        bulkVisible: bulkBar ? bulkBar.style.display !== 'none' : false
                    };
                });
                
                console.log('   Interaction result:', interactionResult);
                
                if (interactionResult.checkedCount > 0) {
                    console.log('🎯 FULL SUCCESS: Multi-select is now functional!');
                } else {
                    console.log('⚠️  Checkboxes visible but interaction may need work');
                }
            } catch (clickError) {
                console.log('❌ Click test failed:', clickError.message);
            }
            
        } else {
            console.log('❌ Still not visible - deeper CSS investigation needed');
        }
        
        // Keep browser open for inspection
        await new Promise(resolve => setTimeout(resolve, 5000));
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

debugCheckboxVisibility().catch(console.error);