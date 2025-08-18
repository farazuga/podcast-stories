const puppeteer = require('puppeteer');

async function debugStoryApproval() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    console.log('🔍 Debugging Story Approval Interface...\n');
    
    try {
        // Login and navigate to admin panel
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'rumi&amaml');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ Logged in to admin panel');
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Navigate to stories tab
        await page.evaluate(() => window.showTab('stories'));
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('📋 Analyzing stories tab content...\n');
        
        // Comprehensive check of stories tab content
        const storyTabAnalysis = await page.evaluate(() => {
            const analysis = {
                tabVisible: false,
                elementsFound: [],
                allElements: [],
                storiesData: null,
                apiCalls: [],
                functionTests: {}
            };
            
            // Check if stories tab is visible
            const storiesTab = document.getElementById('stories-tab') || document.getElementById('storiesTab');
            if (storiesTab) {
                analysis.tabVisible = storiesTab.style.display !== 'none';
                
                // Get all elements in stories tab
                const allElements = storiesTab.querySelectorAll('*');
                allElements.forEach(el => {
                    if (el.id || el.className) {
                        analysis.allElements.push({
                            tag: el.tagName,
                            id: el.id,
                            className: el.className,
                            textContent: el.textContent ? el.textContent.substring(0, 50) + '...' : ''
                        });
                    }
                });
                
                // Look for specific elements
                const elementsToFind = [
                    '#storiesTable',
                    '#storiesForApprovalTable', 
                    '.stories-table',
                    '#storyStatusFilter',
                    '#storyApprovalModal',
                    '[onclick*="showStoryApprovalModal"]',
                    '.story-approval-table',
                    'table'
                ];
                
                elementsToFind.forEach(selector => {
                    const element = storiesTab.querySelector(selector);
                    if (element) {
                        analysis.elementsFound.push({
                            selector,
                            found: true,
                            tag: element.tagName,
                            id: element.id,
                            className: element.className
                        });
                    } else {
                        analysis.elementsFound.push({
                            selector,
                            found: false
                        });
                    }
                });
            }
            
            // Test story-related functions
            const functionsToTest = [
                'loadStoriesForApproval',
                'showStoryApprovalModal',
                'showStoryRejectionModal'
            ];
            
            functionsToTest.forEach(func => {
                analysis.functionTests[func] = typeof window[func] === 'function';
            });
            
            return analysis;
        });
        
        console.log('📊 Story Tab Analysis Results:');
        console.log(`Stories tab visible: ${storyTabAnalysis.tabVisible}`);
        console.log(`\n🔍 Element Search Results:`);
        
        storyTabAnalysis.elementsFound.forEach(result => {
            if (result.found) {
                console.log(`✅ ${result.selector}: Found (${result.tag}${result.id ? '#' + result.id : ''})`);
            } else {
                console.log(`❌ ${result.selector}: Not found`);
            }
        });
        
        console.log(`\n🔧 Function Availability:`);
        Object.entries(storyTabAnalysis.functionTests).forEach(([func, available]) => {
            console.log(`${available ? '✅' : '❌'} ${func}: ${available ? 'Available' : 'Missing'}`);
        });
        
        // Check if loadStoriesForApproval function exists and try to call it
        if (storyTabAnalysis.functionTests.loadStoriesForApproval) {
            console.log(`\n🔄 Testing loadStoriesForApproval function...`);
            
            try {
                await page.evaluate(() => {
                    if (typeof window.loadStoriesForApproval === 'function') {
                        window.loadStoriesForApproval('pending');
                    }
                });
                
                // Wait for potential data loading
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Check again for table after function call
                const afterFunctionCall = await page.evaluate(() => {
                    const storiesTab = document.getElementById('stories-tab') || document.getElementById('storiesTab');
                    if (storiesTab) {
                        const table = storiesTab.querySelector('table, #storiesTable, #storiesForApprovalTable');
                        const tableRows = table ? table.querySelectorAll('tr').length : 0;
                        return {
                            tableFound: !!table,
                            rowCount: tableRows,
                            tableHTML: table ? table.outerHTML.substring(0, 200) + '...' : 'No table'
                        };
                    }
                    return { tableFound: false, rowCount: 0, tableHTML: 'Tab not found' };
                });
                
                console.log(`✅ Function called successfully`);
                console.log(`Table found after function call: ${afterFunctionCall.tableFound}`);
                console.log(`Rows in table: ${afterFunctionCall.rowCount}`);
                
            } catch (error) {
                console.log(`❌ Function call failed: ${error.message}`);
            }
        }
        
        // Check all elements in stories tab for debugging
        console.log(`\n📋 All Elements in Stories Tab (${storyTabAnalysis.allElements.length} total):`);
        storyTabAnalysis.allElements.slice(0, 20).forEach(el => {
            console.log(`  ${el.tag}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ')[0] : ''}`);
        });
        
        if (storyTabAnalysis.allElements.length > 20) {
            console.log(`  ... and ${storyTabAnalysis.allElements.length - 20} more elements`);
        }
        
        // Final recommendation
        console.log(`\n💡 Recommendations:`);
        
        if (!storyTabAnalysis.tabVisible) {
            console.log(`❌ Stories tab not visible - check tab switching logic`);
        } else if (storyTabAnalysis.elementsFound.filter(e => e.found && e.selector.includes('table')).length === 0) {
            console.log(`⚠️  No tables found in stories tab - may need to:`);
            console.log(`   1. Check if data loading functions are being called`);
            console.log(`   2. Verify API endpoints for story approval are working`);
            console.log(`   3. Ensure table HTML is being generated correctly`);
        } else {
            console.log(`✅ Story approval interface elements found`);
        }
        
        console.log(`\n🔍 Browser staying open for manual inspection...`);
        
        // Keep browser open for manual inspection
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

debugStoryApproval().catch(console.error);