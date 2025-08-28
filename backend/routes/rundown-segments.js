const express = require('express');
const { Pool } = require('pg');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper function to check if user can edit rundown segments
const checkSegmentAccess = async (rundownId, userId, userRole) => {
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
  
  // Admin can edit any segments
  if (userRole === 'amitrace_admin') {
    return { allowed: true, rundown };
  }
  
  // Creator can edit their segments
  if (rundown.created_by === userId) {
    return { allowed: true, rundown };
  }
  
  // Teacher can edit segments in their classes
  if (userRole === 'teacher' && rundown.teacher_id === userId) {
    return { allowed: true, rundown };
  }
  
  // Students cannot edit others' segments
  return { allowed: false, rundown };
};

// Helper function to reorder segments
const reorderSegments = async (client, rundownId, excludeId = null) => {
  const query = excludeId 
    ? 'SELECT id FROM rundown_segments WHERE rundown_id = $1 AND id != $2 ORDER BY sort_order ASC'
    : 'SELECT id FROM rundown_segments WHERE rundown_id = $1 ORDER BY sort_order ASC';
  
  const params = excludeId ? [rundownId, excludeId] : [rundownId];
  const result = await client.query(query, params);
  
  for (let i = 0; i < result.rows.length; i++) {
    await client.query(
      'UPDATE rundown_segments SET sort_order = $1 WHERE id = $2',
      [i, result.rows[i].id]
    );
  }
};

// Get segments for a rundown
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
      // Check if student is in the class
      const classCheck = await pool.query(
        'SELECT 1 FROM user_classes WHERE user_id = $1 AND class_id = $2',
        [userId, rundown.class_id]
      );
      canView = classCheck.rows.length > 0;
    }
    
    if (!canView) {
      return res.status(403).json({ error: 'Access denied to this rundown' });
    }
    
    const segmentsQuery = `
      SELECT * FROM rundown_segments 
      WHERE rundown_id = $1 
      ORDER BY sort_order ASC
    `;
    
    const result = await pool.query(segmentsQuery, [rundownId]);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

// Add segment to rundown
router.post('/rundown/:rundownId', verifyToken, async (req, res) => {
  try {
    const rundownId = req.params.rundownId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const access = await checkSegmentAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to edit this rundown' });
    }
    
    const {
      title,
      duration = 60,
      segment_type = 'segment',
      status = 'Draft',
      content = {},
      insert_after = null // Insert after this segment ID
    } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Segment title is required' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let sortOrder = 1; // Default position
      
      if (insert_after) {
        // Insert after specified segment
        const afterResult = await client.query(
          'SELECT sort_order FROM rundown_segments WHERE id = $1 AND rundown_id = $2',
          [insert_after, rundownId]
        );
        
        if (afterResult.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid insert_after segment' });
        }
        
        sortOrder = afterResult.rows[0].sort_order + 1;
        
        // Shift other segments down
        await client.query(
          'UPDATE rundown_segments SET sort_order = sort_order + 1 WHERE rundown_id = $1 AND sort_order >= $2',
          [rundownId, sortOrder]
        );
      } else {
        // Insert before outro (if exists) or at end
        const maxOrderResult = await client.query(
          'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM rundown_segments WHERE rundown_id = $1 AND segment_type != $2',
          [rundownId, 'outro']
        );
        
        sortOrder = maxOrderResult.rows[0].max_order + 1;
        
        // If there's an outro, shift it down
        await client.query(
          'UPDATE rundown_segments SET sort_order = sort_order + 1 WHERE rundown_id = $1 AND segment_type = $2',
          [rundownId, 'outro']
        );
      }
      
      const insertQuery = `
        INSERT INTO rundown_segments (rundown_id, segment_type, title, duration, sort_order, status, content)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        rundownId,
        segment_type,
        title,
        duration,
        sortOrder,
        status,
        JSON.stringify(content)
      ]);
      
      await client.query('COMMIT');
      
      res.status(201).json(result.rows[0]);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error creating segment:', error);
    res.status(500).json({ error: 'Failed to create segment' });
  }
});

// Update segment
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const segmentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get segment and check access
    const segmentQuery = 'SELECT rundown_id FROM rundown_segments WHERE id = $1';
    const segmentResult = await pool.query(segmentQuery, [segmentId]);
    
    if (segmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    
    const rundownId = segmentResult.rows[0].rundown_id;
    const access = await checkSegmentAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to edit this segment' });
    }
    
    const {
      title,
      duration,
      status,
      content,
      is_expanded
    } = req.body;
    
    const updateQuery = `
      UPDATE rundown_segments 
      SET title = COALESCE($1, title),
          duration = COALESCE($2, duration),
          status = COALESCE($3, status),
          content = COALESCE($4, content),
          is_expanded = COALESCE($5, is_expanded)
      WHERE id = $6
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      title,
      duration,
      status,
      content ? JSON.stringify(content) : null,
      is_expanded,
      segmentId
    ]);
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error updating segment:', error);
    res.status(500).json({ error: 'Failed to update segment' });
  }
});

