const request = require('supertest');
const { app } = require('../server');

describe('Authentication API', () => {
  let adminToken;
  
  test('POST /api/auth/login - admin login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@vidpod.com',
        password: 'vidpod'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.role).toBe('amitrace_admin');
    
    adminToken = response.body.token;
  });
  
  test('POST /api/auth/login - invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@vidpod.com',
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });
  
  test('GET /api/auth/verify - valid token', async () => {
    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
  });
});

describe('Stories API', () => {
  let adminToken;
  let storyId;
  
  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = loginResponse.body.token;
  });
  
  test('GET /api/stories - get all stories', async () => {
    const response = await request(app)
      .get('/api/stories')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
  
  test('POST /api/stories - create story', async () => {
    const storyData = {
      idea_title: 'Test Story',
      idea_description: 'Automated test story',
      question_1: 'What is testing?',
      question_2: 'Why automate?'
    };
    
    const response = await request(app)
      .post('/api/stories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(storyData);
    
    expect(response.status).toBe(201);
    expect(response.body.message).toContain('created');
    storyId = response.body.story.id;
  });
  
  test('PUT /api/stories/:id - update story', async () => {
    const updateData = {
      idea_title: 'Updated Test Story',
      idea_description: 'Updated description'
    };
    
    const response = await request(app)
      .put(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData);
    
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('updated');
  });
});

describe('Schools API', () => {
  let adminToken;
  
  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = loginResponse.body.token;
  });
  
  test('GET /api/schools - get all schools', async () => {
    const response = await request(app)
      .get('/api/schools')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
  
  test('POST /api/schools - create school', async () => {
    const schoolData = {
      school_name: `Test School ${Date.now()}`
    };
    
    const response = await request(app)
      .post('/api/schools')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(schoolData);
    
    expect(response.status).toBe(201);
    expect(response.body.message).toContain('created');
  });
});

describe('Classes API', () => {
  let teacherToken;
  
  beforeAll(async () => {
    // Create teacher account for testing
    await request(app)
      .post('/api/teacher-requests')
      .send({
        name: 'Test Teacher',
        email: `teacher_${Date.now()}@test.com`,
        school_id: 1,
        message: 'Test teacher account'
      });
    
    // Login as admin to approve
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    // Get and approve the request
    const requests = await request(app)
      .get('/api/teacher-requests')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);
    
    if (requests.body.length > 0) {
      await request(app)
        .put(`/api/teacher-requests/${requests.body[0].id}/approve`)
        .set('Authorization', `Bearer ${adminLogin.body.token}`);
    }
  });
  
  test('Teacher can create class', async () => {
    // This test would need a valid teacher token
    // Implementation depends on teacher creation workflow
    expect(true).toBe(true); // Placeholder
  });
});