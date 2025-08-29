#!/usr/bin/env node
/**
 * Setup lesson management system via API calls
 * Agent 4: Enrollment & Progress Specialist
 */

const https = require('https');

const BASE_URL = 'https://podcast-stories-production.up.railway.app';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VidPOD-Setup',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    
    req.end();
  });
}

async function trySetupDatabase() {
  console.log('🚀 Attempting to setup lesson management system via API...');
  
  // Try various migration endpoints that might exist
  const endpoints = [
    '/api/migration/setup-lesson-tables',
    '/api/debug/setup-lesson-tables', 
    '/api/lessons/fix-schema-temp',
    '/api/lessons/temp-migrate-comprehensive',
    '/api/migration/comprehensive-setup'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Trying ${endpoint}...`);
      const response = await makeRequest(`${BASE_URL}${endpoint}`, {
        method: endpoint.includes('fix-schema') ? 'GET' : 'POST'
      });
      
      console.log(`Status: ${response.statusCode}`);
      if (response.data && typeof response.data === 'object') {
        console.log('Response:', JSON.stringify(response.data, null, 2));
      } else {
        console.log('Response:', response.data);
      }
      
      if (response.statusCode === 200 && response.data?.success) {
        console.log('✅ Success! Database setup completed.');
        return true;
      }
    } catch (error) {
      console.log(`❌ ${endpoint} failed:`, error.message);
    }
    console.log('');
  }
  
  return false;
}

async function testBasicEndpoints() {
  console.log('🔍 Testing basic lesson management endpoints...');
  
  // First login as admin
  try {
    const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      data: { email: 'admin@vidpod.com', password: 'vidpod' }
    });
    
    if (loginResponse.statusCode !== 200) {
      console.log('❌ Admin login failed');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Admin logged in successfully');
    
    // Test courses endpoint
    const coursesResponse = await makeRequest(`${BASE_URL}/api/courses`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`📚 Courses endpoint status: ${coursesResponse.statusCode}`);
    if (coursesResponse.statusCode === 200) {
      console.log(`   Found ${coursesResponse.data.length} courses`);
    } else {
      console.log(`   Error: ${JSON.stringify(coursesResponse.data)}`);
    }
    
  } catch (error) {
    console.log('❌ Testing failed:', error.message);
  }
}

async function main() {
  console.log('🎯 VidPOD Lesson Management Setup via API');
  console.log('Agent 4: Enrollment & Progress Specialist');
  console.log('=' .repeat(50));
  
  const setupSuccess = await trySetupDatabase();
  
  if (!setupSuccess) {
    console.log('⚠️ Database setup via API failed, but testing existing endpoints...');
  }
  
  await testBasicEndpoints();
  
  console.log('\n📋 Summary:');
  console.log('- Database setup:', setupSuccess ? 'SUCCESS' : 'FAILED');
  console.log('- API endpoints tested');
  console.log('\n💡 Next steps:');
  console.log('- Check if lesson management tables exist in database');
  console.log('- Run manual database migration if needed');
  console.log('- Test full enrollment workflow');
}

if (require.main === module) {
  main().catch(console.error);
}