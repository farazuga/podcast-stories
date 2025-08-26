const express = require('express');
const router = express.Router();
const { safeQuery, withTransaction } = require('../db/connection');
const { requireRole } = require('../middleware/auth-proxy');

/**
 * Rundown CRUD API Routes
 * 
 * Handles create, read, update, delete operations for rundowns
 * with proper permissions and business logic enforcement.
 */

// Helper function to check rundown ownership
const checkRundownOwnership = async (rundownId, userId, userRole) => {
  const result = await safeQuery(
    'SELECT created_by, class_id FROM rundown_app_rundowns WHERE id = $1',
    [rundownId]
  );
  
  if (result.rows.length === 0) {
    return { exists: false };
  }
  
  const rundown = result.rows[0];
  const isOwner = rundown.created_by === userId;
  const isAdmin = userRole === 'amitrace_admin';
  
  // Teachers can access rundowns from their students
  let isTeacher = false;
  if (userRole === 'teacher' && rundown.class_id) {
    const classCheck = await safeQuery(
      'SELECT teacher_id FROM classes WHERE id = $1',
      [rundown.class_id]
    );
    isTeacher = classCheck.rows.length > 0 && classCheck.rows[0].teacher_id === userId;
  }
  
  return {
    exists: true,
    rundown,
    canAccess: isOwner || isAdmin || isTeacher,
    canEdit: isOwner || isAdmin,
    isOwner,
    isAdmin,
    isTeacher
  };
};

// Helper function to enforce 99 rundown limit
const checkRundownLimit = async (userId) => {
  const result = await safeQuery(
    'SELECT COUNT(*) as count FROM rundown_app_rundowns WHERE created_by = $1 AND is_archived = false',
    [userId]
  );
  
  const currentCount = parseInt(result.rows[0].count);
  return {
    current: currentCount,
    limit: 99,
    canCreate: currentCount < 99
  };
};

/**
 * GET /api/rundowns
 * Get user's rundowns with filtering options
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      status,
      class_id,
      search,
      archived = 'false',
      limit = 50,
      offset = 0,
      sort = 'updated_at',
      order = 'DESC'
    } = req.query;

    // Build query based on user role
    let baseQuery = `
      SELECT 
        r.*,
        rs.segment_count,
        rs.story_count,
        rs.calculated_duration,
        u.name as created_by_name,
        u.email as created_by_email,
        c.class_name,
        reviewer.name as reviewed_by_name
      FROM rundown_app_rundowns r
      LEFT JOIN rundown_app_rundowns_with_stats rs ON r.id = rs.id
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN classes c ON r.class_id = c.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    // Role-based filtering
    if (userRole === 'student') {
      baseQuery += ` AND r.created_by = $${++paramCount}`;
      params.push(userId);
    } else if (userRole === 'teacher') {
      // Teachers see their own rundowns and their students' rundowns
      baseQuery += ` AND (r.created_by = $${++paramCount} OR r.class_id IN (
        SELECT id FROM classes WHERE teacher_id = $${++paramCount}
      ))`;
      params.push(userId, userId);
    }
    // Admin sees all rundowns (no additional filter)

    // Additional filters
    if (status) {
      baseQuery += ` AND r.status = $${++paramCount}`;
      params.push(status);
    }

    if (class_id) {
      baseQuery += ` AND r.class_id = $${++paramCount}`;
      params.push(class_id);
    }

    if (search) {
      baseQuery += ` AND (r.title ILIKE $${++paramCount} OR r.description ILIKE $${++paramCount})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (archived === 'true') {
      baseQuery += ` AND r.is_archived = true`;
    } else {
      baseQuery += ` AND r.is_archived = false`;
    }

    // Sorting and pagination
    const validSorts = ['title', 'status', 'created_at', 'updated_at', 'total_duration'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSorts.includes(sort) ? sort : 'updated_at';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    baseQuery += ` ORDER BY r.${sortField} ${sortOrder}`;
    baseQuery += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await safeQuery(baseQuery, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM rundown_app_rundowns r
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    // Apply same filters to count query
    if (userRole === 'student') {
      countQuery += ` AND r.created_by = $${++countParamCount}`;
      countParams.push(userId);
    } else if (userRole === 'teacher') {
      countQuery += ` AND (r.created_by = $${++countParamCount} OR r.class_id IN (
        SELECT id FROM classes WHERE teacher_id = $${++countParamCount}
      ))`;
      countParams.push(userId, userId);
    }

    if (status) {
      countQuery += ` AND r.status = $${++countParamCount}`;
      countParams.push(status);
    }

    if (class_id) {
      countQuery += ` AND r.class_id = $${++countParamCount}`;
      countParams.push(class_id);
    }

    if (search) {
      countQuery += ` AND (r.title ILIKE $${++countParamCount} OR r.description ILIKE $${++countParamCount})`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (archived === 'true') {
      countQuery += ` AND r.is_archived = true`;
    } else {
      countQuery += ` AND r.is_archived = false`;
    }

    const countResult = await safeQuery(countQuery, countParams);

    res.json({
      rundowns: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < parseInt(countResult.rows[0].total)
      },
      filters: {
        status,
        class_id,
        search,
        archived,
        sort: sortField,
        order: sortOrder
      }
    });
  } catch (error) {
    console.error('Error fetching rundowns:', error);
    res.status(500).json({ 
      error: 'Failed to fetch rundowns',
      details: error.message 
    });
  }
});

/**
 * GET /api/rundowns/:id
 * Get specific rundown details with segments and stories
 */