// Reorder segments
router.put('/rundown/:rundownId/reorder', verifyToken, async (req, res) => {
  try {
    const rundownId = req.params.rundownId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const access = await checkSegmentAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to edit this rundown' });
    }
    
    const { segmentIds } = req.body; // Array of segment IDs in new order
    
    if (!Array.isArray(segmentIds)) {
      return res.status(400).json({ error: 'segmentIds must be an array' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verify all segments belong to this rundown
      const verifyQuery = `
        SELECT id FROM rundown_segments 
        WHERE rundown_id = $1 AND id = ANY($2)
      `;
      const verifyResult = await client.query(verifyQuery, [rundownId, segmentIds]);
      
      if (verifyResult.rows.length !== segmentIds.length) {
        return res.status(400).json({ error: 'Invalid segment IDs provided' });
      }
      
      // Update sort orders
      for (let i = 0; i < segmentIds.length; i++) {
        await client.query(
          'UPDATE rundown_segments SET sort_order = $1 WHERE id = $2',
          [i, segmentIds[i]]
        );
      }
      
      await client.query('COMMIT');
      
      // Return updated segments
      const updatedQuery = `
        SELECT * FROM rundown_segments 
        WHERE rundown_id = $1 
        ORDER BY sort_order ASC
      `;
      const updatedResult = await client.query(updatedQuery, [rundownId]);
      
      res.json(updatedResult.rows);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error reordering segments:', error);
    res.status(500).json({ error: 'Failed to reorder segments' });
  }
});

// Delete segment
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const segmentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get segment and check if it's pinned
    const segmentQuery = 'SELECT rundown_id, is_pinned FROM rundown_segments WHERE id = $1';
    const segmentResult = await pool.query(segmentQuery, [segmentId]);
    
    if (segmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    
    const { rundown_id: rundownId, is_pinned: isPinned } = segmentResult.rows[0];
    
    if (isPinned) {
      return res.status(400).json({ error: 'Cannot delete pinned segments (intro/outro)' });
    }
    
    const access = await checkSegmentAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to edit this segment' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete segment
      await client.query('DELETE FROM rundown_segments WHERE id = $1', [segmentId]);
      
      // Reorder remaining segments
      await reorderSegments(client, rundownId, segmentId);
      
      await client.query('COMMIT');
      
      res.json({ message: 'Segment deleted successfully' });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error deleting segment:', error);
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

// Duplicate segment
router.post('/:id/duplicate', verifyToken, async (req, res) => {
  try {
    const segmentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get original segment
    const segmentQuery = 'SELECT * FROM rundown_segments WHERE id = $1';
    const segmentResult = await pool.query(segmentQuery, [segmentId]);
    
    if (segmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    
    const segment = segmentResult.rows[0];
    const rundownId = segment.rundown_id;
    
    const access = await checkSegmentAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to edit this rundown' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Find insert position (after original segment)
      const insertOrder = segment.sort_order + 1;
      
      // Shift segments down
      await client.query(
        'UPDATE rundown_segments SET sort_order = sort_order + 1 WHERE rundown_id = $1 AND sort_order >= $2',
        [rundownId, insertOrder]
      );
      
      // Create duplicate
      const duplicateQuery = `
        INSERT INTO rundown_segments (rundown_id, segment_type, title, duration, sort_order, status, is_pinned, is_expanded, content)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const result = await client.query(duplicateQuery, [
        rundownId,
        segment.segment_type,
        `${segment.title} (Copy)`,
        segment.duration,
        insertOrder,
        'Draft', // Reset status for duplicate
        false, // Never pin duplicates
        false, // Start collapsed
        segment.content
      ]);
      
      await client.query('COMMIT');
      
      res.status(201).json(result.rows[0]);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error duplicating segment:', error);
    res.status(500).json({ error: 'Failed to duplicate segment' });
  }
});

module.exports = router;