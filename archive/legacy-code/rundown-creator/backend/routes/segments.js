const express = require('express');
const router = express.Router();
const { safeQuery, withTransaction } = require('../db/connection');

/**
 * Segment Management API Routes
 * 
 * Handles CRUD operations for rundown segments including
 * drag-drop reordering and duration calculations.
 */

// Helper function to check rundown ownership for segment operations
const checkSegmentAccess = async (segmentId, userId, userRole) => {
  const result = await safeQuery(`
    SELECT s.*, r.created_by, r.class_id, r.status
    FROM rundown_app_segments s
    JOIN rundown_app_rundowns r ON s.rundown_id = r.id
    WHERE s.id = $1
  `, [segmentId]);
  
  if (result.rows.length === 0) {
    return { exists: false };
  }
  
  const segment = result.rows[0];
  const isOwner = segment.created_by === userId;
  const isAdmin = userRole === 'amitrace_admin';
  
  // Teachers can edit segments from their students
  let isTeacher = false;
  if (userRole === 'teacher' && segment.class_id) {
    const classCheck = await safeQuery(
      'SELECT teacher_id FROM classes WHERE id = $1',
      [segment.class_id]
    );
    isTeacher = classCheck.rows.length > 0 && classCheck.rows[0].teacher_id === userId;
  }
  
  return {
    exists: true,
    segment,
    canEdit: isOwner || isAdmin,
    canReorder: isOwner || isAdmin || isTeacher,
    isOwner,
    isAdmin,
    isTeacher
  };
};

// Helper function to check rundown access for segment creation
const checkRundownAccess = async (rundownId, userId, userRole) => {
  const result = await safeQuery(`
    SELECT created_by, class_id, status
    FROM rundown_app_rundowns
    WHERE id = $1
  `, [rundownId]);
  
  if (result.rows.length === 0) {
    return { exists: false };
  }
  
  const rundown = result.rows[0];
  const isOwner = rundown.created_by === userId;
  const isAdmin = userRole === 'amitrace_admin';
  
  return {
    exists: true,
    rundown,
    canEdit: isOwner || isAdmin,
    isOwner,
    isAdmin
  };
};

/**
 * GET /api/segments/:rundownId
 * Get all segments for a rundown
 */
router.get('/:rundownId', async (req, res) => {
  try {
    const rundownId = req.params.rundownId;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check rundown access
    const access = await checkRundownAccess(rundownId, userId, userRole);
    if (!access.exists) {
      return res.status(404).json({ error: 'Rundown not found' });
    }

    // Get segments with optional story details
    const result = await safeQuery(`
      SELECT 
        s.*,
        si.idea_title as story_title,
        si.idea_description as story_description
      FROM rundown_app_segments s
      LEFT JOIN story_ideas si ON s.story_id = si.id
      WHERE s.rundown_id = $1
      ORDER BY s.sort_order ASC
    `, [rundownId]);

    res.json({
      segments: result.rows,
      total_duration: result.rows.reduce((sum, seg) => sum + (seg.duration || 0), 0),
      permissions: {
        can_edit: access.canEdit,
        can_reorder: access.canEdit
      }
    });
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ 
      error: 'Failed to fetch segments',
      details: error.message 
    });
  }
});

/**
 * POST /api/segments/:rundownId
 * Create new segment in rundown
 */
