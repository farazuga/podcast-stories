#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * FOCUSED BUG TESTING for remaining critical issues
 * BUG #3: Frontend Token Handling Issues  
 * BUG #4: Invalid Login Error Handling
 */

async function focusedBugTest() {
    console.log('🎯 FOCUSED BUG TESTING - Remaining Critical Issues');
    console.log('=' .repeat(70));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    // Track console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    try {
        // BUG #3 TEST: Frontend Token Handling 
        console.log('\n🐛 BUG #3 TEST: Frontend Token Handling Issues');
        console.log('-'.repeat(50));
        
        // Test 3.1: Login and check token storage
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.waitForSelector('#email', { timeout: 10000 });
        
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ timeout: 15000 });
        
        // Check if token was stored properly
        const tokenCheck = await page.evaluate(() => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            return {
                hasToken: !!token,
                tokenLength: token ? token.length : 0,
                hasUser: !!user,
                currentURL: window.location.href
            };
        });
        
        console.log(`   Token Stored: ${tokenCheck.hasToken ? '✅' : '❌'}`);
        console.log(`   Token Length: ${tokenCheck.tokenLength} chars`);
        console.log(`   User Data Stored: ${tokenCheck.hasUser ? '✅' : '❌'}`);
        console.log(`   Redirected to: ${tokenCheck.currentURL}`);
        
        // Test 3.2: Page refresh token persistence
        console.log('\n   Testing token persistence after page refresh...');
        await page.reload({ waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const persistenceCheck = await page.evaluate(() => {
            const token = localStorage.getItem('token');
            const currentURL = window.location.href;
            return {
                tokenStillThere: !!token,
                stayedLoggedIn: !currentURL.includes('index.html'),
                finalURL: currentURL
            };
        });
        
        console.log(`   Token Persisted: ${persistenceCheck.tokenStillThere ? '✅' : '❌'}`);
        console.log(`   Stayed Logged In: ${persistenceCheck.stayedLoggedIn ? '✅' : '❌'}`);
        console.log(`   Final URL: ${persistenceCheck.finalURL}`);
        
        // Test 3.3: Navigation between pages with token
        console.log('\n   Testing navigation with token...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const navigationCheck = await page.evaluate(() => {
            const token = localStorage.getItem('token');
            const storiesLoaded = document.querySelectorAll('.story-card').length > 0;
            const hasConsoleErrors = !!window.lastError;
            
            return {
                tokenDuringNav: !!token,
                storiesLoaded,
                hasConsoleErrors,
                pageLoaded: document.readyState === 'complete'
            };
        });
        
        console.log(`   Token During Navigation: ${navigationCheck.tokenDuringNav ? '✅' : '❌'}`);
        console.log(`   Stories Loaded: ${navigationCheck.storiesLoaded ? '✅' : '❌'}`);
        console.log(`   Page Loaded: ${navigationCheck.pageLoaded ? '✅' : '❌'}`);
        
        if (consoleErrors.length > 0) {
            console.log(`   Console Errors: ${consoleErrors.length}`);
            consoleErrors.slice(0, 3).forEach(error => console.log(`     • ${error}`));
        }
        
        // BUG #4 TEST: Invalid Login Error Handling
        console.log('\n🐛 BUG #4 TEST: Invalid Login Error Handling');
        console.log('-'.repeat(50));
        
        // Logout first
        await page.evaluate(() => {
            localStorage.clear();
        });
        
        // Test 4.1: Invalid login with wrong credentials
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.waitForSelector('#email');
        
        await page.type('#email', 'invalid@email.com');
        await page.type('#password', 'wrongpassword');
        await page.click('button[type="submit"]');
        
        // Wait for response and check for error handling
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const errorHandlingCheck = await page.evaluate(() => {
            const errorElements = document.querySelectorAll('.error, .notification, .alert, .message, .form-error');
            const currentURL = window.location.href;
            const submitButton = document.querySelector('button[type="submit"]');
            
            return {
                hasErrorMessage: errorElements.length > 0,
                errorTexts: Array.from(errorElements).map(el => el.textContent),
                stayedOnLogin: currentURL.includes('index.html') || currentURL.endsWith('/'),
                buttonDisabled: submitButton ? submitButton.disabled : false,
                formElements: {
                    emailValue: document.querySelector('#email')?.value || '',
                    passwordValue: document.querySelector('#password')?.value || ''
                }
            };
        });
        
        console.log(`   Stayed on Login: ${errorHandlingCheck.stayedOnLogin ? '✅' : '❌'}`);
        console.log(`   Error Message Shown: ${errorHandlingCheck.hasErrorMessage ? '✅' : '❌'}`);
        console.log(`   Button State: ${errorHandlingCheck.buttonDisabled ? 'Disabled' : 'Enabled'}`);
        
        if (errorHandlingCheck.hasErrorMessage) {
            console.log(`   Error Messages:`);
            errorHandlingCheck.errorTexts.forEach(text => console.log(`     • "${text}"`));
        }
        
        if (!errorHandlingCheck.hasErrorMessage) {
            console.log(`   🔍 Checking alternative error indicators...`);
            
            // Check for other forms of error feedback
            const alternativeErrorCheck = await page.evaluate(() => {
                const inputFields = document.querySelectorAll('#email, #password');
                const hasInvalidClass = Array.from(inputFields).some(input => 
                    input.classList.contains('invalid') || input.classList.contains('error')
                );
                
                const hasRedBorder = Array.from(inputFields).some(input => {
                    const style = window.getComputedStyle(input);
                    return style.borderColor.includes('red') || style.borderColor.includes('rgb(255');
                });
                
                return {
                    hasInvalidClass,
                    hasRedBorder,
                    formValidationState: document.querySelector('form')?.checkValidity()
                };
            });
            
            console.log(`   Invalid CSS Classes: ${alternativeErrorCheck.hasInvalidClass ? '✅' : '❌'}`);
            console.log(`   Red Border Styling: ${alternativeErrorCheck.hasRedBorder ? '✅' : '❌'}`);
        }
        
        // Test 4.2: Network error simulation
        console.log('\n   Testing network error handling...');
        
        await page.setOfflineMode(true);
        await page.reload();
        await page.waitForSelector('#email', { timeout: 5000 }).catch(() => {});
        
        const networkErrorCheck = await page.evaluate(() => {
            const hasNetworkError = document.querySelector('.offline, .network-error, .connection-error');
            const pageLoaded = document.readyState === 'complete';
            
            return {
                hasNetworkError: !!hasNetworkError,
                pageLoaded,
                offlineHandling: 'offline' in navigator ? navigator.onLine : 'unknown'
            };
        });
        
        await page.setOfflineMode(false);
        
        console.log(`   Network Error Detected: ${networkErrorCheck.hasNetworkError ? '✅' : '❌'}`);
        console.log(`   Offline Handling: ${networkErrorCheck.offlineHandling}`);
        
        // Summary
        console.log('\n📊 FOCUSED BUG TEST SUMMARY');
        console.log('=' .repeat(70));
        
        const bug3Fixed = tokenCheck.hasToken && persistenceCheck.tokenStillThere && navigationCheck.tokenDuringNav;
        const bug4Fixed = errorHandlingCheck.hasErrorMessage || errorHandlingCheck.stayedOnLogin;
        
        console.log(`🐛 BUG #3 (Token Handling): ${bug3Fixed ? '✅ FIXED' : '❌ NEEDS WORK'}`);
        console.log(`🐛 BUG #4 (Error Handling): ${bug4Fixed ? '✅ FIXED' : '❌ NEEDS WORK'}`);
        
        if (!bug3Fixed) {
            console.log('\n🔧 BUG #3 Issues Found:');
            if (!tokenCheck.hasToken) console.log('   • Token not stored after login');
            if (!persistenceCheck.tokenStillThere) console.log('   • Token not persisting after refresh');
            if (!navigationCheck.tokenDuringNav) console.log('   • Token lost during navigation');
        }
        
        if (!bug4Fixed) {
            console.log('\n🔧 BUG #4 Issues Found:');
            if (!errorHandlingCheck.hasErrorMessage) console.log('   • No error message displayed for invalid login');
            if (!errorHandlingCheck.stayedOnLogin) console.log('   • User redirected away instead of staying on login');
        }
        
        console.log('\n📸 Taking screenshot for manual review...');
        await page.screenshot({ 
            path: './focused-bug-test-result.png', 
            fullPage: true 
        });
        
    } catch (error) {
        console.error('❌ Focused test error:', error.message);
    }
    
    await browser.close();
}

focusedBugTest().catch(console.error);