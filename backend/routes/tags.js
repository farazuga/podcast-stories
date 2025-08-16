const express = require('express');
const { Pool } = require('pg');
const { verifyToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get all tags
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT t.*, u.username as created_by_name FROM tags t LEFT JOIN users u ON t.created_by = u.id ORDER BY t.tag_name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Create new tag (admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { tag_name } = req.body;
    
    if (!tag_name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const result = await pool.query(
      'INSERT INTO tags (tag_name, created_by) VALUES ($1, $2) RETURNING *',
      [tag_name, req.user.id]
    );

    res.status(201).json({
      message: 'Tag created successfully',
      tag: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Tag already exists' });
    }
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update tag (admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tag_name } = req.body;
    
    if (!tag_name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const result = await pool.query(
      'UPDATE tags SET tag_name = $1 WHERE id = $2 RETURNING *',
      [tag_name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({
      message: 'Tag updated successfully',
      tag: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Tag name already exists' });
    }
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Delete tag (admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM tags WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

module.exports = router;