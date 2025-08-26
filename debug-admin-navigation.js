#!/usr/bin/env node

/**
 * Direct debug of admin navigation on production site
 * Tests admin login and inspects navigation elements
 */

const puppeteer = require('puppeteer');

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function debugAdminNavigation() {
  console.log('🔍 DEBUGGING ADMIN NAVIGATION ON PRODUCTION');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
    devtools: true
  });

  const page = await browser.newPage();
  
  // Listen to all console messages from the page
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (text.includes('V2 NAVIGATION') || text.includes('AMITRACE') || text.includes('🔧')) {
      console.log(`[BROWSER ${type}] ${text}`);
    }
  });

  try {
    console.log('1. Navigating to login page...');
    await page.goto(`${PRODUCTION_URL}/index.html`, { waitUntil: 'networkidle0' });
    
    console.log('2. Logging in as admin...');
    await page.waitForSelector('#email');
    await page.type('#email', 'admin@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ timeout: 15000 });
    console.log('3. Login successful, current URL:', page.url());
    
    // Wait for navigation to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('4. Checking user from localStorage...');
    const user = await page.evaluate(() => {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    });
    console.log('User data:', user);
    
    console.log('5. Checking VidPODNav object...');
    const navObject = await page.evaluate(() => {
      return {
        exists: !!window.VidPODNav,
        currentUser: window.VidPODNav?.currentUser || null,
        isInitialized: document.getElementById('vidpodNavbar')?.hasAttribute('data-initialized') || false
      };
    });
    console.log('Navigation object:', navObject);
    
    console.log('6. Checking My Classes elements...');
    const myClassesInfo = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[data-page="teacher-dashboard"]'));
      return elements.map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim() || '',
        visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        dataRole: el.getAttribute('data-role')
      }));
    });
    console.log('My Classes elements:', myClassesInfo);
    
    console.log('7. Manual call to customizeAmitracAdminNavigation...');
    await page.evaluate(() => {
      if (window.VidPODNav && window.VidPODNav.customizeAmitracAdminNavigation) {
        console.log('🔧 MANUAL: Calling customizeAmitracAdminNavigation');
        window.VidPODNav.customizeAmitracAdminNavigation();
      } else {
        console.log('❌ MANUAL: customizeAmitracAdminNavigation not available');
      }
    });
    
    // Check again after manual call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('8. Checking My Classes elements after manual call...');
    const myClassesInfoAfter = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[data-page="teacher-dashboard"]'));
      return elements.map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim() || '',
        visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        dataRole: el.getAttribute('data-role'),
        classList: Array.from(el.classList)
      }));
    });
    console.log('My Classes elements after manual call:', myClassesInfoAfter);
    
    console.log('9. Keeping browser open for manual inspection...');
    console.log('   Check the page manually, then close the browser to continue.');
    
    // Keep browser open for manual inspection
    await new Promise(resolve => {
      console.log('   Press Ctrl+C when done inspecting.');
      process.on('SIGINT', resolve);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugAdminNavigation().catch(console.error);