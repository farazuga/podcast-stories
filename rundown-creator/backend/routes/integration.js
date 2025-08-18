const express = require('express');
const router = express.Router();
const { safeQuery } = require('../db/connection');
const csvWriter = require('csv-writer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Integration API Routes
 * 
 * Handles integration with main VidPOD data (stories, classes)
 * and export functionality (CSV, PDF).
 */

/**
 * GET /api/integration/stories
 * Get available stories from main VidPOD API with caching
 */
router.get('/stories', async (req, res) => {
  try {
    const { search, tags, approved_only = 'true' } = req.query;
    
    // Build filters for story API
    const filters = {};
    if (search) filters.search = search;
    if (tags) filters.tags = tags;
    
    // Get stories from main VidPOD API
    const stories = await req.vidpod.getAvailableStories(filters);
    
    // Filter for approved stories only if requested
    const filteredStories = approved_only === 'true' 
      ? stories.filter(story => story.is_approved)
      : stories;
    
    res.json({
      stories: filteredStories,
      total: filteredStories.length,
      filters: {
        search,
        tags,
        approved_only: approved_only === 'true'
      }
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stories from VidPOD',
      details: error.message 
    });
  }
});

/**
 * GET /api/integration/stories/:id
 * Get specific story details
 */
router.get('/stories/:id', async (req, res) => {
  try {
    const storyId = req.params.id;
    
    const story = await req.vidpod.getStoryById(storyId);
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    res.json(story);
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({ 
      error: 'Failed to fetch story details',
      details: error.message 
    });
  }
});

/**
 * GET /api/integration/classes
 * Get user's classes from main VidPOD API
 */
router.get('/classes', async (req, res) => {
  try {
    const classes = await req.vidpod.getUserClasses();
    
    res.json({
      classes,
      total: classes.length
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch classes from VidPOD',
      details: error.message 
    });
  }
});

/**
 * POST /api/integration/rundowns/:id/stories
 * Add story to rundown
 */
router.post('/rundowns/:id/stories', async (req, res) => {
  try {
    const rundownId = req.params.id;
    const userId = req.user.id;
    const { story_id, notes, questions, segment_id } = req.body;

    if (!story_id) {
      return res.status(400).json({ error: 'story_id is required' });
    }

    // Check rundown ownership
    const rundownResult = await safeQuery(
      'SELECT created_by FROM rundown_app_rundowns WHERE id = $1',
      [rundownId]
    );

    if (rundownResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rundown not found' });
    }

    if (rundownResult.rows[0].created_by !== userId && req.user.role !== 'amitrace_admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Verify story exists
    const story = await req.vidpod.getStoryById(story_id);
    if (!story) {
      return res.status(400).json({ error: 'Invalid story ID' });
    }

    // Check if story already added to this rundown
    const existingResult = await safeQuery(
      'SELECT id FROM rundown_app_stories WHERE rundown_id = $1 AND story_id = $2',
      [rundownId, story_id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Story already added to this rundown' });
    }

    // Verify segment exists if provided
    if (segment_id) {
      const segmentResult = await safeQuery(
        'SELECT id FROM rundown_app_segments WHERE id = $1 AND rundown_id = $2',
        [segment_id, rundownId]
      );
      
      if (segmentResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid segment ID' });
      }
    }

    // Add story to rundown
    const result = await safeQuery(`
      INSERT INTO rundown_app_stories (rundown_id, story_id, segment_id, notes, questions)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [rundownId, story_id, segment_id || null, notes?.trim() || null, questions?.trim() || null]);

    const rundownStory = result.rows[0];
    rundownStory.story_details = story;

    res.status(201).json({
      message: 'Story added to rundown successfully',
      rundown_story: rundownStory
    });
  } catch (error) {
    console.error('Error adding story to rundown:', error);
    res.status(500).json({ 
      error: 'Failed to add story to rundown',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/integration/rundowns/:rundownId/stories/:storyId
 * Remove story from rundown
 */
router.delete('/rundowns/:rundownId/stories/:storyId', async (req, res) => {
  try {
    const rundownId = req.params.rundownId;
    const storyId = req.params.storyId;
    const userId = req.user.id;

    // Check rundown ownership
    const rundownResult = await safeQuery(
      'SELECT created_by FROM rundown_app_rundowns WHERE id = $1',
      [rundownId]
    );

    if (rundownResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rundown not found' });
    }

    if (rundownResult.rows[0].created_by !== userId && req.user.role !== 'amitrace_admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Remove story from rundown
    const result = await safeQuery(
      'DELETE FROM rundown_app_stories WHERE rundown_id = $1 AND story_id = $2 RETURNING *',
      [rundownId, storyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found in this rundown' });
    }

    res.json({ message: 'Story removed from rundown successfully' });
  } catch (error) {
    console.error('Error removing story from rundown:', error);
    res.status(500).json({ 
      error: 'Failed to remove story from rundown',
      details: error.message 
    });
  }
});

/**
 * GET /api/integration/rundowns/:id/export/csv
 * Export rundown as CSV
 */
router.get('/rundowns/:id/export/csv', async (req, res) => {
  try {
    const rundownId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check rundown access
    const rundownResult = await safeQuery(`
      SELECT r.*, u.name as created_by_name, c.class_name
      FROM rundown_app_rundowns r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN classes c ON r.class_id = c.id
      WHERE r.id = $1
    `, [rundownId]);

    if (rundownResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rundown not found' });
    }

    const rundown = rundownResult.rows[0];

    // Check permissions
    const canAccess = rundown.created_by === userId || 
                     userRole === 'amitrace_admin' ||
                     (userRole === 'teacher' && rundown.class_id);

    if (!canAccess) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Get segments with story details
    const segmentsResult = await safeQuery(`
      SELECT 
        s.*,
        si.idea_title as story_title,
        si.idea_description as story_description,
        si.question_1, si.question_2, si.question_3,
        si.question_4, si.question_5, si.question_6
      FROM rundown_app_segments s
      LEFT JOIN story_ideas si ON s.story_id = si.id
      WHERE s.rundown_id = $1
      ORDER BY s.sort_order ASC
    `, [rundownId]);

    // Format duration helper
    const formatDuration = (seconds) => {
      if (!seconds) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Prepare CSV data
    const csvData = segmentsResult.rows.map((segment, index) => ({
      'Order': index + 1,
      'Segment Type': segment.segment_type,
      'Title': segment.title,
      'Duration': formatDuration(segment.duration),
      'Duration (seconds)': segment.duration || 0,
      'Story Title': segment.story_title || '',
      'Story Description': segment.story_description || '',
      'Guest Name': segment.guest_name || '',
      'Remote': segment.is_remote ? 'Yes' : 'No',
      'Notes': segment.notes || '',
      'Script Notes': segment.script_notes || ''
    }));

    // Create temporary CSV file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rundown-${rundownId}-${timestamp}.csv`;
    const tempPath = path.join(__dirname, '../temp', filename);

    // Ensure temp directory exists
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write CSV
    const writer = csvWriter.createObjectCsvWriter({
      path: tempPath,
      header: [
        { id: 'Order', title: 'Order' },
        { id: 'Segment Type', title: 'Segment Type' },
        { id: 'Title', title: 'Title' },
        { id: 'Duration', title: 'Duration' },
        { id: 'Duration (seconds)', title: 'Duration (seconds)' },
        { id: 'Story Title', title: 'Story Title' },
        { id: 'Story Description', title: 'Story Description' },
        { id: 'Guest Name', title: 'Guest Name' },
        { id: 'Remote', title: 'Remote' },
        { id: 'Notes', title: 'Notes' },
        { id: 'Script Notes', title: 'Script Notes' }
      ]
    });

    await writer.writeRecords(csvData);

    // Log analytics
    await safeQuery(`
      INSERT INTO rundown_app_analytics (rundown_id, user_id, action_type, details)
      VALUES ($1, $2, 'exported', $3)
    `, [rundownId, userId, JSON.stringify({ 
      format: 'csv',
      exported_at: new Date().toISOString(),
      segment_count: csvData.length
    })]);

    // Send file
    res.download(tempPath, `${rundown.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`, (err) => {
      if (err) {
        console.error('Error sending CSV file:', err);
      }
      
      // Clean up temp file
      fs.unlink(tempPath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting temp CSV file:', unlinkErr);
        }
      });
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ 
      error: 'Failed to export rundown as CSV',
      details: error.message 
    });
  }
});

/**
 * GET /api/integration/rundowns/:id/export/pdf
 * Export rundown as PDF
 */
router.get('/rundowns/:id/export/pdf', async (req, res) => {
  try {
    const rundownId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check rundown access (same logic as CSV)
    const rundownResult = await safeQuery(`
      SELECT r.*, u.name as created_by_name, c.class_name
      FROM rundown_app_rundowns r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN classes c ON r.class_id = c.id
      WHERE r.id = $1
    `, [rundownId]);

    if (rundownResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rundown not found' });
    }

    const rundown = rundownResult.rows[0];

    // Check permissions
    const canAccess = rundown.created_by === userId || 
                     userRole === 'amitrace_admin' ||
                     (userRole === 'teacher' && rundown.class_id);

    if (!canAccess) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Get segments
    const segmentsResult = await safeQuery(`
      SELECT 
        s.*,
        si.idea_title as story_title,
        si.idea_description as story_description
      FROM rundown_app_segments s
      LEFT JOIN story_ideas si ON s.story_id = si.id
      WHERE s.rundown_id = $1
      ORDER BY s.sort_order ASC
    `, [rundownId]);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    const filename = `${rundown.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Helper function for duration formatting
    const formatDuration = (seconds) => {
      if (!seconds) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // PDF Header
    doc.fontSize(24).font('Helvetica-Bold').text('📻 VidPOD Rundown', { align: 'center' });
    doc.moveDown();
    
    // Rundown details
    doc.fontSize(18).font('Helvetica-Bold').text(rundown.title);
    doc.fontSize(12).font('Helvetica');
    
    if (rundown.description) {
      doc.text(`Description: ${rundown.description}`);
    }
    
    doc.text(`Created by: ${rundown.created_by_name}`);
    doc.text(`Status: ${rundown.status.charAt(0).toUpperCase() + rundown.status.slice(1)}`);
    doc.text(`Total Duration: ${formatDuration(rundown.total_duration)}`);
    doc.text(`Created: ${new Date(rundown.created_at).toLocaleDateString()}`);
    
    if (rundown.class_name) {
      doc.text(`Class: ${rundown.class_name}`);
    }
    
    doc.moveDown(2);

    // Segments
    doc.fontSize(16).font('Helvetica-Bold').text('Segments');
    doc.moveDown();

    let totalDuration = 0;
    segmentsResult.rows.forEach((segment, index) => {
      totalDuration += segment.duration || 0;
      
      doc.fontSize(14).font('Helvetica-Bold').text(`${index + 1}. ${segment.title}`);
      doc.fontSize(10).font('Helvetica');
      
      doc.text(`Type: ${segment.segment_type}`);
      doc.text(`Duration: ${formatDuration(segment.duration)}`);
      
      if (segment.story_title) {
        doc.text(`Story: ${segment.story_title}`);
      }
      
      if (segment.guest_name) {
        doc.text(`Guest: ${segment.guest_name}${segment.is_remote ? ' (Remote)' : ''}`);
      }
      
      if (segment.notes) {
        doc.text(`Notes: ${segment.notes}`);
      }
      
      doc.moveDown();
    });

    // Footer
    doc.fontSize(10).font('Helvetica').text(
      `Generated on ${new Date().toLocaleString()} | VidPOD Rundown Creator`,
      { align: 'center' }
    );

    // Finalize PDF
    doc.end();

    // Log analytics
    await safeQuery(`
      INSERT INTO rundown_app_analytics (rundown_id, user_id, action_type, details)
      VALUES ($1, $2, 'exported', $3)
    `, [rundownId, userId, JSON.stringify({ 
      format: 'pdf',
      exported_at: new Date().toISOString(),
      segment_count: segmentsResult.rows.length
    })]);

  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ 
      error: 'Failed to export rundown as PDF',
      details: error.message 
    });
  }
});

/**
 * GET /api/integration/analytics
 * Get rundown analytics for teachers
 */
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { class_id, date_from, date_to } = req.query;

    if (userRole !== 'teacher' && userRole !== 'amitrace_admin') {
      return res.status(403).json({ error: 'Analytics access restricted to teachers and admins' });
    }

    // Build analytics query based on role
    let baseQuery = `
      SELECT 
        COUNT(DISTINCT r.id) as total_rundowns,
        COUNT(DISTINCT CASE WHEN r.status = 'submitted' THEN r.id END) as pending_review,
        COUNT(DISTINCT CASE WHEN r.status = 'approved' THEN r.id END) as approved,
        COUNT(DISTINCT CASE WHEN r.status = 'rejected' THEN r.id END) as rejected,
        COUNT(DISTINCT r.created_by) as active_students,
        AVG(r.total_duration) as avg_duration,
        COUNT(DISTINCT a.id) as total_actions
      FROM rundown_app_rundowns r
      LEFT JOIN rundown_app_analytics a ON r.id = a.rundown_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    // Role-based filtering
    if (userRole === 'teacher') {
      baseQuery += ` AND r.class_id IN (SELECT id FROM classes WHERE teacher_id = $${++paramCount})`;
      params.push(userId);
    }

    if (class_id) {
      baseQuery += ` AND r.class_id = $${++paramCount}`;
      params.push(class_id);
    }

    if (date_from) {
      baseQuery += ` AND r.created_at >= $${++paramCount}`;
      params.push(date_from);
    }

    if (date_to) {
      baseQuery += ` AND r.created_at <= $${++paramCount}`;
      params.push(date_to);
    }

    const analyticsResult = await safeQuery(baseQuery, params);

    // Get top students by rundown count
    let topStudentsQuery = `
      SELECT 
        u.name,
        u.email,
        COUNT(r.id) as rundown_count,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count
      FROM rundown_app_rundowns r
      JOIN users u ON r.created_by = u.id
      WHERE 1=1
    `;

    const topStudentsParams = [];
    let topStudentsParamCount = 0;

    if (userRole === 'teacher') {
      topStudentsQuery += ` AND r.class_id IN (SELECT id FROM classes WHERE teacher_id = $${++topStudentsParamCount})`;
      topStudentsParams.push(userId);
    }

    if (class_id) {
      topStudentsQuery += ` AND r.class_id = $${++topStudentsParamCount}`;
      topStudentsParams.push(class_id);
    }

    topStudentsQuery += ` GROUP BY u.id, u.name, u.email ORDER BY rundown_count DESC LIMIT 10`;

    const topStudentsResult = await safeQuery(topStudentsQuery, topStudentsParams);

    res.json({
      summary: analyticsResult.rows[0],
      top_students: topStudentsResult.rows,
      filters: {
        class_id,
        date_from,
        date_to
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics',
      details: error.message 
    });
  }
});

module.exports = router;