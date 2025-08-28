/**
 * Debug Story Approval Filter
 * Tests the story approval filtering functionality in admin mode
 */

const puppeteer = require('puppeteer');

async function debugStoryApprovalFilter() {
    console.log('🔍 Debugging Story Approval Filter\n');
    console.log('='*50 + '\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            const type = msg.type();
            if (type === 'error' || type === 'warn' || msg.text().includes('🔍') || msg.text().includes('❌')) {
                console.log(`[BROWSER ${type.toUpperCase()}]: ${msg.text()}`);
            }
        });
        
        // Login as admin
        console.log('🔐 Logging in as admin...');
        await page.goto(`${baseUrl}/index.html`);
        await page.waitForSelector('#email', { timeout: 10000 });
        
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        
        await page.waitForNavigation({ timeout: 10000 });
        console.log('✅ Admin login successful');
        
        // Navigate to admin panel
        await page.goto(`${baseUrl}/admin.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Click on Story Approval tab
        console.log('📋 Navigating to Story Approval tab...');
        await page.evaluate(() => {
            if (typeof window.showTab === 'function') {
                window.showTab('stories');
            } else {
                const storyTab = document.querySelector('[data-tab="stories"]');
                if (storyTab) storyTab.click();
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('✅ Story Approval tab opened');
        
        // Check if the tab is visible and elements are present
        const tabInfo = await page.evaluate(() => {
            const storiesTab = document.getElementById('stories-tab');
            const filterSelect = document.getElementById('storyStatusFilter');
            const storiesTable = document.getElementById('storiesApprovalTable');
            
            return {
                tabVisible: storiesTab ? storiesTab.style.display !== 'none' : false,
                filterExists: !!filterSelect,
                tableExists: !!storiesTable,
                filterOptions: filterSelect ? Array.from(filterSelect.options).map(opt => ({ 
                    value: opt.value, 
                    text: opt.textContent 
                })) : [],
                currentFilterValue: filterSelect ? filterSelect.value : null
            };
        });
        
        console.log('🔍 Tab and elements status:');
        console.log(`   Stories tab visible: ${tabInfo.tabVisible ? '✅' : '❌'}`);
        console.log(`   Filter select exists: ${tabInfo.filterExists ? '✅' : '❌'}`);
        console.log(`   Stories table exists: ${tabInfo.tableExists ? '✅' : '❌'}`);
        console.log(`   Current filter value: "${tabInfo.currentFilterValue}"`);
        console.log('   Available filter options:');
        tabInfo.filterOptions.forEach(opt => {
            console.log(`      - "${opt.value}": ${opt.text}`);
        });
        
        // Test initial load - should load pending stories by default
        console.log('\n🧪 Testing initial load (pending stories)...');
        await page.evaluate(() => {
            if (typeof window.loadStoriesForApproval === 'function') {
                window.loadStoriesForApproval();
            } else {
                console.error('loadStoriesForApproval function not found');
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check what stories are loaded
        const initialStories = await page.evaluate(() => {
            const table = document.getElementById('storiesApprovalTable');
            if (!table) return { error: 'Table not found' };
            
            const rows = Array.from(table.querySelectorAll('tr'));
            return {
                rowCount: rows.length,
                hasNoDataMessage: table.textContent.includes('No stories') || table.textContent.includes('no stories'),
                sampleRows: rows.slice(0, 3).map((row, index) => {
                    const cells = row.querySelectorAll('td');
                    return {
                        index,
                        cellCount: cells.length,
                        title: cells[2]?.textContent?.trim() || '',
                        status: cells[4]?.textContent?.trim() || ''
                    };
                })
            };
        });
        
        console.log(`   Stories loaded: ${initialStories.rowCount} rows`);
        console.log(`   Has "no data" message: ${initialStories.hasNoDataMessage ? '✅' : '❌'}`);
        if (initialStories.sampleRows.length > 0) {
            console.log('   Sample stories:');
            initialStories.sampleRows.forEach(row => {
                console.log(`      Row ${row.index}: "${row.title}" (${row.status})`);
            });
        }
        
        // Test filter changes
        console.log('\n🧪 Testing filter changes...');
        const filterTests = ['approved', 'rejected', 'draft', ''];
        
        for (const filterValue of filterTests) {
            console.log(`\n   Testing filter: "${filterValue}" (${filterValue === '' ? 'All Stories' : filterValue})`);
            
            // Set filter value
            await page.select('#storyStatusFilter', filterValue);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Click filter button
            await page.click('button[onclick*="loadStoriesForApproval"]');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check results
            const filterResults = await page.evaluate(() => {
                const table = document.getElementById('storiesApprovalTable');
                if (!table) return { error: 'Table not found' };
                
                const rows = Array.from(table.querySelectorAll('tr'));
                const hasNoDataMessage = table.textContent.includes('No stories') || table.textContent.includes('no stories');
                
                return {
                    rowCount: rows.length,
                    hasNoDataMessage,
                    statuses: rows.map(row => {
                        const statusCell = row.querySelectorAll('td')[4];
                        return statusCell ? statusCell.textContent.trim() : '';
                    }).filter(s => s !== '')
                };
            });
            
            console.log(`      Results: ${filterResults.rowCount} rows`);
            console.log(`      No data message: ${filterResults.hasNoDataMessage ? '✅' : '❌'}`);
            if (filterResults.statuses.length > 0) {
                const uniqueStatuses = [...new Set(filterResults.statuses)];
                console.log(`      Statuses found: ${uniqueStatuses.join(', ')}`);
            }
        }
        
        // Test API directly
        console.log('\n🧪 Testing API endpoints directly...');
        const apiTests = [
            { endpoint: '/api/stories/admin/by-status/pending', expectedStatus: 'pending' },
            { endpoint: '/api/stories/admin/by-status/approved', expectedStatus: 'approved' },
            { endpoint: '/api/stories', expectedStatus: 'all' }
        ];
        
        for (const apiTest of apiTests) {
            const result = await page.evaluate(async (test) => {
                const token = localStorage.getItem('token');
                if (!token) return { error: 'No auth token found' };
                
                try {
                    const response = await fetch(test.endpoint, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    const data = response.ok ? await response.json() : await response.text();
                    
                    return {
                        status: response.status,
                        ok: response.ok,
                        dataType: typeof data,
                        count: Array.isArray(data) ? data.length : 'Not array',
                        sampleStatuses: Array.isArray(data) && data.length > 0 ? 
                            [...new Set(data.slice(0, 5).map(story => story.approval_status))].join(', ') : 'No data'
                    };
                } catch (error) {
                    return { error: error.message };
                }
            }, apiTest);
            
            console.log(`   ${apiTest.endpoint}:`);
            console.log(`      Status: ${result.status || 'Error'}`);
            console.log(`      Success: ${result.ok ? '✅' : '❌'}`);
            console.log(`      Count: ${result.count}`);
            console.log(`      Sample statuses: ${result.sampleStatuses || result.error}`);
        }
        
        console.log('\n🏁 Debug completed - keeping browser open for inspection');
        console.log('Press Ctrl+C when done');
        
        // Keep browser open
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    } finally {
        // Don't close automatically
    }
}

// Handle cleanup on Ctrl+C
process.on('SIGINT', async () => {
    console.log('\n👋 Closing...');
    process.exit();
});

debugStoryApprovalFilter().catch(console.error);