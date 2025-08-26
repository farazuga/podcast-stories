#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * DEBUG 401 TOKEN ERROR
 * Isolate the exact cause of token 401 errors during stories page loading
 */

async function debug401Error() {
    console.log('🔍 DEBUGGING 401 TOKEN ERROR');
    console.log('=' .repeat(50));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    // Track all network requests
    const requests = [];
    const responses = [];
    
    page.on('request', request => {
        requests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            timestamp: new Date().toISOString()
        });
    });
    
    page.on('response', response => {
        responses.push({
            url: response.url(),
            status: response.status(),
            headers: response.headers(),
            timestamp: new Date().toISOString()
        });
    });
    
    try {
        console.log('\n🔐 STEP 1: Login and capture token');
        console.log('-'.repeat(30));
        
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.waitForSelector('#email', { timeout: 10000 });
        
        // Clear any existing data
        await page.evaluate(() => localStorage.clear());
        
        // Login
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ timeout: 15000 });
        
        // Capture token immediately after login
        const tokenAfterLogin = await page.evaluate(() => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            return {
                token: token ? token.substring(0, 50) + '...' : null,
                tokenLength: token ? token.length : 0,
                user: user ? JSON.parse(user) : null,
                currentURL: window.location.href
            };
        });
        
        console.log(`   Token Captured: ${tokenAfterLogin.token ? '✅' : '❌'}`);
        console.log(`   Token Length: ${tokenAfterLogin.tokenLength} chars`);
        console.log(`   User ID: ${tokenAfterLogin.user?.id}`);
        console.log(`   Current URL: ${tokenAfterLogin.currentURL}`);
        
        console.log('\n🌐 STEP 2: Navigate to stories page and monitor requests');
        console.log('-'.repeat(30));
        
        // Clear request/response tracking
        requests.length = 0;
        responses.length = 0;
        
        // Navigate to stories page
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 8000)); // Wait for all requests
        
        // Check token after navigation
        const tokenAfterNav = await page.evaluate(() => {
            const token = localStorage.getItem('token');
            return {
                tokenExists: !!token,
                tokenSame: token === localStorage.getItem('token'), // Should be true
                tokenLength: token ? token.length : 0
            };
        });
        
        console.log(`   Token After Navigation: ${tokenAfterNav.tokenExists ? '✅' : '❌'}`);
        console.log(`   Token Length: ${tokenAfterNav.tokenLength} chars`);
        
        console.log('\n📡 STEP 3: Analyze network requests');
        console.log('-'.repeat(30));
        
        // Filter API requests
        const apiRequests = requests.filter(req => req.url.includes('/api/'));
        const apiResponses = responses.filter(res => res.url.includes('/api/'));
        
        console.log(`   Total API Requests: ${apiRequests.length}`);
        console.log(`   Total API Responses: ${apiResponses.length}`);
        
        // Check for 401 responses
        const unauthorizedResponses = apiResponses.filter(res => res.status === 401);
        console.log(`   401 Unauthorized: ${unauthorizedResponses.length}`);
        
        if (unauthorizedResponses.length > 0) {
            console.log('\n❌ 401 ERRORS FOUND:');
            unauthorizedResponses.forEach((res, index) => {
                console.log(`   ${index + 1}. ${res.url} - Status: ${res.status}`);
                
                // Find matching request
                const matchingRequest = apiRequests.find(req => req.url === res.url);
                if (matchingRequest) {
                    const hasAuthHeader = !!matchingRequest.headers.authorization;
                    const authHeaderPreview = matchingRequest.headers.authorization ? 
                        matchingRequest.headers.authorization.substring(0, 20) + '...' : 'MISSING';
                    
                    console.log(`      Authorization Header: ${hasAuthHeader ? '✅' : '❌'} (${authHeaderPreview})`);
                }
            });
        }
        
        // Check all API requests for authorization headers
        console.log('\n🔑 STEP 4: Check authorization headers');
        console.log('-'.repeat(30));
        
        apiRequests.forEach((req, index) => {
            const hasAuth = !!req.headers.authorization;
            const authPreview = req.headers.authorization ? 
                req.headers.authorization.substring(0, 30) + '...' : 'MISSING';
            
            console.log(`   ${index + 1}. ${req.method} ${req.url.split('/api/')[1]}`);
            console.log(`      Auth: ${hasAuth ? '✅' : '❌'} ${authPreview}`);
            
            // Find response
            const response = apiResponses.find(res => res.url === req.url);
            if (response) {
                console.log(`      Response: ${response.status}`);
            }
        });
        
        console.log('\n🧪 STEP 5: Manual token validation');
        console.log('-'.repeat(30));
        
        // Get current token and test it manually
        const currentTokenTest = await page.evaluate(async () => {
            const token = localStorage.getItem('token');
            if (!token) return { error: 'No token found' };
            
            try {
                const testResponse = await fetch('https://podcast-stories-production.up.railway.app/api/stories', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                return {
                    tokenExists: true,
                    testStatus: testResponse.status,
                    testOk: testResponse.ok,
                    testError: testResponse.ok ? null : await testResponse.text()
                };
            } catch (error) {
                return {
                    tokenExists: true,
                    error: error.message
                };
            }
        });
        
        console.log(`   Token Test Status: ${currentTokenTest.testStatus}`);
        console.log(`   Token Test OK: ${currentTokenTest.testOk ? '✅' : '❌'}`);
        if (currentTokenTest.testError) {
            console.log(`   Test Error: ${currentTokenTest.testError.substring(0, 100)}`);
        }
        
        console.log('\n📊 SUMMARY');
        console.log('=' .repeat(50));
        
        if (unauthorizedResponses.length === 0) {
            console.log('✅ No 401 errors found - issue may be intermittent');
        } else {
            console.log(`❌ Found ${unauthorizedResponses.length} 401 errors`);
            
            // Analyze the pattern
            const noAuthRequests = apiRequests.filter(req => !req.headers.authorization);
            if (noAuthRequests.length > 0) {
                console.log(`🔍 Root Cause: ${noAuthRequests.length} requests missing auth headers`);
                console.log('   Missing auth on:');
                noAuthRequests.forEach(req => {
                    console.log(`     • ${req.method} ${req.url.split('/api/')[1]}`);
                });
            } else {
                console.log('🔍 Root Cause: Auth headers present but tokens may be invalid/expired');
            }
        }
        
        await page.screenshot({ 
            path: './debug-401-error.png', 
            fullPage: true 
        });
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
    
    await browser.close();
}

debug401Error().catch(console.error);