#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * DEBUG TOKEN REGRESSION (BUG #3 RETURN)
 * Investigate why token is lost during navigation to stories.html
 */

async function debugTokenRegression() {
    console.log('🔍 DEBUGGING TOKEN REGRESSION - BUG #3 RETURN');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    
    // Track all console messages
    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location(),
            timestamp: Date.now()
        });
    });
    
    try {
        console.log('\n🔐 STEP 1: Login and track token state');
        console.log('-'.repeat(40));
        
        // Login
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        
        await page.waitForSelector('#email', { timeout: 10000 });
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        const afterLogin = await page.evaluate(() => ({
            currentURL: window.location.href,
            hasToken: !!localStorage.getItem('token'),
            tokenLength: localStorage.getItem('token')?.length || 0,
            hasUser: !!localStorage.getItem('user'),
            userRole: JSON.parse(localStorage.getItem('user') || '{}').role
        }));
        
        console.log(`   Login URL: ${afterLogin.currentURL}`);
        console.log(`   Token After Login: ${afterLogin.hasToken ? '✅' : '❌'} (${afterLogin.tokenLength} chars)`);
        console.log(`   User Data: ${afterLogin.hasUser ? '✅' : '❌'} (${afterLogin.userRole})`);
        
        console.log('\n🚦 STEP 2: Navigate to stories and track token changes');
        console.log('-'.repeat(40));
        
        // Clear console messages to focus on navigation
        consoleMessages.length = 0;
        
        // Track token before navigation
        const beforeNav = await page.evaluate(() => ({
            token: localStorage.getItem('token'),
            user: localStorage.getItem('user')
        }));
        
        console.log(`   Token Before Navigation: ${beforeNav.token ? 'Present' : 'Missing'}`);
        
        // Navigate to stories.html
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for auth.js to process
        
        const afterNav = await page.evaluate(() => ({
            currentURL: window.location.href,
            hasToken: !!localStorage.getItem('token'),
            tokenLength: localStorage.getItem('token')?.length || 0,
            hasUser: !!localStorage.getItem('user')
        }));
        
        console.log(`   Navigation URL: ${afterNav.currentURL}`);
        console.log(`   Token After Navigation: ${afterNav.hasToken ? '✅' : '❌'} (${afterNav.tokenLength} chars)`);
        console.log(`   User Data After Navigation: ${afterNav.hasUser ? '✅' : '❌'}`);
        
        console.log('\n📜 STEP 3: Analyze console messages for token clearing');
        console.log('-'.repeat(40));
        
        const authMessages = consoleMessages.filter(msg => 
            msg.text.includes('auth') || 
            msg.text.includes('token') || 
            msg.text.includes('clearing') ||
            msg.text.includes('Invalid') ||
            msg.text.includes('verification')
        );
        
        console.log(`   Auth-related messages: ${authMessages.length}`);
        authMessages.forEach((msg, index) => {
            const source = msg.location?.url ? msg.location.url.split('/').pop() : 'unknown';
            console.log(`     ${index + 1}. [${msg.type}] ${msg.text} (${source})`);
        });
        
        console.log('\n🔍 STEP 4: Check auth.js behavior on stories.html');
        console.log('-'.repeat(40));
        
        const authBehavior = await page.evaluate(() => {
            const isLoginPage = (window.location.pathname === '/' || window.location.pathname.includes('index.html'));
            const currentPath = window.location.pathname;
            
            return {
                currentPath,
                isLoginPage,
                shouldRunTokenCheck: isLoginPage && !!localStorage.getItem('token')
            };
        });
        
        console.log(`   Current Path: ${authBehavior.currentPath}`);
        console.log(`   Is Login Page: ${authBehavior.isLoginPage}`);
        console.log(`   Should Run Token Check: ${authBehavior.shouldRunTokenCheck}`);
        
        console.log('\n🎯 STEP 5: Test manual token verification');
        console.log('-'.repeat(40));
        
        // Manually set token and test verification
        await page.evaluate(() => {
            // Restore the token if it was cleared
            localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiZW1haWwiOiJzdHVkZW50QHZpZHBvZC5jb20iLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1NTY1OTc5MiwiZXhwIjoxNzU2MjY0NTkyfQ.t00VHRZL6jfjGnwic4PGj95u0bD4tw4bo7LToQLt2f8');
            localStorage.setItem('user', '{"id":3,"email":"student@vidpod.com","role":"student"}');
        });
        
        const manualTokenTest = await page.evaluate(async () => {
            const token = localStorage.getItem('token');
            if (!token) return { error: 'No token to test' };
            
            try {
                const response = await fetch('https://podcast-stories-production.up.railway.app/api/auth/verify', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                return {
                    status: response.status,
                    ok: response.ok,
                    tokenValid: response.ok
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        
        console.log(`   Manual Token Test: ${manualTokenTest.ok ? '✅ Valid' : '❌ Invalid'}`);
        console.log(`   Response Status: ${manualTokenTest.status || 'Error'}`);
        
        if (manualTokenTest.tokenValid) {
            console.log('\n🔥 STEP 6: Test stories loading with restored token');
            console.log('-'.repeat(40));
            
            // Try to manually call loadStories
            const storiesTest = await page.evaluate(async () => {
                if (typeof window.loadStories === 'function') {
                    try {
                        await window.loadStories();
                        return {
                            success: true,
                            storiesCount: window.allStories ? window.allStories.length : 0
                        };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                } else {
                    return { success: false, error: 'loadStories function not available' };
                }
            });
            
            console.log(`   Manual Stories Load: ${storiesTest.success ? '✅' : '❌'}`);
            if (storiesTest.success) {
                console.log(`   Stories Count: ${storiesTest.storiesCount}`);
            } else {
                console.log(`   Error: ${storiesTest.error}`);
            }
        }
        
        console.log('\n📊 ROOT CAUSE ANALYSIS');
        console.log('=' .repeat(60));
        
        let rootCause = 'Unknown';
        let solution = 'Investigate further';
        
        if (!afterNav.hasToken && beforeNav.token) {
            rootCause = 'Token is being cleared during stories.html navigation';
            solution = 'Fix auth.js to not clear token on non-login pages';
        } else if (afterNav.hasToken && !manualTokenTest.tokenValid) {
            rootCause = 'Token becomes invalid during navigation';
            solution = 'Check token expiration or server-side validation';
        } else if (afterNav.hasToken && manualTokenTest.tokenValid) {
            rootCause = 'Token is valid but stories.js not using it correctly';
            solution = 'Fix stories.js token handling';
        }
        
        console.log(`🔍 Root Cause: ${rootCause}`);
        console.log(`💡 Solution: ${solution}`);
        
        return { 
            rootCause, 
            solution,
            tokenLost: !afterNav.hasToken && beforeNav.token,
            authMessages: authMessages.length
        };
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
        return { error: error.message };
    }
    
    await browser.close();
}

debugTokenRegression().then(result => {
    console.log('\n🏁 TOKEN REGRESSION DEBUG COMPLETE');
    if (result.solution) {
        console.log(`🎯 NEXT ACTION: ${result.solution}`);
    }
}).catch(console.error);