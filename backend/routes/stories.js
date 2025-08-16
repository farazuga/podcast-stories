const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { verifyToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Configure multer for CSV uploads
const upload = multer({ dest: 'uploads/' });

// Get all stories with filters
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, tags, startDate, endDate, interviewee } = req.query;
    
    let query = `
      SELECT 
        s.*, 
        u.username as uploaded_by_name,
        u.email as uploaded_by_email,
        u.school as uploaded_by_school,
        array_agg(DISTINCT t.tag_name) as tags,
        array_agg(DISTINCT i.name) as interviewees
      FROM story_ideas s
      LEFT JOIN users u ON s.uploaded_by = u.id
      LEFT JOIN story_tags st ON s.id = st.story_id
      LEFT JOIN tags t ON st.tag_id = t.id
      LEFT JOIN story_interviewees si ON s.id = si.story_id
      LEFT JOIN interviewees i ON si.interviewee_id = i.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCounter = 1;

    // Search filter
    if (search) {
      query += ` AND (s.idea_title ILIKE $${paramCounter} OR s.idea_description ILIKE $${paramCounter})`;
      params.push(`%${search}%`);
      paramCounter++;
    }

    // Date range filter
    if (startDate) {
      query += ` AND s.coverage_start_date >= $${paramCounter}`;
      params.push(startDate);
      paramCounter++;
    }
    if (endDate) {
      query += ` AND (s.coverage_end_date <= $${paramCounter} OR (s.coverage_end_date IS NULL AND s.coverage_start_date <= $${paramCounter}))`;
      params.push(endDate);
      paramCounter++;
    }

    query += ` GROUP BY s.id, u.username, u.email, u.school ORDER BY s.uploaded_date DESC`;

    const result = await pool.query(query, params);

    // Filter by tags if provided (post-query filtering)
    let stories = result.rows;
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      stories = stories.filter(story => 
        story.tags && tagArray.some(tag => story.tags.includes(tag))
      );
    }

    // Filter by interviewee if provided (post-query filtering)
    if (interviewee) {
      stories = stories.filter(story => 
        story.interviewees && story.interviewees.some(person => 
          person.toLowerCase().includes(interviewee.toLowerCase())
        )
      );
    }

    res.json(stories);
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Get single story by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const storyQuery = await pool.query(`
      SELECT 
        s.*, 
        u.username as uploaded_by_name,
        u.email as uploaded_by_email,
        u.school as uploaded_by_school,
        array_agg(DISTINCT t.tag_name) as tags,
        array_agg(DISTINCT i.name) as interviewees
      FROM story_ideas s
      LEFT JOIN users u ON s.uploaded_by = u.id
      LEFT JOIN story_tags st ON s.id = st.story_id
      LEFT JOIN tags t ON st.tag_id = t.id
      LEFT JOIN story_interviewees si ON s.id = si.story_id
      LEFT JOIN interviewees i ON si.interviewee_id = i.id
      WHERE s.id = $1
      GROUP BY s.id, u.username, u.email, u.school
    `, [id]);

    if (storyQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json(storyQuery.rows[0]);
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

// Create new story
router.post('/', verifyToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      idea_title,
      idea_description,
      question_1,
      question_2,
      question_3,
      question_4,
      question_5,
      question_6,
      coverage_start_date,
      coverage_end_date,
      tags,
      interviewees
    } = req.body;

    // Insert story
    const storyResult = await client.query(
      `INSERT INTO story_ideas (
        idea_title, idea_description, 
        question_1, question_2, question_3, question_4, question_5, question_6,
        coverage_start_date, coverage_end_date, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        idea_title, idea_description,
        question_1, question_2, question_3, question_4, question_5, question_6,
        coverage_start_date, coverage_end_date || null, req.user.id
      ]
    );

    const storyId = storyResult.rows[0].id;

    // Handle tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tagResult = await client.query(
          'SELECT id FROM tags WHERE tag_name = $1',
          [tagName]
        );
        
        if (tagResult.rows.length > 0) {
          await client.query(
            'INSERT INTO story_tags (story_id, tag_id) VALUES ($1, $2)',
            [storyId, tagResult.rows[0].id]
          );
        }
      }
    }

    // Handle interviewees
    if (interviewees && interviewees.length > 0) {
      for (const intervieweeName of interviewees) {
        // Insert or get existing interviewee
        const intervieweeResult = await client.query(
          'INSERT INTO interviewees (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
          [intervieweeName]
        );
        
        await client.query(
          'INSERT INTO story_interviewees (story_id, interviewee_id) VALUES ($1, $2)',
          [storyId, intervieweeResult.rows[0].id]
        );
      }
    }

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Story created successfully',
      story: storyResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Failed to create story' });
  } finally {
    client.release();
  }
});

