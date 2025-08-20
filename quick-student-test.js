#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function quickStudentTest() {
    console.log('🚀 Quick Student Login Test Starting...');
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    try {
        // Navigate to login
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('📍 Navigated to login page');
        
        // Check if login form exists
        const loginForm = await page.$('#loginForm, form');
        console.log('🔍 Login form found:', !!loginForm);
        
        // Fill login form
        await page.evaluate(() => localStorage.clear());
        
        const emailInput = await page.$('#email, [name="email"], [type="email"]');
        const passwordInput = await page.$('#password, [name="password"], [type="password"]');
        
        console.log('🔍 Email input found:', !!emailInput);
        console.log('🔍 Password input found:', !!passwordInput);
        
        if (emailInput && passwordInput) {
            await emailInput.type('student@vidpod.com');
            await passwordInput.type('vidpod');
            
            console.log('✅ Credentials entered');
            
            // Submit form
            const submitBtn = await page.$('button[type="submit"], .login-btn');
            if (submitBtn) {
                await submitBtn.click();
                console.log('🚀 Form submitted');
                
                // Wait for navigation or response
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Check result
                const currentURL = page.url();
                const token = await page.evaluate(() => localStorage.getItem('token'));
                const user = await page.evaluate(() => localStorage.getItem('user'));
                
                console.log('📍 Current URL:', currentURL);
                console.log('🔑 Token present:', !!token);
                console.log('👤 User data present:', !!user);
                
                if (token && user) {
                    const userData = JSON.parse(user);
                    console.log('✅ LOGIN SUCCESS!');
                    console.log('👤 User role:', userData.role);
                    console.log('📧 User email:', userData.email);
                    
                    // Test navigation to stories
                    await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    const storiesPage = page.url();
                    const redirected = storiesPage.includes('index.html');
                    
                    console.log('📍 Stories page URL:', storiesPage);
                    console.log('🔄 Redirected to login:', redirected);
                    
                    if (!redirected) {
                        console.log('✅ STORIES ACCESS SUCCESS!');
                    } else {
                        console.log('❌ Stories access failed - token lost');
                    }
                } else {
                    console.log('❌ LOGIN FAILED - no token or user data');
                }
            } else {
                console.log('❌ Submit button not found');
            }
        } else {
            console.log('❌ Login inputs not found');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
    
    await browser.close();
    console.log('🔒 Test complete');
}

quickStudentTest().catch(console.error);