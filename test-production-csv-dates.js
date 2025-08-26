/**
 * Test Production CSV Date Import
 * Test the actual production system to see where the date offset is occurring
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testProductionCSVDates() {
  console.log('🧪 Testing Production CSV Date Import\n');

  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    console.log('1️⃣ Logging in as admin...');
    await page.goto('https://podcast-stories-production.up.railway.app/');
    
    // Login as admin
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', 'admin@vidpod.com');
    await page.type('input[name="password"]', 'vidpod');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to admin page
    await page.waitForNavigation();
    console.log('✅ Logged in successfully');
    
    console.log('2️⃣ Navigating to CSV import...');
    await page.goto('https://podcast-stories-production.up.railway.app/admin-browse-stories.html');
    await page.waitForSelector('#csvUpload');
    
    console.log('3️⃣ Creating test CSV with specific dates...');
    const testCSVContent = `idea_title,idea_description,coverage_start_date,coverage_end_date
Test Date Debug Story,Testing date parsing,1-Jan,2-Jan`;
    
    const testCSVPath = path.join(__dirname, 'date-test.csv');
    fs.writeFileSync(testCSVPath, testCSVContent);
    
    console.log('4️⃣ Uploading test CSV...');
    const fileInput = await page.$('#csvUpload');
    await fileInput.uploadFile(testCSVPath);
    
    // Check auto-approve checkbox
    await page.check('#autoApprove');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    console.log('5️⃣ Waiting for upload response...');
    await page.waitForTimeout(3000);
    
    console.log('6️⃣ Checking uploaded story dates...');
    
    // Go to stories list to check the imported story
    await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
    await page.waitForSelector('.story-card', { timeout: 10000 });
    
    // Look for our test story
    const storyCards = await page.$$('.story-card');
    let foundTestStory = false;
    
    for (let card of storyCards) {
      const title = await card.$eval('h3', el => el.textContent);
      if (title.includes('Test Date Debug Story')) {
        foundTestStory = true;
        console.log('📅 Found test story. Checking dates...');
        
        // Look for date elements in the card
        const dateElements = await card.$$('[class*="date"], .date-range, .coverage-dates');
        for (let dateEl of dateElements) {
          const dateText = await dateEl.evaluate(el => el.textContent);
          console.log(`  Date found: "${dateText}"`);
        }
        
        // Also check the full card content
        const cardHTML = await card.evaluate(el => el.innerHTML);
        console.log('📋 Full card HTML:');
        console.log(cardHTML);
        break;
      }
    }
    
    if (!foundTestStory) {
      console.log('❌ Test story not found. Checking all stories...');
      for (let i = 0; i < Math.min(storyCards.length, 3); i++) {
        const title = await storyCards[i].$eval('h3', el => el.textContent);
        console.log(`  Story ${i + 1}: ${title}`);
      }
    }
    
    // Clean up test file
    fs.unlinkSync(testCSVPath);
    console.log('✅ Test file cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testProductionCSVDates().catch(console.error);