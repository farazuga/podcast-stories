const express = require('express');
const { Pool } = require('pg');
const { verifyToken, isAdmin, isTeacherOrAbove, isAmitraceAdmin } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper function to check if user can access rundown
const checkRundownAccess = async (rundownId, userId, userRole) => {
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
  
  // Admin can access any rundown
  if (userRole === 'amitrace_admin') {
    return { allowed: true, rundown };
  }
  
  // Creator can access their rundown
  if (rundown.created_by === userId) {
    return { allowed: true, rundown };
  }
  
  // Teacher can access rundowns in their classes
  if (userRole === 'teacher' && rundown.teacher_id === userId) {
    return { allowed: true, rundown };
  }
  
  // Students can view shared rundowns in their classes
  if (userRole === 'student' && rundown.share_with_class) {
    const classQuery = `
      SELECT 1 FROM user_classes uc
      JOIN rundowns r ON r.class_id = uc.class_id
      WHERE uc.user_id = $1 AND r.id = $2
    `;
    const classResult = await pool.query(classQuery, [userId, rundownId]);
    if (classResult.rows.length > 0) {
      return { allowed: true, rundown };
    }
  }
  
  return { allowed: false, rundown };
};

// Get all rundowns for user
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, class_id, search, sort = 'air_date' } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    
    let query = `
      SELECT 
        r.*,
        COALESCE(u.name, u.email) as created_by_name,
        c.class_name,
        c.subject,
        COUNT(rs.id) as segment_count,
        COALESCE(SUM(rs.duration), 0) as total_duration
      FROM rundowns r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN classes c ON r.class_id = c.id
      LEFT JOIN rundown_segments rs ON r.id = rs.rundown_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Role-based filtering
    if (userRole === 'amitrace_admin') {
      // Admin sees all rundowns
    } else if (userRole === 'teacher') {
      // Teachers see their own rundowns and those in their classes
      query += ` AND (r.created_by = $${++paramCount} OR c.teacher_id = $${paramCount})`;
      params.push(userId);
    } else {
      // Students see their own rundowns and shared ones in their classes
      query += ` AND (r.created_by = $${++paramCount} OR (r.share_with_class = true AND r.class_id IN (
        SELECT class_id FROM user_classes WHERE user_id = $${paramCount}
      )))`;
      params.push(userId);
    }
    
    // Additional filters
    if (status) {
      query += ` AND r.status = $${++paramCount}`;
      params.push(status);
    }
    
    if (class_id) {
      query += ` AND r.class_id = $${++paramCount}`;
      params.push(class_id);
    }
    
    if (search) {
      query += ` AND r.show_name ILIKE $${++paramCount}`;
      params.push(`%${search}%`);
    }
    
    query += ` GROUP BY r.id, u.name, u.email, c.class_name, c.subject`;
    
    // Sorting
    const validSorts = ['air_date', 'created_at', 'show_name', 'status'];
    const sortBy = validSorts.includes(sort) ? sort : 'air_date';
    query += ` ORDER BY r.${sortBy} ASC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching rundowns:', error);
    res.status(500).json({ error: 'Failed to fetch rundowns' });
  }
});

// Get specific rundown with segments
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const rundownId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const access = await checkRundownAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to this rundown' });
    }
    
    // Get rundown with segments, talent, and stories
    const rundownQuery = `
      SELECT 
        r.*,
        COALESCE(u.name, u.email) as created_by_name,
        c.class_name,
        c.subject
      FROM rundowns r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN classes c ON r.class_id = c.id
      WHERE r.id = $1
    `;
    
    const segmentsQuery = `
      SELECT * FROM rundown_segments 
      WHERE rundown_id = $1 
      ORDER BY sort_order ASC
    `;
    
    const talentQuery = `
      SELECT * FROM rundown_talent 
      WHERE rundown_id = $1 
      ORDER BY sort_order ASC
    `;
    
    const storiesQuery = `
      SELECT * FROM rundown_stories 
      WHERE rundown_id = $1 
      ORDER BY added_at ASC
    `;
    
    const [rundownResult, segmentsResult, talentResult, storiesResult] = await Promise.all([
      pool.query(rundownQuery, [rundownId]),
      pool.query(segmentsQuery, [rundownId]),
      pool.query(talentQuery, [rundownId]),
      pool.query(storiesQuery, [rundownId])
    ]);
    
    if (rundownResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rundown not found' });
    }
    
    const rundown = {
      ...rundownResult.rows[0],
      segments: segmentsResult.rows,
      talent: talentResult.rows,
      stories: storiesResult.rows
    };
    
    res.json(rundown);
    
  } catch (error) {
    console.error('Error fetching rundown:', error);
    res.status(500).json({ error: 'Failed to fetch rundown' });
  }
});

