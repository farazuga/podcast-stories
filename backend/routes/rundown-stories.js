const express = require('express');
const { Pool } = require('pg');
const { verifyToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper function to check if user can edit rundown stories
const checkStoryAccess = async (rundownId, userId, userRole) => {
  const query = `
    SELECT r.*, c.teacher_id
    FROM rundowns r
    LEFT JOIN classes c ON r.class_id = c.id
    WHERE r.id = $1
  `;
  const result = await pool.query(query, [rundownId]);
  
  if (result.rows.length === 0) {
    return { allowed: false, rundown: null };
  }
  
  const rundown = result.rows[0];
  
  // Admin can edit any stories
  if (userRole === 'amitrace_admin') {
    return { allowed: true, rundown };
  }
  
  // Creator can edit their stories
  if (rundown.created_by === userId) {
    return { allowed: true, rundown };
  }
  
  // Teacher can edit stories in their classes
  if (userRole === 'teacher' && rundown.teacher_id === userId) {
    return { allowed: true, rundown };
  }
  
  return { allowed: false, rundown };
};

// Get stories available for integration (browse stories)
router.get('/available', verifyToken, async (req, res) => {
  try {
    const { search, tags, interviewee, limit = 50, offset = 0 } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    
    let query = `
      SELECT 
        s.*, 
        COALESCE(u.name, u.email) as uploaded_by_name,
        COALESCE(array_agg(DISTINCT t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL), '{}') as tags,
        COALESCE(array_agg(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL), '{}') as interviewees,
        COUNT(DISTINCT uf.id) as favorite_count
      FROM story_ideas s
      LEFT JOIN users u ON s.uploaded_by = u.id
      LEFT JOIN story_tags st ON s.id = st.story_id
      LEFT JOIN tags t ON st.tag_id = t.id
      LEFT JOIN story_interviewees si ON s.id = si.story_id
      LEFT JOIN interviewees i ON si.interviewee_id = i.id
      LEFT JOIN user_favorites uf ON s.id = uf.story_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Role-based filtering (same as stories.js)
    if (userRole === 'amitrace_admin') {
      // Admin sees all approved stories
      query += ` AND s.approval_status = 'approved'`;
    } else if (userRole === 'teacher') {
      // Teachers see approved stories and their own
      query += ` AND (s.approval_status = 'approved' OR s.uploaded_by = $${++paramCount})`;
      params.push(userId);
    } else {
      // Students see approved stories and their own
      query += ` AND (s.approval_status = 'approved' OR s.uploaded_by = $${++paramCount})`;
      params.push(userId);
    }
    
    // Search filters
    if (search) {
      query += ` AND (s.idea_title ILIKE $${++paramCount} OR s.idea_description ILIKE $${++paramCount})`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query += ` AND t.tag_name = ANY($${++paramCount})`;
      params.push(tagArray);
    }
    
    if (interviewee) {
      query += ` AND i.name ILIKE $${++paramCount}`;
      params.push(`%${interviewee}%`);
    }
    
    query += ` GROUP BY s.id, u.name, u.email`;
    query += ` ORDER BY s.uploaded_date DESC`;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching available stories:', error);
    res.status(500).json({ error: 'Failed to fetch available stories' });
  }
});

// Get stories integrated into a specific rundown
router.get('/rundown/:rundownId', verifyToken, async (req, res) => {
  try {
    const rundownId = req.params.rundownId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check if user can view this rundown
    const accessQuery = `
      SELECT r.*, c.teacher_id
      FROM rundowns r
      LEFT JOIN classes c ON r.class_id = c.id
      WHERE r.id = $1
    `;
    const accessResult = await pool.query(accessQuery, [rundownId]);
    
    if (accessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rundown not found' });
    }
    
    const rundown = accessResult.rows[0];
    let canView = false;
    
    if (userRole === 'amitrace_admin') {
      canView = true;
    } else if (rundown.created_by === userId) {
      canView = true;
    } else if (userRole === 'teacher' && rundown.teacher_id === userId) {
      canView = true;
    } else if (userRole === 'student' && rundown.share_with_class) {
      const classCheck = await pool.query(
        'SELECT 1 FROM user_classes WHERE user_id = $1 AND class_id = $2',
        [userId, rundown.class_id]
      );
      canView = classCheck.rows.length > 0;
    }
    
    if (!canView) {
      return res.status(403).json({ error: 'Access denied to this rundown' });
    }
    
    const storiesQuery = `
      SELECT 
        rs.*,
        COALESCE(u.name, u.email) as added_by_name,
        seg.title as segment_title
      FROM rundown_stories rs
      LEFT JOIN users u ON rs.added_by = u.id
      LEFT JOIN rundown_segments seg ON rs.segment_id = seg.id
      WHERE rs.rundown_id = $1
      ORDER BY rs.added_at ASC
    `;
    
    const result = await pool.query(storiesQuery, [rundownId]);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching rundown stories:', error);
    res.status(500).json({ error: 'Failed to fetch rundown stories' });
  }
});

// Add story to rundown
router.post('/rundown/:rundownId', verifyToken, async (req, res) => {
  try {
    const rundownId = req.params.rundownId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const access = await checkStoryAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to edit this rundown' });
    }
    
    const { story_id, segment_id, notes } = req.body;
    
    if (!story_id) {
      return res.status(400).json({ error: 'story_id is required' });
    }
    
    // Verify segment belongs to rundown (if specified)
    if (segment_id) {
      const segmentCheck = await pool.query(
        'SELECT 1 FROM rundown_segments WHERE id = $1 AND rundown_id = $2',
        [segment_id, rundownId]
      );
      
      if (segmentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid segment_id for this rundown' });
      }
    }
    
    // Get original story with all related data
    const storyQuery = `
      SELECT 
        s.*,
        COALESCE(array_agg(DISTINCT t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL), '{}') as tags,
        COALESCE(array_agg(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL), '{}') as interviewees
      FROM story_ideas s
      LEFT JOIN story_tags st ON s.id = st.story_id
      LEFT JOIN tags t ON st.tag_id = t.id
      LEFT JOIN story_interviewees si ON s.id = si.story_id
      LEFT JOIN interviewees i ON si.interviewee_id = i.id
      WHERE s.id = $1
      GROUP BY s.id
    `;
    
    const storyResult = await pool.query(storyQuery, [story_id]);
    
    if (storyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    const story = storyResult.rows[0];
    
    // Check if user can access this story
    if (userRole !== 'amitrace_admin' && 
        story.approval_status !== 'approved' && 
        story.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Access denied to this story' });
    }
    
    // Check if story is already integrated into this rundown
    const duplicateCheck = await pool.query(
      'SELECT 1 FROM rundown_stories WHERE rundown_id = $1 AND original_story_id = $2',
      [rundownId, story_id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Story is already integrated into this rundown' });
    }
    
    // Prepare questions array from story
    const questions = [];
    for (let i = 1; i <= 6; i++) {
      const question = story[`question_${i}`];
      if (question && question.trim()) {
        questions.push(question.trim());
      }
    }
    
    // Insert integrated story
    const insertQuery = `
      INSERT INTO rundown_stories (
        rundown_id, segment_id, original_story_id, story_title, story_description,
        questions, interviewees, tags, notes, added_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      rundownId,
      segment_id,
      story_id,
      story.idea_title,
      story.idea_description,
      JSON.stringify(questions),
      JSON.stringify(story.interviewees),
      JSON.stringify(story.tags),
      notes || null,
      userId
    ]);
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Error adding story to rundown:', error);
    res.status(500).json({ error: 'Failed to add story to rundown' });
  }
});

