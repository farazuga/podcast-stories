#!/usr/bin/env node

/**
 * Debug CSV Import FormData Issue
 * Investigates why Node.js FormData fails while curl succeeds
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'https://podcast-stories-production.up.railway.app/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB2aWRwb2QuY29tIiwicm9sZSI6ImFtaXRyYWNlX2FkbWluIiwiaWF0IjoxNzU1NTc1MTEyLCJleHAiOjE3NTYxNzk5MTJ9.C4ZpEhGFxnS-aLU4eqLUBMtYdbPBK25btwVxcjttdks';

async function debugFormDataUpload() {
  console.log('🔍 Debugging FormData CSV Upload Issue\n');

  // Create a simple test CSV
  const testCSVContent = 'idea_title,idea_description\nNode Debug Test,Testing Node.js FormData upload';
  const testCSVPath = path.join(__dirname, 'node-debug.csv');
  
  fs.writeFileSync(testCSVPath, testCSVContent);
  console.log('📄 Created test CSV:', testCSVPath);
  console.log('📋 Content:', testCSVContent);

  try {
    // Method 1: Basic FormData with file stream
    console.log('\n🧪 Test 1: Basic FormData with file stream');
    const form1 = new FormData();
    form1.append('csv', fs.createReadStream(testCSVPath));
    
    console.log('📊 Form headers:', form1.getHeaders());
    console.log('📏 Form length:', await new Promise((resolve) => form1.getLength(resolve)));
    
    const response1 = await fetch(`${API_URL}/stories/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        ...form1.getHeaders()
      },
      body: form1
    });
    
    console.log(`📊 Response 1: ${response1.status} ${response1.statusText}`);
    const result1 = await response1.text();
    console.log('📝 Result 1:', result1);

    // Method 2: FormData with explicit options
    console.log('\n🧪 Test 2: FormData with explicit options');
    const form2 = new FormData();
    form2.append('csv', fs.createReadStream(testCSVPath), {
      filename: 'node-debug.csv',
      contentType: 'text/csv'
    });
    
    const response2 = await fetch(`${API_URL}/stories/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        ...form2.getHeaders()
      },
      body: form2
    });
    
    console.log(`📊 Response 2: ${response2.status} ${response2.statusText}`);
    const result2 = await response2.text();
    console.log('📝 Result 2:', result2);

    // Method 3: FormData with buffer instead of stream
    console.log('\n🧪 Test 3: FormData with buffer');
    const fileBuffer = fs.readFileSync(testCSVPath);
    const form3 = new FormData();
    form3.append('csv', fileBuffer, {
      filename: 'node-debug.csv',
      contentType: 'text/csv'
    });
    
    const response3 = await fetch(`${API_URL}/stories/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        ...form3.getHeaders()
      },
      body: form3
    });
    
    console.log(`📊 Response 3: ${response3.status} ${response3.statusText}`);
    const result3 = await response3.text();
    console.log('📝 Result 3:', result3);

    // Method 4: Debug the actual FormData content
    console.log('\n🧪 Test 4: Inspect FormData content');
    const form4 = new FormData();
    form4.append('csv', fs.createReadStream(testCSVPath), {
      filename: 'node-debug.csv',
      contentType: 'text/csv'
    });
    
    // Log the raw form data
    const formBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      form4.on('data', chunk => chunks.push(chunk));
      form4.on('end', () => resolve(Buffer.concat(chunks)));
      form4.on('error', reject);
    });
    
    console.log('📋 Raw FormData length:', formBuffer.length);
    console.log('📋 Raw FormData preview:', formBuffer.toString('utf8').substring(0, 500));

  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (fs.existsSync(testCSVPath)) {
      fs.unlinkSync(testCSVPath);
      console.log('\n🧹 Cleaned up test file');
    }
  }
}

// Test authentication first
async function testAuth() {
  console.log('🔐 Testing authentication...');
  
  try {
    const response = await fetch(`${API_URL}/stories`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    
    console.log(`📊 Auth test: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const stories = await response.json();
      console.log(`✅ Authentication working, ${stories.length} stories available`);
      return true;
    } else {
      console.error('❌ Authentication failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    return false;
  }
}

// Run the debug session
async function runDebug() {
  console.log('🧪 === CSV Import FormData Debug Session ===\n');
  
  const authOk = await testAuth();
  if (!authOk) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  await debugFormDataUpload();
  
  console.log('\n🏁 Debug session complete');
}

runDebug().catch(error => {
  console.error('\n💥 Debug session crashed:', error);
  process.exit(1);
});