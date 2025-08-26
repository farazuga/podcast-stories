#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function debugLogin() {
    console.log('🔍 Debug Login Form...');
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    // Listen to console messages
    page.on('console', msg => {
        console.log(`🖥️  BROWSER: ${msg.type()}: ${msg.text()}`);
    });
    
    // Listen to network requests
    page.on('response', response => {
        if (response.url().includes('/api/')) {
            console.log(`🌐 API: ${response.status()} ${response.url()}`);
        }
    });
    
    try {
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check form details
        const formDetails = await page.evaluate(() => {
            const form = document.querySelector('#loginForm, form');
            const emailInput = document.querySelector('#email, [name="email"], [type="email"]');
            const passwordInput = document.querySelector('#password, [name="password"], [type="password"]');
            const submitBtn = document.querySelector('button[type="submit"], .login-btn');
            
            return {
                hasForm: !!form,
                hasEmailInput: !!emailInput,
                hasPasswordInput: !!passwordInput,
                hasSubmitBtn: !!submitBtn,
                formAction: form ? form.action : 'none',
                formMethod: form ? form.method : 'none',
                emailInputType: emailInput ? emailInput.type : 'none',
                passwordInputType: passwordInput ? passwordInput.type : 'none'
            };
        });
        
        console.log('📋 Form details:', JSON.stringify(formDetails, null, 2));
        
        // Clear storage and try login
        await page.evaluate(() => localStorage.clear());
        
        const emailInput = await page.$('#email, [name="email"], [type="email"]');
        const passwordInput = await page.$('#password, [name="password"], [type="password"]');
        
        if (emailInput && passwordInput) {
            await emailInput.type('student@vidpod.com', { delay: 100 });
            await passwordInput.type('vidpod', { delay: 100 });
            
            console.log('✅ Credentials entered');
            
            // Check if form has event listeners
            const hasEventListeners = await page.evaluate(() => {
                const form = document.querySelector('#loginForm, form');
                return {
                    formHasListener: form ? form.onsubmit !== null : false,
                    jsLoaded: typeof window.API_URL !== 'undefined'
                };
            });
            
            console.log('🔍 Event listeners:', JSON.stringify(hasEventListeners, null, 2));
            
            // Try submitting form
            const submitBtn = await page.$('button[type="submit"], .login-btn');
            if (submitBtn) {
                console.log('🚀 Clicking submit button...');
                await submitBtn.click();
                
                // Wait and monitor for changes
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const finalState = await page.evaluate(() => ({
                    currentURL: window.location.href,
                    token: localStorage.getItem('token'),
                    user: localStorage.getItem('user'),
                    hasErrors: !!document.querySelector('.error, [class*="error"]'),
                    errorText: document.querySelector('.error, [class*="error"]')?.textContent || 'none'
                }));
                
                console.log('📊 Final state:', JSON.stringify(finalState, null, 2));
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
    
    await browser.close();
}

debugLogin().catch(console.error);