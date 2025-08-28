const express = require('express');
const { Pool } = require('pg');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper function to check if user can edit rundown talent
const checkTalentAccess = async (rundownId, userId, userRole) => {
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
  
  // Admin can edit any talent
  if (userRole === 'amitrace_admin') {
    return { allowed: true, rundown };
  }
  
  // Creator can edit their talent
  if (rundown.created_by === userId) {
    return { allowed: true, rundown };
  }
  
  // Teacher can edit talent in their classes
  if (userRole === 'teacher' && rundown.teacher_id === userId) {
    return { allowed: true, rundown };
  }
  
  return { allowed: false, rundown };
};

// Get talent for a rundown
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
    
    const talentQuery = `
      SELECT * FROM rundown_talent 
      WHERE rundown_id = $1 
      ORDER BY sort_order ASC, role ASC, name ASC
    `;
    
    const result = await pool.query(talentQuery, [rundownId]);
    
    // Group by role for easier frontend handling
    const talent = {
      hosts: result.rows.filter(t => t.role === 'host'),
      guests: result.rows.filter(t => t.role === 'guest')
    };
    
    res.json(talent);
    
  } catch (error) {
    console.error('Error fetching talent:', error);
    res.status(500).json({ error: 'Failed to fetch talent' });
  }
});

// Add talent to rundown
router.post('/rundown/:rundownId', verifyToken, async (req, res) => {
  try {
    const rundownId = req.params.rundownId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const access = await checkTalentAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to edit this rundown' });
    }
    
    const { name, role } = req.body;
    
    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }
    
    if (!['host', 'guest'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either "host" or "guest"' });
    }
    
    // Check total talent limit (4 maximum)
    const countQuery = 'SELECT COUNT(*) as count FROM rundown_talent WHERE rundown_id = $1';
    const countResult = await pool.query(countQuery, [rundownId]);
    
    if (parseInt(countResult.rows[0].count) >= 4) {
      return res.status(400).json({ 
        error: 'Maximum of 4 total hosts and guests allowed',
        limit_reached: true
      });
    }
    
    // Check for duplicate names
    const duplicateQuery = 'SELECT 1 FROM rundown_talent WHERE rundown_id = $1 AND LOWER(name) = LOWER($2)';
    const duplicateResult = await pool.query(duplicateQuery, [rundownId, name]);
    
    if (duplicateResult.rows.length > 0) {
      return res.status(400).json({ error: 'A person with this name already exists in the rundown' });
    }
    
    // Get next sort order for this role
    const sortQuery = 'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM rundown_talent WHERE rundown_id = $1 AND role = $2';
    const sortResult = await pool.query(sortQuery, [rundownId, role]);
    const sortOrder = sortResult.rows[0].next_order;
    
    const insertQuery = `
      INSERT INTO rundown_talent (rundown_id, name, role, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [rundownId, name.trim(), role, sortOrder]);
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Error adding talent:', error);
    res.status(500).json({ error: 'Failed to add talent' });
  }
});

// Update talent
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const talentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get talent and rundown info
    const talentQuery = 'SELECT rundown_id, name, role FROM rundown_talent WHERE id = $1';
    const talentResult = await pool.query(talentQuery, [talentId]);
    
    if (talentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Talent not found' });
    }
    
    const talent = talentResult.rows[0];
    const rundownId = talent.rundown_id;
    
    const access = await checkTalentAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to edit this talent' });
    }
    
    const { name, role, sort_order } = req.body;
    
    // Validate role if provided
    if (role && !['host', 'guest'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either "host" or "guest"' });
    }
    
    // Check for duplicate names if name is being changed
    if (name && name.toLowerCase() !== talent.name.toLowerCase()) {
      const duplicateQuery = 'SELECT 1 FROM rundown_talent WHERE rundown_id = $1 AND LOWER(name) = LOWER($2) AND id != $3';
      const duplicateResult = await pool.query(duplicateQuery, [rundownId, name, talentId]);
      
      if (duplicateResult.rows.length > 0) {
        return res.status(400).json({ error: 'A person with this name already exists in the rundown' });
      }
    }
    
    const updateQuery = `
      UPDATE rundown_talent 
      SET name = COALESCE($1, name),
          role = COALESCE($2, role),
          sort_order = COALESCE($3, sort_order)
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      name ? name.trim() : null,
      role,
      sort_order,
      talentId
    ]);
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error updating talent:', error);
    res.status(500).json({ error: 'Failed to update talent' });
  }
});

// Reorder talent within role
router.put('/rundown/:rundownId/reorder/:role', verifyToken, async (req, res) => {
  try {
    const { rundownId, role } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!['host', 'guest'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }
    
    const access = await checkTalentAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to edit this rundown' });
    }
    
    const { talentIds } = req.body; // Array of talent IDs in new order
    
    if (!Array.isArray(talentIds)) {
      return res.status(400).json({ error: 'talentIds must be an array' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verify all talent belong to this rundown and role
      const verifyQuery = `
        SELECT id FROM rundown_talent 
        WHERE rundown_id = $1 AND role = $2 AND id = ANY($3)
      `;
      const verifyResult = await client.query(verifyQuery, [rundownId, role, talentIds]);
      
      if (verifyResult.rows.length !== talentIds.length) {
        return res.status(400).json({ error: 'Invalid talent IDs provided' });
      }
      
      // Update sort orders
      for (let i = 0; i < talentIds.length; i++) {
        await client.query(
          'UPDATE rundown_talent SET sort_order = $1 WHERE id = $2',
          [i, talentIds[i]]
        );
      }
      
      await client.query('COMMIT');
      
      // Return updated talent for this role
      const updatedQuery = `
        SELECT * FROM rundown_talent 
        WHERE rundown_id = $1 AND role = $2 
        ORDER BY sort_order ASC
      `;
      const updatedResult = await client.query(updatedQuery, [rundownId, role]);
      
      res.json(updatedResult.rows);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error reordering talent:', error);
    res.status(500).json({ error: 'Failed to reorder talent' });
  }
});

// Delete talent
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const talentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get talent info
    const talentQuery = 'SELECT rundown_id, role, sort_order FROM rundown_talent WHERE id = $1';
    const talentResult = await pool.query(talentQuery, [talentId]);
    
    if (talentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Talent not found' });
    }
    
    const talent = talentResult.rows[0];
    const rundownId = talent.rundown_id;
    
    const access = await checkTalentAccess(rundownId, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Access denied to edit this talent' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete talent
      await client.query('DELETE FROM rundown_talent WHERE id = $1', [talentId]);
      
      // Reorder remaining talent in same role
      await client.query(`
        UPDATE rundown_talent 
        SET sort_order = sort_order - 1 
        WHERE rundown_id = $1 AND role = $2 AND sort_order > $3
      `, [rundownId, talent.role, talent.sort_order]);
      
      await client.query('COMMIT');
      
      res.json({ message: 'Talent removed successfully' });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error deleting talent:', error);
    res.status(500).json({ error: 'Failed to delete talent' });
  }
});

module.exports = router;