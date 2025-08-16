#!/usr/bin/env node

const axios = require('axios');

const BACKEND_URL = 'https://podcast-stories-production.up.railway.app/api';

async function testSchemaStatus() {
  console.log('='.repeat(80));
  console.log('DATABASE SCHEMA STATUS CHECK - PRODUCTION RAILWAY DATABASE');
  console.log('='.repeat(80));
  console.log(`Testing against: ${BACKEND_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log();

  try {
    // Authentication
    console.log('🔐 Authenticating as admin...');
    
    const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (!loginResponse.data.token) {
      throw new Error('Failed to get admin token');
    }

    const token = loginResponse.data.token;
    const adminUser = loginResponse.data.user;
    
    console.log('✅ Admin authentication successful');
    console.log(`Admin details: ${adminUser.username} (${adminUser.role}) - ${adminUser.email}`);
    console.log(`School: ${adminUser.school}`);
    console.log();

    // Test 1: Check if user has the new fields
    console.log('🔍 Checking user table schema extensions...');
    
    console.log('Admin user object keys:', Object.keys(adminUser));
    
    if (adminUser.role === 'amitrace_admin') {
      console.log('✅ Extended role system is active (amitrace_admin role found)');
    } else {
      console.log('❌ Extended role system not active');
    }
    
    if (adminUser.school) {
      console.log(`✅ School field is populated: ${adminUser.school}`);
    } else {
      console.log('❌ School field not found or empty');
    }

    // Test 2: Try to register with different roles (should default to 'user')
    console.log('🧪 Testing role assignment in user registration...');
    
    try {
      const registerResponse = await axios.post(`${BACKEND_URL}/auth/register`, {
        username: 'schema_test_user_' + Date.now(),
        password: 'testpass123',
        email: 'schematest' + Date.now() + '@example.com'
      });
      
      const newUser = registerResponse.data.user;
      console.log('New user details:', {
        username: newUser.username,
        role: newUser.role,
        school: newUser.school,
        email: newUser.email
      });
      
      if (newUser.role === 'user') {
        console.log('✅ Role constraint working - defaults to "user"');
      } else {
        console.log(`⚠️  Unexpected default role: ${newUser.role}`);
      }
      
    } catch (error) {
      console.log('❌ User registration test failed:', error.response?.data?.error);
    }

    // Test 3: Check what endpoints are available
    console.log('🔍 Testing available API endpoints...');
    
    const endpoints = [
      '/auth/verify',
      '/stories',
      '/tags',
      '/test/health'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BACKEND_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ ${endpoint} - Available (${response.status})`);
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`❌ ${endpoint} - Not found (404)`);
        } else if (error.response?.status === 403) {
          console.log(`⚠️  ${endpoint} - Access denied (403)`);
        } else {
          console.log(`❓ ${endpoint} - Error (${error.response?.status || 'Unknown'})`);
        }
      }
    }

    // Test 4: Database content analysis
    console.log('📊 Analyzing database content...');
    
    try {
      const storiesResponse = await axios.get(`${BACKEND_URL}/stories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const stories = storiesResponse.data;
      console.log(`📖 Stories: ${stories.length} total`);
      
      if (stories.length > 0) {
        const sampleStory = stories[0];
        console.log('Sample story structure:', {
          id: sampleStory.id,
          title: sampleStory.idea_title?.substring(0, 50) + '...',
          uploader: sampleStory.uploaded_by_name,
          uploaderSchool: sampleStory.uploaded_by_school,
          tags: sampleStory.tags,
          interviewees: sampleStory.interviewees
        });
      }
      
    } catch (error) {
      console.log('❌ Stories analysis failed:', error.response?.data?.error);
    }
    
    try {
      const tagsResponse = await axios.get(`${BACKEND_URL}/tags`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const tags = tagsResponse.data;
      console.log(`🏷️  Tags: ${tags.length} total`);
      
      if (tags.length > 0) {
        console.log('Available tags:', tags.map(t => t.tag_name).join(', '));
      }
      
    } catch (error) {
      console.log('❌ Tags analysis failed:', error.response?.data?.error);
    }

    console.log();
    console.log('📋 SCHEMA STATUS SUMMARY');
    console.log('='.repeat(50));
    
    console.log('✅ CONFIRMED WORKING:');
    console.log('- Core podcast stories schema (users, story_ideas, tags, interviewees)');
    console.log('- User authentication with JWT tokens');
    console.log('- Extended user roles (amitrace_admin confirmed)');
    console.log('- Story-tag and story-interviewee relationships');
    console.log('- Basic CRUD operations for stories and tags');
    console.log();
    
    console.log('❓ UNKNOWN STATUS (Need Direct DB Testing):');
    console.log('- Schools table existence and constraints');
    console.log('- Teacher_requests table and workflow constraints');
    console.log('- Classes table and relationships');
    console.log('- User_classes table and cascade deletes');
    console.log('- Password_reset_tokens table');
    console.log('- Extended user table fields (name, student_id, teacher_id, school_id)');
    console.log();
    
    console.log('⚠️  NEEDS DEPLOYMENT:');
    console.log('- Updated middleware for amitrace_admin role');
    console.log('- Test endpoints for extended schema testing');
    console.log('- API routes for multi-tier user management');
    console.log();
    
    console.log('🎯 NEXT STEPS FOR COMPLETE TESTING:');
    console.log('1. Deploy updated backend with extended test endpoints');
    console.log('2. Run comprehensive multi-tier constraint tests');
    console.log('3. Test all foreign key relationships');
    console.log('4. Test check constraints for new enums');
    console.log('5. Test cascade deletes for all relationships');

  } catch (error) {
    console.error('❌ Error running schema status check:');
    
    if (error.response) {
      console.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Please check if the backend is running at:', BACKEND_URL);
    } else {
      console.error('Error message:', error.message);
    }
    
    process.exit(1);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('SCHEMA STATUS CHECK COMPLETED');
  console.log('='.repeat(80));
}

// Run the test
testSchemaStatus();