// Update integrated story
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const storyIntegrationId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get integration details
    const integrationQuery = 'SELECT rundown_id, segment_id FROM rundown_stories WHERE id = $1';
    const integrationResult = await pool.query(integrationQuery, [storyIntegrationId]);
    
    if (integrationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Story integration not found' });
    }
    
    const integration = integrationResult.rows[0];
    const rundownId = integration.rundown_id;
    
    const access = await checkStoryAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to edit this story integration' });
    }
    
    const { segment_id, notes, questions, story_title, story_description } = req.body;
    
    // Verify segment belongs to rundown (if specified)
    if (segment_id && segment_id !== integration.segment_id) {
      const segmentCheck = await pool.query(
        'SELECT 1 FROM rundown_segments WHERE id = $1 AND rundown_id = $2',
        [segment_id, rundownId]
      );
      
      if (segmentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid segment_id for this rundown' });
      }
    }
    
    const updateQuery = `
      UPDATE rundown_stories 
      SET segment_id = COALESCE($1, segment_id),
          notes = COALESCE($2, notes),
          questions = COALESCE($3, questions),
          story_title = COALESCE($4, story_title),
          story_description = COALESCE($5, story_description)
      WHERE id = $6
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      segment_id,
      notes,
      questions ? JSON.stringify(questions) : null,
      story_title,
      story_description,
      storyIntegrationId
    ]);
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error updating story integration:', error);
    res.status(500).json({ error: 'Failed to update story integration' });
  }
});

// Remove story from rundown
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const storyIntegrationId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get integration details
    const integrationQuery = 'SELECT rundown_id FROM rundown_stories WHERE id = $1';
    const integrationResult = await pool.query(integrationQuery, [storyIntegrationId]);
    
    if (integrationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Story integration not found' });
    }
    
    const rundownId = integrationResult.rows[0].rundown_id;
    
    const access = await checkStoryAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to edit this story integration' });
    }
    
    await pool.query('DELETE FROM rundown_stories WHERE id = $1', [storyIntegrationId]);
    
    res.json({ message: 'Story removed from rundown successfully' });
    
  } catch (error) {
    console.error('Error removing story from rundown:', error);
    res.status(500).json({ error: 'Failed to remove story from rundown' });
  }
});

// Export rundown as PDF
router.get('/rundown/:rundownId/export/pdf', verifyToken, async (req, res) => {
  try {
    const rundownId = req.params.rundownId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check if user can view this rundown
    const accessQuery = `
      SELECT r.*, c.class_name, c.subject, COALESCE(u.name, u.email) as created_by_name
      FROM rundowns r
      LEFT JOIN classes c ON r.class_id = c.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = $1
    `;
    const accessResult = await pool.query(accessQuery, [rundownId]);
    
    if (accessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rundown not found' });
    }
    
    const rundown = accessResult.rows[0];
    let canView = false;
    
    if (userRole === 'amitrace_admin') {
      canView = true;
    } else if (rundown.created_by === userId) {
      canView = true;
    } else if (userRole === 'teacher') {
      // Check if teacher owns the class
      const teacherCheck = await pool.query(
        'SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2',
        [rundown.class_id, userId]
      );
      canView = teacherCheck.rows.length > 0;
    } else if (userRole === 'student' && rundown.share_with_class) {
      const classCheck = await pool.query(
        'SELECT 1 FROM user_classes WHERE user_id = $1 AND class_id = $2',
        [userId, rundown.class_id]
      );
      canView = classCheck.rows.length > 0;
    }
    
    if (!canView) {
      return res.status(403).json({ error: 'Access denied to this rundown' });
    }
    
    // Get all rundown data
    const [segmentsResult, talentResult, storiesResult] = await Promise.all([
      pool.query('SELECT * FROM rundown_segments WHERE rundown_id = $1 ORDER BY sort_order ASC', [rundownId]),
      pool.query('SELECT * FROM rundown_talent WHERE rundown_id = $1 ORDER BY role ASC, sort_order ASC', [rundownId]),
      pool.query('SELECT rs.*, seg.title as segment_title FROM rundown_stories rs LEFT JOIN rundown_segments seg ON rs.segment_id = seg.id WHERE rs.rundown_id = $1 ORDER BY rs.added_at ASC', [rundownId])
    ]);
    
    // Create PDF
    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rundown-${rundown.show_name.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Header with VidPOD branding
    doc.fontSize(20).font('Helvetica-Bold').text('VidPOD Rundown', { align: 'center' });
    doc.moveDown();
    
    // Rundown details
    doc.fontSize(16).font('Helvetica-Bold').text(rundown.show_name);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Air Date: ${new Date(rundown.air_date).toLocaleDateString()}`);
    doc.text(`Target Duration: ${Math.floor(rundown.target_duration / 60)}:${(rundown.target_duration % 60).toString().padStart(2, '0')}`);
    if (rundown.class_name) doc.text(`Class: ${rundown.class_name}`);
    doc.text(`Created by: ${rundown.created_by_name}`);
    doc.moveDown();
    
    // Talent
    const hosts = talentResult.rows.filter(t => t.role === 'host');
    const guests = talentResult.rows.filter(t => t.role === 'guest');
    
    if (hosts.length > 0 || guests.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Talent');
      if (hosts.length > 0) {
        doc.fontSize(12).font('Helvetica').text(`Hosts: ${hosts.map(h => h.name).join(', ')}`);
      }
      if (guests.length > 0) {
        doc.fontSize(12).font('Helvetica').text(`Guests: ${guests.map(g => g.name).join(', ')}`);
      }
      doc.moveDown();
    }
    
    // Segments
    doc.fontSize(14).font('Helvetica-Bold').text('Segments');
    doc.moveDown(0.5);
    
    let totalDuration = 0;
    
    for (const segment of segmentsResult.rows) {
      totalDuration += segment.duration;
      
      doc.fontSize(12).font('Helvetica-Bold').text(`${segment.title} (${Math.floor(segment.duration / 60)}:${(segment.duration % 60).toString().padStart(2, '0')}) - ${segment.status}`);
      
      const content = segment.content || {};
      
      if (content.intro) {
        doc.fontSize(10).font('Helvetica').text(`Intro: ${content.intro}`);
      }
      
      if (content.questions && Array.isArray(content.questions)) {
        const questions = content.questions.filter(q => q && q.trim());
        if (questions.length > 0) {
          doc.text('Questions:');
          questions.forEach((q, i) => {
            doc.text(`${i + 1}. ${q}`);
          });
        }
      }
      
      if (content.close) {
        doc.text(`Close: ${content.close}`);
      }
      
      if (content.notes) {
        doc.text(`Notes: ${content.notes}`);
      }
      
      // Show integrated stories for this segment
      const segmentStories = storiesResult.rows.filter(s => s.segment_id === segment.id);
      if (segmentStories.length > 0) {
        doc.text('Integrated Stories:');
        segmentStories.forEach(story => {
          doc.text(`• ${story.story_title}`);
          if (story.notes) doc.text(`  Notes: ${story.notes}`);
        });
      }
      
      doc.moveDown();
    }
    
    // Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Summary');
    doc.fontSize(12).font('Helvetica');
    doc.text(`Total Duration: ${Math.floor(totalDuration / 60)}:${(totalDuration % 60).toString().padStart(2, '0')}`);
    
    const timeDiff = totalDuration - rundown.target_duration;
    if (timeDiff > 0) {
      doc.text(`Over target by: ${Math.floor(timeDiff / 60)}:${(timeDiff % 60).toString().padStart(2, '0')}`);
    } else if (timeDiff < 0) {
      doc.text(`Under target by: ${Math.floor(Math.abs(timeDiff) / 60)}:${(Math.abs(timeDiff) % 60).toString().padStart(2, '0')}`);
    } else {
      doc.text('On target duration');
    }
    
    // Footer
    doc.fontSize(8).text(`Generated by VidPOD on ${new Date().toLocaleString()}`, { align: 'center' });
    
    doc.end();
    
  } catch (error) {
    console.error('Error exporting rundown PDF:', error);
    res.status(500).json({ error: 'Failed to export rundown as PDF' });
  }
});

module.exports = router;