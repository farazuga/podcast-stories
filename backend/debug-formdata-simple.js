#!/usr/bin/env node

/**
 * Simple FormData Debug
 * Tests different ways to send FormData to isolate the issue
 */

const fs = require('fs');
const { Readable } = require('stream');

const API_URL = 'https://podcast-stories-production.up.railway.app/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB2aWRwb2QuY29tIiwicm9sZSI6ImFtaXRyYWNlX2FkbWluIiwiaWF0IjoxNzU1NTc1MTEyLCJleHAiOjE3NTYxNzk5MTJ9.C4ZpEhGFxnS-aLU4eqLUBMtYdbPBK25btwVxcjttdks';

async function testBuiltInFormData() {
  console.log('🧪 Testing with built-in FormData (if available)...');
  
  // Create test CSV content
  const csvContent = 'idea_title,idea_description\nBuiltIn Test,Testing built-in FormData';
  
  try {
    // Use built-in FormData if available (Node.js 18+)
    if (typeof FormData !== 'undefined') {
      const form = new FormData();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      form.append('csv', blob, 'builtin-test.csv');
      
      const response = await fetch(`${API_URL}/stories/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        },
        body: form
      });
      
      console.log(`📊 Built-in FormData: ${response.status} ${response.statusText}`);
      const result = await response.text();
      console.log('📝 Result:', result);
      
      return response.ok;
    } else {
      console.log('⚠️ Built-in FormData not available in this Node.js version');
      return false;
    }
  } catch (error) {
    console.error('❌ Built-in FormData error:', error.message);
    return false;
  }
}

async function testWithManualMultipart() {
  console.log('\n🧪 Testing with manual multipart construction...');
  
  const csvContent = 'idea_title,idea_description\nManual Test,Testing manual multipart';
  const boundary = `----formdata-node-${Date.now()}`;
  
  const multipartData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="csv"; filename="manual-test.csv"',
    'Content-Type: text/csv',
    '',
    csvContent,
    `--${boundary}--`,
    ''
  ].join('\r\n');
  
  try {
    const response = await fetch(`${API_URL}/stories/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': multipartData.length.toString()
      },
      body: multipartData
    });
    
    console.log(`📊 Manual multipart: ${response.status} ${response.statusText}`);
    const result = await response.text();
    console.log('📝 Result:', result);
    
    return response.ok;
  } catch (error) {
    console.error('❌ Manual multipart error:', error.message);
    return false;
  }
}

async function testFormDataPackage() {
  console.log('\n🧪 Testing form-data package with different approaches...');
  
  const FormData = require('form-data');
  const csvContent = 'idea_title,idea_description\nPackage Test,Testing form-data package';
  
  // Method 1: String content
  try {
    console.log('🔧 Method 1: String content');
    const form1 = new FormData();
    form1.append('csv', csvContent, {
      filename: 'string-test.csv',
      contentType: 'text/csv'
    });
    
    const response1 = await fetch(`${API_URL}/stories/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        ...form1.getHeaders()
      },
      body: form1
    });
    
    console.log(`📊 String content: ${response1.status} ${response1.statusText}`);
    const result1 = await response1.text();
    console.log('📝 Result:', result1);
    
    if (response1.ok) return true;
  } catch (error) {
    console.error('❌ String content error:', error.message);
  }
  
  // Method 2: Buffer content
  try {
    console.log('\n🔧 Method 2: Buffer content');
    const form2 = new FormData();
    const buffer = Buffer.from(csvContent, 'utf8');
    form2.append('csv', buffer, {
      filename: 'buffer-test.csv',
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
    
    console.log(`📊 Buffer content: ${response2.status} ${response2.statusText}`);
    const result2 = await response2.text();
    console.log('📝 Result:', result2);
    
    if (response2.ok) return true;
  } catch (error) {
    console.error('❌ Buffer content error:', error.message);
  }
  
  // Method 3: Stream content
  try {
    console.log('\n🔧 Method 3: Stream content');
    const form3 = new FormData();
    const stream = Readable.from([csvContent]);
    form3.append('csv', stream, {
      filename: 'stream-test.csv',
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
    
    console.log(`📊 Stream content: ${response3.status} ${response3.statusText}`);
    const result3 = await response3.text();
    console.log('📝 Result:', result3);
    
    if (response3.ok) return true;
  } catch (error) {
    console.error('❌ Stream content error:', error.message);
  }
  
  return false;
}

async function runFormDataTests() {
  console.log('🧪 === FormData Debug Tests ===\n');
  
  let success = false;
  
  // Test different FormData approaches
  success = await testBuiltInFormData() || success;
  success = await testWithManualMultipart() || success;
  success = await testFormDataPackage() || success;
  
  console.log(`\n🏁 FormData tests completed. Success: ${success ? '✅' : '❌'}`);
  
  if (!success) {
    console.log('\n🔍 All FormData methods failed. This suggests:');
    console.log('1. Server-side issue with request processing');
    console.log('2. Multer configuration problem');
    console.log('3. Deployment version mismatch');
    console.log('4. Network/proxy issue with multipart data');
  }
  
  return success;
}

runFormDataTests().catch(error => {
  console.error('\n💥 FormData test crashed:', error);
  process.exit(1);
});