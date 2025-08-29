// Test Courses API After Schema Migration
// Purpose: Verify courses API functionality after database fixes
// Usage: node test-courses-api.js

const jwt = require('jsonwebtoken');
const https = require('https');
const http = require('http');

// Create test token
const JWT_SECRET = process.env.JWT_SECRET || 'vidpod_jwt_secret_key';
const testToken = jwt.sign(
  { id: 1, email: 'admin@vidpod.com', role: 'amitrace_admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('🔑 Generated test token for API testing');

// Test endpoints
const API_BASE = 'http://localhost:3001/api';
const endpoints = [
  { method: 'GET', path: '/courses', description: 'List all courses' },
  { method: 'GET', path: '/schools', description: 'List all schools' },
];

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, isRaw: true });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testCourseAPI() {
  console.log('🧪 Testing Courses API after schema migration...\n');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing ${endpoint.method} ${endpoint.path}`);
      console.log(`   Description: ${endpoint.description}`);
      
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: `/api${endpoint.path}`,
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`
        }
      };
      
      const result = await makeRequest(options);
      
      if (result.status === 200) {
        console.log(`   ✅ Success (${result.status})`);
        if (Array.isArray(result.data)) {
          console.log(`   📊 Returned ${result.data.length} records`);
          if (result.data.length > 0) {
            console.log(`   🔍 Sample fields:`, Object.keys(result.data[0]).join(', '));
          }
        } else if (result.data.message) {
          console.log(`   📄 Message: ${result.data.message}`);
        }
      } else {
        console.log(`   ❌ Failed (${result.status})`);
        console.log(`   💬 Response: ${result.isRaw ? result.data : JSON.stringify(result.data)}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for spacing
  }
  
  // Test course creation with new schema
  console.log('🆕 Testing course creation with new schema fields...');
  
  const newCourse = {
    course_name: 'Test Course - Schema Migration',
    subject: 'Computer Science',
    description: 'Testing new schema fields after migration',
    total_weeks: 12,
    difficulty_level: 'intermediate',
    prerequisites: '["Basic Programming", "Mathematics"]',
    enrollment_limit: 25,
    teacher_id: 1,
    school_id: 1
  };
  
  try {
    const createOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/courses',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: newCourse
    };
    
    const createResult = await makeRequest(createOptions);
    
    if (createResult.status === 201) {
      console.log('   ✅ Course creation successful');
      console.log('   📊 Created course ID:', createResult.data.course?.id);
      console.log('   🔍 New schema fields applied:', 
        createResult.data.course?.total_weeks ? '✅ total_weeks' : '❌ total_weeks',
        createResult.data.course?.difficulty_level ? '✅ difficulty_level' : '❌ difficulty_level'
      );
    } else {
      console.log('   ❌ Course creation failed');
      console.log('   💬 Response:', JSON.stringify(createResult.data));
    }
  } catch (error) {
    console.log('   ❌ Course creation error:', error.message);
  }
  
  console.log('\n🏁 API testing completed');
}

// Run if called directly
if (require.main === module) {
  testCourseAPI().catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  });
}

module.exports = { testCourseAPI };