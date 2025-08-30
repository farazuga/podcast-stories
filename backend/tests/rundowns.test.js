const request = require('supertest');
const { app } = require('../server');

/**
 * VidPOD Rundown System Test Suite
 * 
 * Comprehensive testing for rundown CRUD operations, permissions,
 * and integration with the main VidPOD system.
 */

describe('VidPOD Rundown System', () => {
  let adminToken, teacherToken, studentToken;
  let testRundownId, testClassId, testSegmentId, testTalentId;

  // Test credentials
  const testCredentials = {
    admin: { email: 'admin@vidpod.com', password: 'vidpod' },
    teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
    student: { email: 'student@vidpod.com', password: 'vidpod' }
  };

  beforeAll(async () => {
    // Get authentication tokens
    adminToken = await getTestToken(testCredentials.admin);
    teacherToken = await getTestToken(testCredentials.teacher);
    studentToken = await getTestToken(testCredentials.student);
  });

  // Helper function to get authentication token
  async function getTestToken(credentials) {
    const response = await request(app)
      .post('/api/auth/login')
      .send(credentials);
    
    if (response.status === 200 && response.body.token) {
      return response.body.token;
    }
    throw new Error(`Failed to get token for ${credentials.email}: ${response.body.error}`);
  }

  describe('Authentication & Authorization', () => {
    test('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/rundowns');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('token');
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/rundowns')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
    });

    test('should accept requests with valid admin token', async () => {
      const response = await request(app)
        .get('/api/rundowns')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should accept requests with valid teacher token', async () => {
      const response = await request(app)
        .get('/api/rundowns')
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should accept requests with valid student token', async () => {
      const response = await request(app)
        .get('/api/rundowns')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Rundown CRUD Operations', () => {
    test('should create a new rundown with valid data', async () => {
      const rundownData = {
        title: 'Test Episode: API Integration',
        description: 'Testing rundown creation via API',
        scheduled_date: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/rundowns')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(rundownData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(rundownData.title);
      expect(response.body.status).toBe('draft');
      
      testRundownId = response.body.id;
    });

    test('should enforce title requirement', async () => {
      const response = await request(app)
        .post('/api/rundowns')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ description: 'No title provided' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    test('should get rundown list with metadata', async () => {
      const response = await request(app)
        .get('/api/rundowns')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const rundown = response.body[0];
        expect(rundown).toHaveProperty('id');
        expect(rundown).toHaveProperty('title');
        expect(rundown).toHaveProperty('segment_count');
        expect(rundown).toHaveProperty('talent_count');
        expect(rundown).toHaveProperty('story_count');
      }
    });

    test('should get specific rundown with full details', async () => {
      const response = await request(app)
        .get(`/api/rundowns/${testRundownId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testRundownId);
      expect(response.body).toHaveProperty('segments');
      expect(response.body).toHaveProperty('talent');
      expect(response.body).toHaveProperty('stories');
      expect(Array.isArray(response.body.segments)).toBe(true);
    });

    test('should update rundown properties', async () => {
      const updateData = {
        title: 'Updated Test Episode',
        description: 'Updated description',
        status: 'in_progress'
      };

      const response = await request(app)
        .put(`/api/rundowns/${testRundownId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.status).toBe(updateData.status);
    });

    test('should prevent unauthorized users from editing rundowns', async () => {
      const response = await request(app)
        .put(`/api/rundowns/${testRundownId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Unauthorized edit attempt' });

      expect(response.status).toBe(403);
    });

    test('should handle non-existent rundown requests', async () => {
      const response = await request(app)
        .get('/api/rundowns/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Segment Management', () => {
    test('should add segment to rundown', async () => {
      const segmentData = {
        rundown_id: testRundownId,
        title: 'Test Interview Segment',
        type: 'interview',
        duration: 600,
        order_index: 1,
        content: {
          questions: [
            'What inspired your work?',
            'How do you see the future?'
          ],
          notes: 'Keep conversational tone'
        }
      };

      const response = await request(app)
        .post('/api/rundown-segments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(segmentData);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(segmentData.title);
      expect(response.body.type).toBe(segmentData.type);
      expect(response.body.content).toEqual(segmentData.content);
      
      testSegmentId = response.body.id;
    });

    test('should validate segment type', async () => {
      const invalidSegmentData = {
        rundown_id: testRundownId,
        title: 'Invalid Segment',
        type: 'invalid_type',
        duration: 300
      };

      const response = await request(app)
        .post('/api/rundown-segments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(invalidSegmentData);

      expect(response.status).toBe(400);
    });

    test('should get segments for rundown', async () => {
      const response = await request(app)
        .get(`/api/rundown-segments/${testRundownId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should update segment content', async () => {
      const updateData = {
        title: 'Updated Interview Segment',
        duration: 720,
        content: {
          questions: [
            'What inspired your work?',
            'How do you see the future?',
            'Any advice for students?'
          ],
          notes: 'Updated notes with additional question'
        }
      };

      const response = await request(app)
        .put(`/api/rundown-segments/${testSegmentId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.duration).toBe(updateData.duration);
    });
  });

  describe('Talent Management', () => {
    test('should add talent to rundown', async () => {
      const talentData = {
        rundown_id: testRundownId,
        name: 'Dr. Jane Smith',
        role: 'expert',
        bio: 'Leading researcher in environmental science',
        contact_info: {
          email: 'jane.smith@university.edu',
          phone: '+1-555-0123'
        },
        notes: 'Available Tuesday afternoons'
      };

      const response = await request(app)
        .post('/api/rundown-talent')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(talentData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(talentData.name);
      expect(response.body.role).toBe(talentData.role);
      expect(response.body.contact_info).toEqual(talentData.contact_info);
      
      testTalentId = response.body.id;
    });

    test('should validate talent role', async () => {
      const invalidTalentData = {
        rundown_id: testRundownId,
        name: 'Invalid Role Person',
        role: 'invalid_role'
      };

      const response = await request(app)
        .post('/api/rundown-talent')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(invalidTalentData);

      expect(response.status).toBe(400);
    });

    test('should enforce 4 talent limit', async () => {
      // Add 3 more talent to reach limit
      const talentPromises = [];
      for (let i = 2; i <= 4; i++) {
        const talentData = {
          rundown_id: testRundownId,
          name: `Test Person ${i}`,
          role: 'guest'
        };
        talentPromises.push(
          request(app)
            .post('/api/rundown-talent')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send(talentData)
        );
      }
      
      await Promise.all(talentPromises);

      // Try to add 5th talent - should fail
      const fifthTalentData = {
        rundown_id: testRundownId,
        name: 'Fifth Person',
        role: 'guest'
      };

      const response = await request(app)
        .post('/api/rundown-talent')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(fifthTalentData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Maximum');
    });

    test('should prevent duplicate names in same rundown', async () => {
      const duplicateData = {
        rundown_id: testRundownId,
        name: 'Dr. Jane Smith', // Same name as earlier
        role: 'host'
      };

      const response = await request(app)
        .post('/api/rundown-talent')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(duplicateData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    test('should get talent grouped by role', async () => {
      const response = await request(app)
        .get(`/api/rundown-talent/rundown/${testRundownId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should update talent information', async () => {
      const updateData = {
        bio: 'Updated: Leading researcher with 15 years experience',
        contact_info: {
          email: 'jane.smith@university.edu',
          phone: '+1-555-0123',
          linkedin: 'linkedin.com/in/janesmith'
        }
      };

      const response = await request(app)
        .put(`/api/rundown-talent/${testTalentId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.bio).toBe(updateData.bio);
      expect(response.body.contact_info.linkedin).toBe(updateData.contact_info.linkedin);
    });

    test('should get talent statistics', async () => {
      const response = await request(app)
        .get(`/api/rundown-talent/stats/${testRundownId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('by_role');
      expect(response.body).toHaveProperty('remaining_slots');
      expect(response.body.total).toBe(4); // Should be at limit
      expect(response.body.remaining_slots).toBe(0);
    });
  });

  describe('Story Integration', () => {
    let testStoryId;

    beforeAll(async () => {
      // Create a test story to link to rundown
      const storyData = {
        idea_title: 'Test Story for Rundown Integration',
        idea_description: 'A test story to validate rundown integration',
        coverage_start_date: new Date().toISOString(),
        coverage_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const storyResponse = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(storyData);

      if (storyResponse.status === 201) {
        testStoryId = storyResponse.body.story.id;
      }
    });

    test('should link story to rundown', async () => {
      if (!testStoryId) {
        pending('No test story available');
        return;
      }

      const linkData = {
        rundown_id: testRundownId,
        story_id: testStoryId,
        order_index: 1,
        notes: 'Focus on environmental impact'
      };

      const response = await request(app)
        .post('/api/rundown-stories')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(linkData);

      expect(response.status).toBe(201);
      expect(response.body.story_id).toBe(testStoryId);
      expect(response.body.rundown_id).toBe(testRundownId);
    });

    test('should prevent duplicate story links', async () => {
      if (!testStoryId) {
        pending('No test story available');
        return;
      }

      const duplicateData = {
        rundown_id: testRundownId,
        story_id: testStoryId
      };

      const response = await request(app)
        .post('/api/rundown-stories')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(duplicateData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already');
    });

    test('should get stories linked to rundown', async () => {
      const response = await request(app)
        .get(`/api/rundown-stories/${testRundownId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Role-Based Permissions', () => {
    test('admin should see all rundowns', async () => {
      const response = await request(app)
        .get('/api/rundowns')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // Admin should see rundowns from all users
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('teacher should see only own rundowns', async () => {
      const response = await request(app)
        .get('/api/rundowns')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // All returned rundowns should be created by this teacher
      response.body.forEach(rundown => {
        expect(rundown.creator_name).toBe('Demo Teacher');
      });
    });

    test('students should see rundowns from enrolled classes', async () => {
      const response = await request(app)
        .get('/api/rundowns')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Students may see 0 rundowns if not enrolled in classes with shared rundowns
    });

    test('only creator can delete rundown', async () => {
      const response = await request(app)
        .delete(`/api/rundowns/${testRundownId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });

    test('admin can delete any rundown', async () => {
      const response = await request(app)
        .delete(`/api/rundowns/${testRundownId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('archived');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/rundowns')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    test('should handle missing required fields gracefully', async () => {
      const response = await request(app)
        .post('/api/rundowns')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle database constraint violations', async () => {
      // Try to create segment with invalid rundown_id
      const response = await request(app)
        .post('/api/rundown-segments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          rundown_id: 99999,
          title: 'Invalid Segment',
          type: 'story'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Performance & Data Integrity', () => {
    test('should handle concurrent rundown creation', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/rundowns')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({
              title: `Concurrent Test Rundown ${i}`,
              description: `Testing concurrent creation ${i}`
            })
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
      });

      // Clean up
      for (const response of responses) {
        if (response.body.id) {
          await request(app)
            .delete(`/api/rundowns/${response.body.id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        }
      }
    });

    test('should maintain data consistency with cascading deletes', async () => {
      // Create rundown with segments and talent
      const rundownResponse = await request(app)
        .post('/api/rundowns')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Cascade Test Rundown',
          description: 'Testing cascading deletes'
        });

      const rundownId = rundownResponse.body.id;

      // Add segment
      await request(app)
        .post('/api/rundown-segments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          rundown_id: rundownId,
          title: 'Test Segment',
          type: 'story'
        });

      // Add talent
      await request(app)
        .post('/api/rundown-talent')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          rundown_id: rundownId,
          name: 'Test Person',
          role: 'host'
        });

      // Delete rundown - should cascade
      const deleteResponse = await request(app)
        .delete(`/api/rundowns/${rundownId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);

      // Verify segments and talent are also removed
      const segmentsResponse = await request(app)
        .get(`/api/rundown-segments/${rundownId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(segmentsResponse.status).toBe(404);
    });
  });

  afterAll(async () => {
    // Cleanup any remaining test data
    console.log('Rundown tests completed. Test data cleanup handled by cascading deletes.');
  });
});

module.exports = {
  testCredentials
};