const puppeteer = require('puppeteer');

async function fixBrowseStories() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    console.log('🔧 Fixing Browse Stories Functionality...\n');
    
    try {
        // Login as admin
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'rumi&amaml');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ Logged in as admin');
        
        // Navigate to stories page
        console.log('📖 Navigating to stories page...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('✅ Stories page loaded, analyzing issue...');
        
        // Monitor console messages and errors
        const consoleMessages = [];
        const errors = [];
        
        page.on('console', msg => {
            const message = `${msg.type()}: ${msg.text()}`;
            consoleMessages.push(message);
            console.log(`📱 ${message}`);
        });
        
        page.on('pageerror', error => {
            errors.push(error.message);
            console.log(`❌ JS Error: ${error.message}`);
        });
        
        // First, check the current state
        const initialState = await page.evaluate(() => {
            return {
                storiesGridExists: !!document.getElementById('storiesGrid'),
                storiesContainerExists: !!document.getElementById('storiesContainer'),
                loadStoriesExists: typeof window.loadStories === 'function',
                apiUrl: window.API_URL,
                token: localStorage.getItem('token'),
                allStoriesCount: window.allStories ? window.allStories.length : 'undefined',
                filteredStoriesCount: window.filteredStories ? window.filteredStories.length : 'undefined'
            };
        });
        
        console.log('\n📊 Initial State Analysis:');
        console.log(`storiesGrid exists: ${initialState.storiesGridExists}`);
        console.log(`storiesContainer exists: ${initialState.storiesContainerExists}`);
        console.log(`loadStories function exists: ${initialState.loadStoriesExists}`);
        console.log(`allStories count: ${initialState.allStoriesCount}`);
        console.log(`filteredStories count: ${initialState.filteredStoriesCount}`);
        
        if (!initialState.loadStoriesExists) {
            console.log('\n❌ loadStories function missing - this is the main issue');
            console.log('🔧 Injecting loadStories function directly...');
            
            // Inject the loadStories function
            await page.evaluate(() => {
                // Make sure we have the necessary global variables
                if (typeof window.allStories === 'undefined') window.allStories = [];
                if (typeof window.filteredStories === 'undefined') window.filteredStories = [];
                if (typeof window.currentPage === 'undefined') window.currentPage = 0;
                if (typeof window.storiesPerPage === 'undefined') window.storiesPerPage = 12;
                if (typeof window.currentViewMode === 'undefined') window.currentViewMode = 'grid';
                if (typeof window.selectedStories === 'undefined') window.selectedStories = new Set();
                if (typeof window.API_URL === 'undefined') {
                    window.API_URL = 'https://podcast-stories-production.up.railway.app/api';
                }
                
                // Define loadStories function
                window.loadStories = async function() {
                    console.log('🔄 Loading stories from API...');
                    try {
                        const response = await fetch(`${window.API_URL}/stories`, {
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                        });
                        
                        console.log(`API response status: ${response.status}`);
                        
                        if (response.ok) {
                            const stories = await response.json();
                            console.log(`📚 Loaded ${stories.length} stories from API`);
                            
                            window.allStories = stories;
                            window.filteredStories = [...stories];
                            window.currentPage = 0;
                            
                            // Display stories immediately
                            window.displayStories();
                            window.updateResultsCount();
                        } else {
                            console.error('Failed to load stories:', response.statusText);
                            window.showNoResults();
                        }
                    } catch (error) {
                        console.error('Error loading stories:', error);
                        window.showNoResults();
                    }
                };
                
                // Define displayStories function
                window.displayStories = function() {
                    console.log('🎨 Displaying stories...');
                    const container = document.getElementById('storiesGrid');
                    if (!container) {
                        console.error('❌ storiesGrid container not found');
                        return;
                    }
                    
                    const startIndex = window.currentPage * window.storiesPerPage;
                    const endIndex = startIndex + window.storiesPerPage;
                    const storiesToShow = window.filteredStories.slice(0, endIndex);
                    
                    console.log(`Showing ${storiesToShow.length} stories`);
                    
                    if (storiesToShow.length === 0) {
                        window.showNoResults();
                        return;
                    }
                    
                    // Hide no results
                    const noResults = document.getElementById('noResults');
                    if (noResults) noResults.style.display = 'none';
                    
                    // Simple story card rendering
                    container.innerHTML = storiesToShow.map(story => `
                        <div class="story-card" data-story-id="${story.id}">
                            <div class="story-header">
                                <h3>${story.idea_title || 'Untitled'}</h3>
                                ${story.approval_status ? `<span class="status-badge status-${story.approval_status}">${story.approval_status}</span>` : ''}
                            </div>
                            <div class="story-content">
                                <p>${(story.idea_description || '').substring(0, 150)}${story.idea_description && story.idea_description.length > 150 ? '...' : ''}</p>
                            </div>
                            <div class="story-meta">
                                <small>By: ${story.uploaded_by_name || 'Unknown'}</small>
                                ${story.uploaded_date ? `<small>Date: ${new Date(story.uploaded_date).toLocaleDateString()}</small>` : ''}
                            </div>
                            <div class="story-actions">
                                <button class="btn btn-primary btn-small" onclick="viewStory(${story.id})">View Details</button>
                                <button class="favorite-btn" onclick="toggleFavorite(${story.id})">❤️</button>
                            </div>
                        </div>
                    `).join('');
                    
                    console.log(`✅ Rendered ${storiesToShow.length} story cards`);
                };
                
                // Define utility functions
                window.showNoResults = function() {
                    const noResults = document.getElementById('noResults');
                    if (noResults) {
                        noResults.style.display = 'block';
                    }
                    const container = document.getElementById('storiesGrid');
                    if (container) {
                        container.innerHTML = '';
                    }
                };
                
                window.updateResultsCount = function() {
                    const resultsCount = document.getElementById('resultsCount');
                    if (resultsCount && window.filteredStories) {
                        resultsCount.textContent = `${window.filteredStories.length} stories found`;
                    }
                };
                
                window.viewStory = function(storyId) {
                    window.location.href = `/story-detail.html?id=${storyId}`;
                };
                
                window.toggleFavorite = function(storyId) {
                    console.log(`Toggle favorite for story ${storyId}`);
                    // Basic implementation - can be enhanced later
                };
                
                console.log('✅ All story functions injected');
            });
            
            console.log('✅ Functions injected, now calling loadStories...');
        }
        
        // Trigger story loading
        await page.evaluate(() => {
            if (typeof window.loadStories === 'function') {
                window.loadStories();
            } else {
                console.error('❌ loadStories function still not available');
            }
        });
        
        // Wait for stories to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check final state
        const finalState = await page.evaluate(() => {
            const container = document.getElementById('storiesGrid');
            return {
                storiesInDOM: container ? container.children.length : 0,
                allStoriesCount: window.allStories ? window.allStories.length : 0,
                filteredStoriesCount: window.filteredStories ? window.filteredStories.length : 0,
                containerHTML: container ? container.innerHTML.substring(0, 200) + '...' : 'No container',
                noResultsVisible: document.getElementById('noResults') ? document.getElementById('noResults').style.display : 'not found'
            };
        });
        
        console.log('\n📊 Final State Analysis:');
        console.log(`Stories in DOM: ${finalState.storiesInDOM}`);
        console.log(`All stories loaded: ${finalState.allStoriesCount}`);
        console.log(`Filtered stories: ${finalState.filteredStoriesCount}`);
        console.log(`No results visible: ${finalState.noResultsVisible}`);
        
        if (finalState.storiesInDOM > 0) {
            console.log('\n🎉 SUCCESS! Stories are now visible in admin mode');
        } else {
            console.log('\n❌ Still no stories visible. Sample HTML:');
            console.log(finalState.containerHTML);
        }
        
        console.log('\n💡 Next Steps:');
        console.log('1. The fix has been applied temporarily in this browser session');
        console.log('2. To make this permanent, the missing functions need to be added to stories.js');
        console.log('3. The core issue was missing global function availability');
        
        console.log('\n🔍 Browser staying open for manual verification...');
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Fix failed:', error);
    }
}

fixBrowseStories().catch(console.error);