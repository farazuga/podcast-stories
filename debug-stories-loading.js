#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * DEBUG STORIES LOADING CRISIS (BUG #5)
 * Deep investigation into why 0 stories are displayed
 */

async function debugStoriesLoading() {
    console.log('🔍 DEBUGGING STORIES LOADING CRISIS (BUG #5)');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    
    // Track all network requests
    const apiRequests = [];
    const apiResponses = [];
    
    page.on('request', request => {
        if (request.url().includes('/api/')) {
            apiRequests.push({
                url: request.url(),
                method: request.method(),
                headers: request.headers()
            });
        }
    });
    
    page.on('response', response => {
        if (response.url().includes('/api/')) {
            apiResponses.push({
                url: response.url(),
                status: response.status(),
                ok: response.ok()
            });
        }
    });
    
    let consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    try {
        console.log('\n🔐 STEP 1: Login and navigate to stories');
        console.log('-'.repeat(40));
        
        // Clear and login
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        
        await page.waitForSelector('#email', { timeout: 10000 });
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('   Login completed');
        
        // Navigate to stories
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 8000)); // Wait for everything to load
        
        console.log('\n📡 STEP 2: API Request Analysis');
        console.log('-'.repeat(40));
        
        console.log(`   API Requests Made: ${apiRequests.length}`);
        apiRequests.forEach((req, index) => {
            console.log(`   ${index + 1}. ${req.method} ${req.url.split('/api/')[1]}`);
            console.log(`      Auth Header: ${req.headers.authorization ? '✅' : '❌'}`);
        });
        
        console.log(`\n   API Responses: ${apiResponses.length}`);
        apiResponses.forEach((res, index) => {
            console.log(`   ${index + 1}. ${res.url.split('/api/')[1]} - Status: ${res.status} ${res.ok ? '✅' : '❌'}`);
        });
        
        console.log('\n🔍 STEP 3: Deep Frontend Investigation');
        console.log('-'.repeat(40));
        
        const frontendAnalysis = await page.evaluate(() => {
            // Check if stories.js loaded properly
            const storiesJsLoaded = typeof window.loadStories === 'function';
            const allStoriesLoaded = typeof window.allStories !== 'undefined';
            
            // Check DOM elements
            const storiesGrid = document.getElementById('storiesGrid');
            const storiesContainer = document.querySelector('.stories-container');
            const noResults = document.getElementById('noResults');
            
            // Check global variables
            const globalVars = {
                allStories: window.allStories ? window.allStories.length : 'undefined',
                filteredStories: window.filteredStories ? window.filteredStories.length : 'undefined',
                currentUser: window.currentUser ? 'defined' : 'undefined',
                API_URL: window.API_URL || 'undefined'
            };
            
            return {
                storiesJsLoaded,
                allStoriesLoaded,
                domElements: {
                    storiesGrid: !!storiesGrid,
                    storiesGridContent: storiesGrid ? storiesGrid.innerHTML.length : 0,
                    storiesContainer: !!storiesContainer,
                    noResults: !!noResults,
                    noResultsVisible: noResults ? noResults.style.display !== 'none' : false
                },
                globalVars,
                storyCardsFound: document.querySelectorAll('.story-card').length,
                currentPageState: document.readyState
            };
        });
        
        console.log('   Stories.js Functions:');
        console.log(`     loadStories function: ${frontendAnalysis.storiesJsLoaded ? '✅' : '❌'}`);
        console.log(`     allStories variable: ${frontendAnalysis.allStoriesLoaded ? '✅' : '❌'}`);
        
        console.log('\n   DOM Elements:');
        console.log(`     storiesGrid exists: ${frontendAnalysis.domElements.storiesGrid ? '✅' : '❌'}`);
        console.log(`     storiesGrid content: ${frontendAnalysis.domElements.storiesGridContent} chars`);
        console.log(`     stories container: ${frontendAnalysis.domElements.storiesContainer ? '✅' : '❌'}`);
        console.log(`     no results element: ${frontendAnalysis.domElements.noResults ? '✅' : '❌'}`);
        console.log(`     no results visible: ${frontendAnalysis.domElements.noResultsVisible ? '⚠️ YES' : '✅ NO'}`);
        
        console.log('\n   Global Variables:');
        Object.entries(frontendAnalysis.globalVars).forEach(([key, value]) => {
            console.log(`     ${key}: ${value}`);
        });
        
        console.log(`\n   Story Cards Found: ${frontendAnalysis.storyCardsFound}`);
        
        console.log('\n🧪 STEP 4: Manual API Test');
        console.log('-'.repeat(40));
        
        const manualApiTest = await page.evaluate(async () => {
            const token = localStorage.getItem('token');
            if (!token) return { error: 'No token found' };
            
            try {
                const response = await fetch('https://podcast-stories-production.up.railway.app/api/stories', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const data = await response.json();
                
                return {
                    status: response.status,
                    ok: response.ok,
                    dataLength: Array.isArray(data) ? data.length : 'not array',
                    firstStory: Array.isArray(data) && data.length > 0 ? {
                        id: data[0].id,
                        title: data[0].idea_title,
                        hasTitle: !!data[0].idea_title
                    } : null,
                    dataType: typeof data
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        
        console.log(`   Manual API Status: ${manualApiTest.status || 'ERROR'}`);
        console.log(`   Response OK: ${manualApiTest.ok ? '✅' : '❌'}`);
        console.log(`   Data Type: ${manualApiTest.dataType}`);
        console.log(`   Stories Count: ${manualApiTest.dataLength}`);
        
        if (manualApiTest.firstStory) {
            console.log('   First Story:');
            console.log(`     ID: ${manualApiTest.firstStory.id}`);
            console.log(`     Title: ${manualApiTest.firstStory.title}`);
        }
        
        if (manualApiTest.error) {
            console.log(`   ❌ API Error: ${manualApiTest.error}`);
        }
        
        // Determine the root cause
        let rootCause = 'Unknown';
        if (!frontendAnalysis.storiesJsLoaded) {
            rootCause = 'stories.js not loaded properly';
        } else if (manualApiTest.error) {
            rootCause = 'API request failing';
        } else if (manualApiTest.dataLength === 0) {
            rootCause = 'No stories in database';
        } else if (frontendAnalysis.domElements.storiesGridContent === 0) {
            rootCause = 'Stories not being rendered to DOM';
        }
        
        console.log(`\n🎯 ROOT CAUSE: ${rootCause}`);
        
        return { rootCause, manualApiTest, frontendAnalysis };
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
        return { error: error.message };
    }
    
    await browser.close();
}

debugStoriesLoading().catch(console.error);