// Create new rundown
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      show_name,
      air_date,
      target_duration = 1200,
      share_with_class = false,
      class_id
    } = req.body;
    
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Validate required fields
    if (!show_name || !air_date) {
      return res.status(400).json({ error: 'Show name and air date are required' });
    }
    
    // Check class access if specified
    if (class_id) {
      let classQuery;
      let classParams;
      
      if (userRole === 'teacher') {
        classQuery = 'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2';
        classParams = [class_id, userId];
      } else if (userRole === 'student') {
        classQuery = 'SELECT c.id FROM classes c JOIN user_classes uc ON c.id = uc.class_id WHERE c.id = $1 AND uc.user_id = $2';
        classParams = [class_id, userId];
      } else {
        // Admin can create in any class
        classQuery = 'SELECT id FROM classes WHERE id = $1';
        classParams = [class_id];
      }
      
      const classResult = await pool.query(classQuery, classParams);
      if (classResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to specified class' });
      }
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert rundown
      const insertQuery = `
        INSERT INTO rundowns (show_name, air_date, target_duration, share_with_class, created_by, class_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        show_name,
        air_date,
        target_duration,
        share_with_class,
        userId,
        class_id
      ]);
      
      const rundownId = result.rows[0].id;
      
      // Create default segments (intro, outro)
      const defaultSegments = [
        {
          segment_type: 'intro',
          title: 'Show Intro',
          duration: 60,
          sort_order: 0,
          is_pinned: true,
          status: 'Ready',
          content: { intro: '', questions: [''], close: '', notes: '' }
        },
        {
          segment_type: 'outro',
          title: 'Show Outro',
          duration: 45,
          sort_order: 999,
          is_pinned: true,
          status: 'Ready',
          content: { intro: '', questions: [''], close: '', notes: '' }
        }
      ];
      
      for (const segment of defaultSegments) {
        await client.query(`
          INSERT INTO rundown_segments (rundown_id, segment_type, title, duration, sort_order, is_pinned, status, content)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          rundownId,
          segment.segment_type,
          segment.title,
          segment.duration,
          segment.sort_order,
          segment.is_pinned,
          segment.status,
          JSON.stringify(segment.content)
        ]);
      }
      
      await client.query('COMMIT');
      
      res.status(201).json(result.rows[0]);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error creating rundown:', error);
    res.status(500).json({ error: 'Failed to create rundown' });
  }
});

// Update rundown
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const rundownId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const access = await checkRundownAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to this rundown' });
    }
    
    // Only creator, teacher of class, or admin can edit
    if (userRole === 'student' && access.rundown.created_by !== userId) {
      return res.status(403).json({ error: 'Students can only edit their own rundowns' });
    }
    
    const {
      show_name,
      air_date,
      target_duration,
      share_with_class,
      status
    } = req.body;
    
    const updateQuery = `
      UPDATE rundowns 
      SET show_name = COALESCE($1, show_name),
          air_date = COALESCE($2, air_date),
          target_duration = COALESCE($3, target_duration),
          share_with_class = COALESCE($4, share_with_class),
          status = COALESCE($5, status)
      WHERE id = $6
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      show_name,
      air_date,
      target_duration,
      share_with_class,
      status,
      rundownId
    ]);
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error updating rundown:', error);
    res.status(500).json({ error: 'Failed to update rundown' });
  }
});

// Delete rundown (archive)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const rundownId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const access = await checkRundownAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to this rundown' });
    }
    
    // Only creator or admin can delete
    if (userRole !== 'amitrace_admin' && access.rundown.created_by !== userId) {
      return res.status(403).json({ error: 'Only rundown creator or admin can delete' });
    }
    
    // Archive instead of hard delete
    const result = await pool.query(
      'UPDATE rundowns SET status = $1 WHERE id = $2 RETURNING *',
      ['archived', rundownId]
    );
    
    res.json({ message: 'Rundown archived successfully', rundown: result.rows[0] });
    
  } catch (error) {
    console.error('Error deleting rundown:', error);
    res.status(500).json({ error: 'Failed to delete rundown' });
  }
});

module.exports = router;