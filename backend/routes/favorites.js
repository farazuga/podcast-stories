const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get user's favorite stories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        s.*,
        u.username as uploaded_by_username,
        uf.created_at as favorited_at,
        COUNT(uf2.id) as total_favorites
      FROM user_favorites uf
      JOIN story_ideas s ON uf.story_id = s.id
      JOIN users u ON s.uploaded_by = u.id
      LEFT JOIN user_favorites uf2 ON s.id = uf2.story_id
      WHERE uf.user_id = $1
      GROUP BY s.id, s.idea_title, s.idea_description, s.uploaded_by, s.uploaded_date, u.username, uf.created_at
      ORDER BY uf.created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Add story to favorites
router.post('/:storyId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const storyId = parseInt(req.params.storyId);
    
    // Check if story exists
    const storyCheck = await pool.query(
      'SELECT id, idea_title FROM story_ideas WHERE id = $1',
      [storyId]
    );
    
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found or not approved' });
    }
    
    // Check if already favorited
    const existingFavorite = await pool.query(
      'SELECT id FROM user_favorites WHERE user_id = $1 AND story_id = $2',
      [userId, storyId]
    );
    
    if (existingFavorite.rows.length > 0) {
      return res.status(400).json({ error: 'Story is already in favorites' });
    }
    
    // Add to favorites
    await pool.query(
      'INSERT INTO user_favorites (user_id, story_id) VALUES ($1, $2)',
      [userId, storyId]
    );
    
    // Get updated favorite count
    const favoriteCount = await pool.query(
      'SELECT COUNT(*) as count FROM user_favorites WHERE story_id = $1',
      [storyId]
    );
    
    res.status(201).json({
      message: 'Story added to favorites',
      story_title: storyCheck.rows[0].idea_title,
      total_favorites: parseInt(favoriteCount.rows[0].count)
    });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// Remove story from favorites
router.delete('/:storyId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const storyId = parseInt(req.params.storyId);
    
    // Check if favorite exists
    const existingFavorite = await pool.query(
      'SELECT id FROM user_favorites WHERE user_id = $1 AND story_id = $2',
      [userId, storyId]
    );
    
    if (existingFavorite.rows.length === 0) {
      return res.status(404).json({ error: 'Story is not in favorites' });
    }
    
    // Remove from favorites
    await pool.query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND story_id = $2',
      [userId, storyId]
    );
    
    // Get updated favorite count
    const favoriteCount = await pool.query(
      'SELECT COUNT(*) as count FROM user_favorites WHERE story_id = $1',
      [storyId]
    );
    
    res.json({
      message: 'Story removed from favorites',
      total_favorites: parseInt(favoriteCount.rows[0].count)
    });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// Get popular stories (most favorited)
router.get('/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const query = `
      SELECT 
        s.*,
        u.username as uploaded_by_username,
        COUNT(uf.id) as favorite_count
      FROM story_ideas s
      JOIN users u ON s.uploaded_by = u.id
      LEFT JOIN user_favorites uf ON s.id = uf.story_id
      GROUP BY s.id, s.idea_title, s.idea_description, s.uploaded_by, s.uploaded_date, u.username
      ORDER BY favorite_count DESC, s.uploaded_date DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching popular stories:', error);
    res.status(500).json({ error: 'Failed to fetch popular stories' });
  }
});

// Check if story is favorited by user
router.get('/:storyId/check', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const storyId = parseInt(req.params.storyId);
    
    const result = await pool.query(
      'SELECT id FROM user_favorites WHERE user_id = $1 AND story_id = $2',
      [userId, storyId]
    );
    
    res.json({
      is_favorited: result.rows.length > 0
    });
  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({ error: 'Failed to check favorite status' });
  }
});

// Get favorite statistics for admins/teachers
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Only allow teachers and admins to see stats
    if (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'amitrace_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const statsQuery = `
      SELECT 
        s.id,
        s.idea_title,
        COUNT(uf.id) as favorite_count,
        ARRAY_AGG(DISTINCT u.username) FILTER (WHERE u.username IS NOT NULL) as favorited_by
      FROM story_ideas s
      LEFT JOIN user_favorites uf ON s.id = uf.story_id
      LEFT JOIN users u ON uf.user_id = u.id
      GROUP BY s.id, s.idea_title
      HAVING COUNT(uf.id) > 0
      ORDER BY favorite_count DESC
      LIMIT 20
    `;
    
    const result = await pool.query(statsQuery);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching favorite stats:', error);
    res.status(500).json({ error: 'Failed to fetch favorite statistics' });
  }
});

module.exports = router;