router.get('/:id', async (req, res) => {
  try {
    const rundownId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user can access this rundown
    const access = await checkRundownOwnership(rundownId, userId, userRole);
    if (!access.exists) {
      return res.status(404).json({ error: 'Rundown not found' });
    }
    if (!access.canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get rundown details
    const rundownResult = await safeQuery(`
      SELECT 
        r.*,
        u.name as created_by_name,
        u.email as created_by_email,
        c.class_name,
        reviewer.name as reviewed_by_name
      FROM rundown_app_rundowns r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN classes c ON r.class_id = c.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
      WHERE r.id = $1
    `, [rundownId]);

    // Get segments
    const segmentsResult = await safeQuery(`
      SELECT * FROM rundown_app_segments 
      WHERE rundown_id = $1 
      ORDER BY sort_order ASC
    `, [rundownId]);

    // Get associated stories
    const storiesResult = await safeQuery(`
      SELECT rs.*, s.idea_title, s.idea_description
      FROM rundown_app_stories rs
      LEFT JOIN story_ideas s ON rs.story_id = s.id
      WHERE rs.rundown_id = $1
      ORDER BY rs.added_at ASC
    `, [rundownId]);

    const rundown = rundownResult.rows[0];
    rundown.segments = segmentsResult.rows;
    rundown.stories = storiesResult.rows;
    rundown.permissions = {
      can_edit: access.canEdit,
      can_delete: access.canEdit,
      can_submit: access.isOwner && rundown.status === 'draft',
      can_approve: access.isTeacher && rundown.status === 'submitted'
    };

    res.json(rundown);
  } catch (error) {
    console.error('Error fetching rundown:', error);
    res.status(500).json({ 
      error: 'Failed to fetch rundown',
      details: error.message 
    });
  }
});

/**
 * POST /api/rundowns
 * Create new rundown
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, class_id } = req.body;

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (title.length > 255) {
      return res.status(400).json({ error: 'Title must be 255 characters or less' });
    }

    // Check rundown limit
    const limitCheck = await checkRundownLimit(userId);
    if (!limitCheck.canCreate) {
      return res.status(400).json({ 
        error: 'Maximum rundown limit reached',
        details: `You can have a maximum of ${limitCheck.limit} active rundowns. Archive some rundowns to create new ones.`,
        current_count: limitCheck.current,
        limit: limitCheck.limit
      });
    }

    // Verify class exists if provided
    if (class_id) {
      const classResult = await safeQuery(
        'SELECT id FROM classes WHERE id = $1',
        [class_id]
      );
      if (classResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid class ID' });
      }
    }

    // Create rundown
    const result = await safeQuery(`
      INSERT INTO rundown_app_rundowns (title, description, created_by, class_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [title.trim(), description?.trim() || null, userId, class_id || null]);

    const newRundown = result.rows[0];
    
    // Log analytics
    await safeQuery(`
      INSERT INTO rundown_app_analytics (rundown_id, user_id, action_type, details)
      VALUES ($1, $2, 'created', $3)
    `, [newRundown.id, userId, JSON.stringify({ title, class_id })]);

    res.status(201).json({
      message: 'Rundown created successfully',
      rundown: newRundown,
      remaining_slots: limitCheck.limit - limitCheck.current - 1
    });
  } catch (error) {
    console.error('Error creating rundown:', error);
    res.status(500).json({ 
      error: 'Failed to create rundown',
      details: error.message 
    });
  }
});

/**
 * PUT /api/rundowns/:id
 * Update existing rundown
 */
router.put('/:id', async (req, res) => {
  try {
    const rundownId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { title, description, class_id } = req.body;

    // Check permissions
    const access = await checkRundownOwnership(rundownId, userId, userRole);
    if (!access.exists) {
      return res.status(404).json({ error: 'Rundown not found' });
    }
    if (!access.canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (title.length > 255) {
      return res.status(400).json({ error: 'Title must be 255 characters or less' });
    }

    // Verify class exists if provided
    if (class_id) {
      const classResult = await safeQuery(
        'SELECT id FROM classes WHERE id = $1',
        [class_id]
      );
      if (classResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid class ID' });
      }
    }

    // Update rundown
    const result = await safeQuery(`
      UPDATE rundown_app_rundowns 
      SET title = $1, description = $2, class_id = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [title.trim(), description?.trim() || null, class_id || null, rundownId]);

    res.json({
      message: 'Rundown updated successfully',
      rundown: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating rundown:', error);
    res.status(500).json({ 
      error: 'Failed to update rundown',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/rundowns/:id
 * Archive rundown (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const rundownId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check permissions
    const access = await checkRundownOwnership(rundownId, userId, userRole);
    if (!access.exists) {
      return res.status(404).json({ error: 'Rundown not found' });
    }
    if (!access.canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Archive rundown (soft delete)
    await safeQuery(`
      UPDATE rundown_app_rundowns 
      SET is_archived = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [rundownId]);

    // Log analytics
    await safeQuery(`
      INSERT INTO rundown_app_analytics (rundown_id, user_id, action_type, details)
      VALUES ($1, $2, 'archived', $3)
    `, [rundownId, userId, JSON.stringify({ archived_at: new Date().toISOString() })]);

    res.json({ message: 'Rundown archived successfully' });
  } catch (error) {
    console.error('Error archiving rundown:', error);
    res.status(500).json({ 
      error: 'Failed to archive rundown',
      details: error.message 
    });
  }
});

/**
 * POST /api/rundowns/:id/submit
 * Submit rundown for teacher review
 */
router.post('/:id/submit', async (req, res) => {
  try {
    const rundownId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check permissions
    const access = await checkRundownOwnership(rundownId, userId, userRole);
    if (!access.exists) {
      return res.status(404).json({ error: 'Rundown not found' });
    }
    if (!access.isOwner) {
      return res.status(403).json({ error: 'Only rundown owner can submit for review' });
    }

    // Check current status
    if (access.rundown.status !== 'draft') {
      return res.status(400).json({ 
        error: 'Only draft rundowns can be submitted for review',
        current_status: access.rundown.status
      });
    }

    // Update status
    await safeQuery(`
      UPDATE rundown_app_rundowns 
      SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [rundownId]);

    // Log analytics
    await safeQuery(`
      INSERT INTO rundown_app_analytics (rundown_id, user_id, action_type, details)
      VALUES ($1, $2, 'submitted', $3)
    `, [rundownId, userId, JSON.stringify({ submitted_at: new Date().toISOString() })]);

    res.json({ 
      message: 'Rundown submitted for review successfully',
      status: 'submitted'
    });
  } catch (error) {
    console.error('Error submitting rundown:', error);
    res.status(500).json({ 
      error: 'Failed to submit rundown',
      details: error.message 
    });
  }
});

/**
 * POST /api/rundowns/:id/approve
 * Approve rundown (teachers only)
 */
router.post('/:id/approve', requireRole('teacher'), async (req, res) => {
  try {
    const rundownId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { comment } = req.body;

    // Check permissions
    const access = await checkRundownOwnership(rundownId, userId, userRole);
    if (!access.exists) {
      return res.status(404).json({ error: 'Rundown not found' });
    }
    if (!access.isTeacher && !access.isAdmin) {
      return res.status(403).json({ error: 'Only teachers can approve rundowns from their students' });
    }

    // Check current status
    if (access.rundown.status !== 'submitted') {
      return res.status(400).json({ 
        error: 'Only submitted rundowns can be approved',
        current_status: access.rundown.status
      });
    }

    // Update status
    await safeQuery(`
      UPDATE rundown_app_rundowns 
      SET status = 'approved', 
          teacher_comment = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [comment?.trim() || null, userId, rundownId]);

    // Log analytics
    await safeQuery(`
      INSERT INTO rundown_app_analytics (rundown_id, user_id, action_type, details)
      VALUES ($1, $2, 'approved', $3)
    `, [rundownId, userId, JSON.stringify({ 
      comment: comment?.trim(),
      approved_at: new Date().toISOString()
    })]);

    res.json({ 
      message: 'Rundown approved successfully',
      status: 'approved',
      comment: comment?.trim() || null
    });
  } catch (error) {
    console.error('Error approving rundown:', error);
    res.status(500).json({ 
      error: 'Failed to approve rundown',
      details: error.message 
    });
  }
});

/**
 * POST /api/rundowns/:id/reject
 * Reject rundown (teachers only)
 */
router.post('/:id/reject', requireRole('teacher'), async (req, res) => {
  try {
    const rundownId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { comment } = req.body;

    // Require comment for rejection
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required when rejecting a rundown' });
    }

    // Check permissions
    const access = await checkRundownOwnership(rundownId, userId, userRole);
    if (!access.exists) {
      return res.status(404).json({ error: 'Rundown not found' });
    }
    if (!access.isTeacher && !access.isAdmin) {
      return res.status(403).json({ error: 'Only teachers can reject rundowns from their students' });
    }

    // Check current status
    if (access.rundown.status !== 'submitted') {
      return res.status(400).json({ 
        error: 'Only submitted rundowns can be rejected',
        current_status: access.rundown.status
      });
    }

    // Update status back to draft with comment
    await safeQuery(`
      UPDATE rundown_app_rundowns 
      SET status = 'draft', 
          teacher_comment = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [comment.trim(), userId, rundownId]);

    // Log analytics
    await safeQuery(`
      INSERT INTO rundown_app_analytics (rundown_id, user_id, action_type, details)
      VALUES ($1, $2, 'rejected', $3)
    `, [rundownId, userId, JSON.stringify({ 
      comment: comment.trim(),
      rejected_at: new Date().toISOString()
    })]);

    res.json({ 
      message: 'Rundown rejected and returned to draft status',
      status: 'draft',
      comment: comment.trim()
    });
  } catch (error) {
    console.error('Error rejecting rundown:', error);
    res.status(500).json({ 
      error: 'Failed to reject rundown',
      details: error.message 
    });
  }
});

module.exports = router;