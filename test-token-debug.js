#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * TEST TOKEN DEBUG LOGGING
 * See exactly when the token disappears
 */

async function testTokenDebug() {
    console.log('🔍 TEST TOKEN DEBUG LOGGING');
    console.log('=' .repeat(50));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    
    // Track ALL console messages
    const messages = [];
    page.on('console', msg => {
        messages.push({
            type: msg.type(),
            text: msg.text(),
            timestamp: Date.now()
        });
    });
    
    try {
        console.log('\n🔐 Login');
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        
        await page.waitForSelector('#email', { timeout: 10000 });
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ Login successful');
        
        // Check token state
        const afterLogin = await page.evaluate(() => ({
            hasToken: !!localStorage.getItem('token'),
            hasUser: !!localStorage.getItem('user')
        }));
        
        console.log(`Token after login: ${afterLogin.hasToken ? '✅' : '❌'}`);
        console.log(`User after login: ${afterLogin.hasUser ? '✅' : '❌'}`);
        
        // Clear messages
        messages.length = 0;
        
        console.log('\\n🚀 Navigate to stories');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        console.log('\\n📜 Console Messages:');
        console.log('-'.repeat(40));
        
        const relevantMessages = messages.filter(msg => 
            msg.text.includes('STORIES.JS') ||
            msg.text.includes('checkAuth') ||
            msg.text.includes('token') ||
            msg.text.includes('initialization') ||
            msg.text.includes('Auth.js')
        );
        
        relevantMessages.forEach((msg, index) => {
            console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
        });
        
        const finalUrl = await page.evaluate(() => window.location.href);
        const finalToken = await page.evaluate(() => ({
            hasToken: !!localStorage.getItem('token'),
            hasUser: !!localStorage.getItem('user')
        }));
        
        console.log(`\\nFinal URL: ${finalUrl}`);
        console.log(`Final Token: ${finalToken.hasToken ? '✅' : '❌'}`);
        console.log(`Final User: ${finalToken.hasUser ? '✅' : '❌'}`);
        
        // Check if we ended up on stories.html or got redirected
        const onStoriesPage = finalUrl.includes('stories.html');
        console.log(`On Stories Page: ${onStoriesPage ? '✅' : '❌'}`);
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
    
    await browser.close();
}

testTokenDebug().catch(console.error);