router.post('/:rundownId', async (req, res) => {
  try {
    const rundownId = req.params.rundownId;
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      segment_type,
      title,
      duration = 0,
      notes,
      story_id,
      guest_name,
      is_remote = false,
      script_notes,
      audio_file_url
    } = req.body;

    // Check rundown access
    const access = await checkRundownAccess(rundownId, userId, userRole);
    if (!access.exists) {
      return res.status(404).json({ error: 'Rundown not found' });
    }
    if (!access.canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Validation
    if (!segment_type || !title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Segment type and title are required' });
    }

    const validTypes = ['intro', 'story', 'outro', 'interview', 'break', 'commercial', 'music'];
    if (!validTypes.includes(segment_type)) {
      return res.status(400).json({ 
        error: 'Invalid segment type',
        valid_types: validTypes
      });
    }

    if (duration && (isNaN(duration) || duration < 0)) {
      return res.status(400).json({ error: 'Duration must be a positive number (seconds)' });
    }

    // Get next sort order
    const sortOrderResult = await safeQuery(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM rundown_app_segments WHERE rundown_id = $1',
      [rundownId]
    );
    const nextOrder = sortOrderResult.rows[0].next_order;

    // Verify story exists if provided
    if (story_id) {
      const stories = await req.vidpod.getAvailableStories();
      const storyExists = stories.some(s => s.id === parseInt(story_id));
      if (!storyExists) {
        return res.status(400).json({ error: 'Invalid story ID' });
      }
    }

    // Create segment
    const result = await safeQuery(`
      INSERT INTO rundown_app_segments (
        rundown_id, segment_type, title, duration, notes, sort_order,
        story_id, guest_name, is_remote, script_notes, audio_file_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      rundownId, segment_type, title.trim(), parseInt(duration) || 0, 
      notes?.trim() || null, nextOrder, story_id || null, guest_name?.trim() || null,
      is_remote, script_notes?.trim() || null, audio_file_url?.trim() || null
    ]);

    const newSegment = result.rows[0];

    // Add story details if applicable
    if (story_id) {
      const storyDetails = await req.vidpod.getStoryById(story_id);
      if (storyDetails) {
        newSegment.story_title = storyDetails.idea_title;
        newSegment.story_description = storyDetails.idea_description;
      }
    }

    res.status(201).json({
      message: 'Segment created successfully',
      segment: newSegment
    });
  } catch (error) {
    console.error('Error creating segment:', error);
    res.status(500).json({ 
      error: 'Failed to create segment',
      details: error.message 
    });
  }
});

/**
 * PUT /api/segments/:id
 * Update existing segment
 */
router.put('/:id', async (req, res) => {
  try {
    const segmentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      segment_type,
      title,
      duration,
      notes,
      story_id,
      guest_name,
      is_remote,
      script_notes,
      audio_file_url
    } = req.body;

    // Check access
    const access = await checkSegmentAccess(segmentId, userId, userRole);
    if (!access.exists) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    if (!access.canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Validation
    if (segment_type) {
      const validTypes = ['intro', 'story', 'outro', 'interview', 'break', 'commercial', 'music'];
      if (!validTypes.includes(segment_type)) {
        return res.status(400).json({ 
          error: 'Invalid segment type',
          valid_types: validTypes
        });
      }
    }

    if (title !== undefined && (!title || title.trim().length === 0)) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    if (duration !== undefined && (isNaN(duration) || duration < 0)) {
      return res.status(400).json({ error: 'Duration must be a positive number (seconds)' });
    }

    // Verify story exists if provided
    if (story_id) {
      const stories = await req.vidpod.getAvailableStories();
      const storyExists = stories.some(s => s.id === parseInt(story_id));
      if (!storyExists) {
        return res.status(400).json({ error: 'Invalid story ID' });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (segment_type !== undefined) {
      updateFields.push(`segment_type = $${++paramCount}`);
      updateValues.push(segment_type);
    }
    if (title !== undefined) {
      updateFields.push(`title = $${++paramCount}`);
      updateValues.push(title.trim());
    }
    if (duration !== undefined) {
      updateFields.push(`duration = $${++paramCount}`);
      updateValues.push(parseInt(duration) || 0);
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${++paramCount}`);
      updateValues.push(notes?.trim() || null);
    }
    if (story_id !== undefined) {
      updateFields.push(`story_id = $${++paramCount}`);
      updateValues.push(story_id || null);
    }
    if (guest_name !== undefined) {
      updateFields.push(`guest_name = $${++paramCount}`);
      updateValues.push(guest_name?.trim() || null);
    }
    if (is_remote !== undefined) {
      updateFields.push(`is_remote = $${++paramCount}`);
      updateValues.push(is_remote);
    }
    if (script_notes !== undefined) {
      updateFields.push(`script_notes = $${++paramCount}`);
      updateValues.push(script_notes?.trim() || null);
    }
    if (audio_file_url !== undefined) {
      updateFields.push(`audio_file_url = $${++paramCount}`);
      updateValues.push(audio_file_url?.trim() || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(segmentId);
    const query = `
      UPDATE rundown_app_segments 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await safeQuery(query, updateValues);
    const updatedSegment = result.rows[0];

    // Add story details if applicable
    if (updatedSegment.story_id) {
      const storyDetails = await req.vidpod.getStoryById(updatedSegment.story_id);
      if (storyDetails) {
        updatedSegment.story_title = storyDetails.idea_title;
        updatedSegment.story_description = storyDetails.idea_description;
      }
    }

    res.json({
      message: 'Segment updated successfully',
      segment: updatedSegment
    });
  } catch (error) {
    console.error('Error updating segment:', error);
    res.status(500).json({ 
      error: 'Failed to update segment',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/segments/:id
 * Delete segment
 */
router.delete('/:id', async (req, res) => {
  try {
    const segmentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check access
    const access = await checkSegmentAccess(segmentId, userId, userRole);
    if (!access.exists) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    if (!access.canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const rundownId = access.segment.rundown_id;

    // Delete segment and reorder remaining segments
    await withTransaction(async (client) => {
      // Delete the segment
      await client.query('DELETE FROM rundown_app_segments WHERE id = $1', [segmentId]);
      
      // Reorder remaining segments
      await client.query(`
        UPDATE rundown_app_segments 
        SET sort_order = sort_order - 1 
        WHERE rundown_id = $1 AND sort_order > $2
      `, [rundownId, access.segment.sort_order]);
    });

    res.json({ message: 'Segment deleted successfully' });
  } catch (error) {
    console.error('Error deleting segment:', error);
    res.status(500).json({ 
      error: 'Failed to delete segment',
      details: error.message 
    });
  }
});

/**
 * PUT /api/segments/:rundownId/reorder
 * Reorder segments via drag and drop
 */
router.put('/:rundownId/reorder', async (req, res) => {
  try {
    const rundownId = req.params.rundownId;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { segment_orders } = req.body;

    // Check rundown access
    const access = await checkRundownAccess(rundownId, userId, userRole);
    if (!access.exists) {
      return res.status(404).json({ error: 'Rundown not found' });
    }
    if (!access.canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Validation
    if (!Array.isArray(segment_orders)) {
      return res.status(400).json({ 
        error: 'segment_orders must be an array of {id, sort_order} objects'
      });
    }

    // Verify all segments belong to this rundown
    const segmentIds = segment_orders.map(s => s.id);
    const verifyResult = await safeQuery(`
      SELECT id FROM rundown_app_segments 
      WHERE rundown_id = $1 AND id = ANY($2)
    `, [rundownId, segmentIds]);

    if (verifyResult.rows.length !== segment_orders.length) {
      return res.status(400).json({ 
        error: 'Some segments do not belong to this rundown'
      });
    }

    // Update sort orders in transaction
    await withTransaction(async (client) => {
      for (const item of segment_orders) {
        await client.query(
          'UPDATE rundown_app_segments SET sort_order = $1 WHERE id = $2',
          [item.sort_order, item.id]
        );
      }
    });

    // Get updated segments
    const result = await safeQuery(`
      SELECT * FROM rundown_app_segments 
      WHERE rundown_id = $1 
      ORDER BY sort_order ASC
    `, [rundownId]);

    res.json({
      message: 'Segments reordered successfully',
      segments: result.rows
    });
  } catch (error) {
    console.error('Error reordering segments:', error);
    res.status(500).json({ 
      error: 'Failed to reorder segments',
      details: error.message 
    });
  }
});

/**
 * POST /api/segments/:rundownId/duplicate/:segmentId
 * Duplicate an existing segment
 */
router.post('/:rundownId/duplicate/:segmentId', async (req, res) => {
  try {
    const rundownId = req.params.rundownId;
    const segmentId = req.params.segmentId;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check access
    const access = await checkRundownAccess(rundownId, userId, userRole);
    if (!access.exists) {
      return res.status(404).json({ error: 'Rundown not found' });
    }
    if (!access.canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Get original segment
    const originalResult = await safeQuery(
      'SELECT * FROM rundown_app_segments WHERE id = $1 AND rundown_id = $2',
      [segmentId, rundownId]
    );

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const original = originalResult.rows[0];

    // Get next sort order
    const sortOrderResult = await safeQuery(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM rundown_app_segments WHERE rundown_id = $1',
      [rundownId]
    );
    const nextOrder = sortOrderResult.rows[0].next_order;

    // Create duplicate
    const result = await safeQuery(`
      INSERT INTO rundown_app_segments (
        rundown_id, segment_type, title, duration, notes, sort_order,
        story_id, guest_name, is_remote, script_notes, audio_file_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      rundownId, 
      original.segment_type, 
      `${original.title} (Copy)`,
      original.duration,
      original.notes,
      nextOrder,
      original.story_id,
      original.guest_name,
      original.is_remote,
      original.script_notes,
      original.audio_file_url
    ]);

    res.status(201).json({
      message: 'Segment duplicated successfully',
      segment: result.rows[0]
    });
  } catch (error) {
    console.error('Error duplicating segment:', error);
    res.status(500).json({ 
      error: 'Failed to duplicate segment',
      details: error.message 
    });
  }
});

module.exports = router;