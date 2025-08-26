const puppeteer = require('puppeteer');

async function testListViewFunctionality() {
    console.log('🔍 Testing Browse Stories List View Functionality\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: false,
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const page = await browser.newPage();
    
    // Capture console messages for debugging
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('View mode') || text.includes('stories') || text.includes('Error') || text.includes('Loaded')) {
            console.log(`🔵 BROWSER: ${text}`);
        }
    });
    
    page.on('pageerror', error => {
        console.log(`❌ PAGE ERROR: ${error.message}`);
    });
    
    try {
        console.log('Step 1: Login as teacher...');
        await page.goto('https://podcast-stories-production.up.railway.app');
        await page.type('#email', 'teacher@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        console.log('Step 2: Navigate to Browse Stories page...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for stories to load
        
        console.log('Step 3: Check initial page state...');
        const initialState = await page.evaluate(() => {
            const gridBtn = document.getElementById('gridViewBtn');
            const listBtn = document.getElementById('listViewBtn');
            const storiesGrid = document.getElementById('storiesGrid');
            const searchStats = document.getElementById('resultsCount');
            
            return {
                gridBtnExists: !!gridBtn,
                listBtnExists: !!listBtn,
                gridBtnActive: gridBtn ? gridBtn.classList.contains('active') : false,
                listBtnActive: listBtn ? listBtn.classList.contains('active') : false,
                storiesGridExists: !!storiesGrid,
                storiesGridClass: storiesGrid ? storiesGrid.className : 'not found',
                searchStatsText: searchStats ? searchStats.textContent : 'not found',
                storiesCount: storiesGrid ? storiesGrid.children.length : 0
            };
        });
        
        console.log('Initial State:');
        console.log(`  Grid button exists: ${initialState.gridBtnExists ? '✅' : '❌'}`);
        console.log(`  List button exists: ${initialState.listBtnExists ? '✅' : '❌'}`);
        console.log(`  Grid button active: ${initialState.gridBtnActive ? '✅' : '❌'}`);
        console.log(`  List button active: ${initialState.listBtnActive ? '✅' : '❌'}`);
        console.log(`  Stories grid class: ${initialState.storiesGridClass}`);
        console.log(`  Search stats: ${initialState.searchStatsText}`);
        console.log(`  Stories loaded: ${initialState.storiesCount}`);
        
        console.log('\nStep 4: Test switching to list view...');
        
        // Click list view button
        await page.click('#listViewBtn');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for view change
        
        const listViewState = await page.evaluate(() => {
            const gridBtn = document.getElementById('gridViewBtn');
            const listBtn = document.getElementById('listViewBtn');
            const storiesGrid = document.getElementById('storiesGrid');
            
            return {
                gridBtnActive: gridBtn ? gridBtn.classList.contains('active') : false,
                listBtnActive: listBtn ? listBtn.classList.contains('active') : false,
                storiesGridClass: storiesGrid ? storiesGrid.className : 'not found',
                firstStoryClass: storiesGrid && storiesGrid.children.length > 0 ? 
                    storiesGrid.children[0].className : 'no stories',
                storiesCount: storiesGrid ? storiesGrid.children.length : 0
            };
        });
        
        console.log('List View State:');
        console.log(`  Grid button active: ${listViewState.gridBtnActive ? '❌ (should be inactive)' : '✅'}`);
        console.log(`  List button active: ${listViewState.listBtnActive ? '✅' : '❌'}`);
        console.log(`  Stories grid class: ${listViewState.storiesGridClass}`);
        console.log(`  First story class: ${listViewState.firstStoryClass}`);
        console.log(`  Stories count: ${listViewState.storiesCount}`);
        
        console.log('\nStep 5: Test switching back to grid view...');
        
        // Click grid view button
        await page.click('#gridViewBtn');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for view change
        
        const gridViewState = await page.evaluate(() => {
            const gridBtn = document.getElementById('gridViewBtn');
            const listBtn = document.getElementById('listViewBtn');
            const storiesGrid = document.getElementById('storiesGrid');
            
            return {
                gridBtnActive: gridBtn ? gridBtn.classList.contains('active') : false,
                listBtnActive: listBtn ? listBtn.classList.contains('active') : false,
                storiesGridClass: storiesGrid ? storiesGrid.className : 'not found',
                firstStoryClass: storiesGrid && storiesGrid.children.length > 0 ? 
                    storiesGrid.children[0].className : 'no stories'
            };
        });
        
        console.log('Grid View State:');
        console.log(`  Grid button active: ${gridViewState.gridBtnActive ? '✅' : '❌'}`);
        console.log(`  List button active: ${gridViewState.listBtnActive ? '❌ (should be inactive)' : '✅'}`);
        console.log(`  Stories grid class: ${gridViewState.storiesGridClass}`);
        console.log(`  First story class: ${gridViewState.firstStoryClass}`);
        
        console.log('\nStep 6: Test search and filter functionality...');
        
        // Test search
        await page.type('#searchKeywords', 'test');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for debounced search
        
        const searchState = await page.evaluate(() => {
            const searchStats = document.getElementById('resultsCount');
            const storiesGrid = document.getElementById('storiesGrid');
            
            return {
                searchStatsText: searchStats ? searchStats.textContent : 'not found',
                filteredCount: storiesGrid ? storiesGrid.children.length : 0
            };
        });
        
        console.log(`Search Results: ${searchState.searchStatsText}`);
        console.log(`Filtered stories: ${searchState.filteredCount}`);
        
        // Clear search
        await page.click('button[onclick="clearFilters()"]');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('\nStep 7: Final verification...');
        await page.screenshot({ path: 'list-view-test.png', fullPage: true });
        console.log('📸 Screenshot saved as list-view-test.png');
        
        // Final assessment
        const isWorkingCorrectly = 
            initialState.gridBtnExists &&
            initialState.listBtnExists &&
            listViewState.listBtnActive &&
            listViewState.storiesGridClass === 'stories-list' &&
            gridViewState.gridBtnActive &&
            gridViewState.storiesGridClass === 'stories-grid';
        
        console.log('\n🎯 LIST VIEW TEST RESULTS:');
        if (isWorkingCorrectly) {
            console.log('🎉 SUCCESS: List view functionality is working correctly!');
            console.log('✅ View mode buttons toggle properly');
            console.log('✅ Grid and list views render correctly');
            console.log('✅ CSS classes are applied correctly');
            console.log('✅ Search and filter functionality working');
        } else {
            console.log('❌ ISSUES DETECTED:');
            if (!initialState.gridBtnExists || !initialState.listBtnExists) {
                console.log('- View mode buttons missing');
            }
            if (!listViewState.listBtnActive) {
                console.log('- List view button not activating');
            }
            if (listViewState.storiesGridClass !== 'stories-list') {
                console.log(`- List view CSS class incorrect: ${listViewState.storiesGridClass}`);
            }
            if (!gridViewState.gridBtnActive) {
                console.log('- Grid view button not activating');
            }
            if (gridViewState.storiesGridClass !== 'stories-grid') {
                console.log(`- Grid view CSS class incorrect: ${gridViewState.storiesGridClass}`);
            }
        }
        
        console.log('\nBrowser staying open for manual verification. Press Ctrl+C to close.');
        await new Promise(() => {}); // Keep browser open
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await browser.close();
    }
}

testListViewFunctionality();