// Update story
router.put('/:id', verifyToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      idea_title,
      idea_description,
      question_1,
      question_2,
      question_3,
      question_4,
      question_5,
      question_6,
      coverage_start_date,
      coverage_end_date,
      tags,
      interviewees
    } = req.body;

    // Update story
    const storyResult = await client.query(
      `UPDATE story_ideas SET
        idea_title = $1, idea_description = $2,
        question_1 = $3, question_2 = $4, question_3 = $5,
        question_4 = $6, question_5 = $7, question_6 = $8,
        coverage_start_date = $9, coverage_end_date = $10
      WHERE id = $11 RETURNING *`,
      [
        idea_title, idea_description,
        question_1, question_2, question_3, question_4, question_5, question_6,
        coverage_start_date, coverage_end_date || null, id
      ]
    );

    if (storyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Story not found' });
    }

    // Update tags
    await client.query('DELETE FROM story_tags WHERE story_id = $1', [id]);
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tagResult = await client.query(
          'SELECT id FROM tags WHERE tag_name = $1',
          [tagName]
        );
        
        if (tagResult.rows.length > 0) {
          await client.query(
            'INSERT INTO story_tags (story_id, tag_id) VALUES ($1, $2)',
            [id, tagResult.rows[0].id]
          );
        }
      }
    }

    // Update interviewees
    await client.query('DELETE FROM story_interviewees WHERE story_id = $1', [id]);
    if (interviewees && interviewees.length > 0) {
      for (const intervieweeName of interviewees) {
        const intervieweeResult = await client.query(
          'INSERT INTO interviewees (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
          [intervieweeName]
        );
        
        await client.query(
          'INSERT INTO story_interviewees (story_id, interviewee_id) VALUES ($1, $2)',
          [id, intervieweeResult.rows[0].id]
        );
      }
    }

    await client.query('COMMIT');
    
    res.json({
      message: 'Story updated successfully',
      story: storyResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating story:', error);
    res.status(500).json({ error: 'Failed to update story' });
  } finally {
    client.release();
  }
});

// Delete story (admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM story_ideas WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

// CSV Import
router.post('/import', verifyToken, upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  const errors = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (const row of results) {
          try {
            // Insert story
            const storyResult = await client.query(
              `INSERT INTO story_ideas (
                idea_title, idea_description,
                question_1, question_2, question_3, question_4, question_5, question_6,
                coverage_start_date, coverage_end_date, uploaded_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
              [
                row.idea_title || row.title,
                row.idea_description || row.description,
                row.question_1, row.question_2, row.question_3,
                row.question_4, row.question_5, row.question_6,
                row.coverage_start_date || row.start_date,
                row.coverage_end_date || row.end_date || null,
                req.user.id
              ]
            );

            const storyId = storyResult.rows[0].id;

            // Handle tags if present
            if (row.tags) {
              const tags = row.tags.split(',').map(t => t.trim());
              for (const tagName of tags) {
                const tagResult = await client.query(
                  'SELECT id FROM tags WHERE tag_name = $1',
                  [tagName]
                );
                
                if (tagResult.rows.length > 0) {
                  await client.query(
                    'INSERT INTO story_tags (story_id, tag_id) VALUES ($1, $2)',
                    [storyId, tagResult.rows[0].id]
                  );
                }
              }
            }

            // Handle interviewees if present
            if (row.interviewees || row.people_to_interview) {
              const people = (row.interviewees || row.people_to_interview).split(',').map(p => p.trim());
              for (const person of people) {
                const intervieweeResult = await client.query(
                  'INSERT INTO interviewees (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
                  [person]
                );
                
                await client.query(
                  'INSERT INTO story_interviewees (story_id, interviewee_id) VALUES ($1, $2)',
                  [storyId, intervieweeResult.rows[0].id]
                );
              }
            }
          } catch (rowError) {
            errors.push({ row: row.idea_title || row.title, error: rowError.message });
          }
        }

        await client.query('COMMIT');
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({
          message: 'CSV import completed',
          imported: results.length - errors.length,
          errors: errors
        });
      } catch (error) {
        await client.query('ROLLBACK');
        fs.unlinkSync(req.file.path);
        console.error('CSV import error:', error);
        res.status(500).json({ error: 'Failed to import CSV' });
      } finally {
        client.release();
      }
    });
});

module.exports = router;