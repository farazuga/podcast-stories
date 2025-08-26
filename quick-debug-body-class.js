#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function quickDebug() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
  
  await page.goto('https://podcast-stories-production.up.railway.app/index.html');
  await page.type('#email', 'admin@vidpod.com');
  await page.type('#password', 'vidpod');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const bodyClass = await page.evaluate(() => document.body.className);
  console.log('Body classes:', bodyClass);
  
  const teacherElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-page="teacher-dashboard"]')).map(el => ({
      visible: !!(el.offsetWidth || el.offsetHeight),
      display: getComputedStyle(el).display,
      classList: Array.from(el.classList)
    }));
  });
  console.log('Teacher elements:', teacherElements);
  
  await browser.close();
}

quickDebug().catch(console.error);