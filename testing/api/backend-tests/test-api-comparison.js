const puppeteer = require('puppeteer');

async function testApiComparison() {
  console.log('🔍 Testing API Token Comparison...\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Step 1: Login and get token from browser
    console.log('Step 1: Login to get browser token...');
    await page.goto('https://podcast-stories-production.up.railway.app/index.html');
    await page.type('#email', 'admin@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    const browserToken = await page.evaluate(() => localStorage.getItem('token'));
    console.log(`Browser token: ${browserToken?.substring(0, 50)}...`);
    
    // Step 2: Test API with browser token
    const browserApiResult = await page.evaluate(async (token) => {
      try {
        const response = await fetch(`https://podcast-stories-production.up.railway.app/api/stories/admin/by-status/pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return {
          status: response.status,
          ok: response.ok,
          data: response.ok ? await response.json() : await response.text()
        };
      } catch (error) {
        return { error: error.message };
      }
    }, browserToken);
    
    console.log('\nBrowser API Result:');
    console.log(`Status: ${browserApiResult.status}`);
    console.log(`Success: ${browserApiResult.ok}`);
    if (browserApiResult.ok) {
      console.log(`Stories count: ${browserApiResult.data?.length || 0}`);
      if (browserApiResult.data?.length > 0) {
        console.log(`First story: ${browserApiResult.data[0].idea_title}`);
      }
    } else {
      console.log(`Error: ${browserApiResult.error || browserApiResult.data}`);
    }
    
    // Step 3: Use browser-derived token or environment variable
    const apiToken = process.env.API_TOKEN || browserToken;
    
    console.log(`\nUsing token: ${apiToken?.substring(0, 50)}...`);
    
    if (!apiToken) {
      console.log('⚠️  No API token available. Set API_TOKEN environment variable or ensure browser login succeeded.');
    }
    
    // Step 4: Test different endpoints
    console.log('\n--- Testing Different Endpoints ---');
    
    const endpoints = [
      '/stories',
      '/stories/admin/by-status/pending',
      '/stories/admin/by-status/approved',
      '/stories/admin/by-status/rejected'
    ];
    
    for (const endpoint of endpoints) {
      const result = await page.evaluate(async (endpoint, token) => {
        try {
          const response = await fetch(`https://podcast-stories-production.up.railway.app/api${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          return {
            endpoint,
            status: response.status,
            ok: response.ok,
            count: response.ok ? (await response.json()).length : 'error'
          };
        } catch (error) {
          return { endpoint, error: error.message };
        }
      }, endpoint, browserToken);
      
      console.log(`${endpoint}: ${result.ok ? `${result.count} stories` : `Error ${result.status || result.error}`}`);
    }
    
    // Step 5: Check user info from both tokens
    console.log('\n--- Token User Info Comparison ---');
    
    const decodeToken = (token) => {
      try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
        return decoded;
      } catch (error) {
        return { error: error.message };
      }
    };
    
    if (browserToken) {
      console.log('Browser token user:', decodeToken(browserToken));
    }
    if (apiToken && apiToken !== browserToken) {
      console.log('API token user:', decodeToken(apiToken));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testApiComparison();