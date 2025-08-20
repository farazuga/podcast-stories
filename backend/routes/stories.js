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

// Get all stories with filters (Phase 2: Approval-aware)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, tags, startDate, endDate, interviewee, status } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    
    let query = `
      SELECT 
        s.*, 
        COALESCE(u.name, u.email) as uploaded_by_name,
        u.email as uploaded_by_email,
        u.school as uploaded_by_school,
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
    
    // Phase 2: Apply approval status filtering based on user role
    if (userRole === 'amitrace_admin') {
      // Admins can see all stories, optionally filter by status
      if (status) {
        query += ` AND s.approval_status = '${status}'`;
      }
    } else if (userRole === 'teacher') {
      // Teachers can see approved stories + their own stories
      query += ` AND (s.approval_status = 'approved' OR s.uploaded_by = ${userId})`;
    } else {
      // Students can only see approved stories + their own stories
      query += ` AND (s.approval_status = 'approved' OR s.uploaded_by = ${userId})`;
    }
    
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

    query += ` GROUP BY s.id, u.name, u.email, u.school ORDER BY s.uploaded_date DESC`;

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
        COALESCE(u.name, u.email) as uploaded_by_name,
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
      GROUP BY s.id, u.name, u.email, u.school
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

    // Insert story with draft status
    const storyResult = await client.query(
      `INSERT INTO story_ideas (
        idea_title, idea_description, 
        question_1, question_2, question_3, question_4, question_5, question_6,
        coverage_start_date, coverage_end_date, uploaded_by, approval_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        idea_title, idea_description,
        question_1, question_2, question_3, question_4, question_5, question_6,
        coverage_start_date, coverage_end_date || null, req.user.id, 'draft'
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

// Helper function to parse various date formats
function parseFlexibleDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const cleaned = dateStr.trim();
  
  // Handle formats like "1-Jan", "2-Feb", etc.
  const monthMap = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  // Pattern: "1-Jan", "15-Dec", etc.
  const dayMonthPattern = /^(\d{1,2})-([A-Za-z]{3})$/;
  const match = cleaned.match(dayMonthPattern);
  
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthName = match[2];
    const monthNum = monthMap[monthName];
    
    if (monthNum) {
      // Default to current year for month/day only dates
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${monthNum}-${day}`;
    }
  }
  
  // Try standard date parsing for other formats
  const parsedDate = new Date(cleaned);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }
  
  return null; // Return null for unparseable dates
}

// CSV Import - Enhanced with better error handling, date parsing, and schema compatibility
router.post('/import', verifyToken, upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log(`📤 CSV import started by user ${req.user.id} (${req.user.email || req.user.username})`);
  console.log(`📁 File: ${req.file.originalname}, Size: ${req.file.size} bytes`);
  console.log(`🔧 Enhanced CSV import with flexible date parsing v2.0`);

  const results = [];
  const errors = [];
  const warnings = [];
  let hasApprovalStatus = false;
  let successCount = 0;
  
  // Check if approval_status column exists (Phase 2 feature)
  const client = await pool.connect();
  try {
    const schemaCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'story_ideas' AND column_name = 'approval_status'
    `);
    hasApprovalStatus = schemaCheck.rows.length > 0;
    console.log(`Database schema check: approval_status field ${hasApprovalStatus ? 'exists' : 'not found'}`);
  } catch (error) {
    console.log('Schema check failed, assuming basic schema');
  } finally {
    client.release();
  }

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => {
      // Skip empty rows
      if (data.idea_title || data.title) {
        results.push(data);
      }
    })
    .on('end', async () => {
      console.log(`Parsed ${results.length} rows from CSV`);
      
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const rowNumber = i + 2; // +2 because CSV row 1 is header, and we're 0-indexed
          
          try {
            // Validate required fields
            const title = row.idea_title || row.title;
            if (!title || title.trim() === '') {
              errors.push({ 
                row: rowNumber, 
                title: 'Empty row', 
                error: 'Story title is required' 
              });
              continue;
            }

            // Parse and validate dates with flexible format support
            const startDateRaw = row.coverage_start_date || row.start_date || '';
            const endDateRaw = row.coverage_end_date || row.end_date || '';
            
            const startDate = parseFlexibleDate(startDateRaw);
            const endDate = parseFlexibleDate(endDateRaw);
            
            // Log date parsing for debugging
            if (startDateRaw && !startDate) {
              warnings.push({
                row: rowNumber,
                title: title,
                warning: `Could not parse start date: "${startDateRaw}"`
              });
            }
            if (endDateRaw && !endDate) {
              warnings.push({
                row: rowNumber,
                title: title,
                warning: `Could not parse end date: "${endDateRaw}"`
              });
            }

            // Prepare the base insert query and values
            let insertQuery, insertValues;
            
            if (hasApprovalStatus) {
              // Phase 2 schema with approval_status
              insertQuery = `INSERT INTO story_ideas (
                idea_title, idea_description,
                question_1, question_2, question_3, question_4, question_5, question_6,
                coverage_start_date, coverage_end_date, uploaded_by, approval_status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`;
              
              insertValues = [
                title.trim(),
                (row.idea_description || row.enhanced_description || row.description || '').trim(),
                row.question_1 || null, row.question_2 || null, row.question_3 || null,
                row.question_4 || null, row.question_5 || null, row.question_6 || null,
                startDate, // Use parsed date
                endDate,   // Use parsed date
                req.user.id, 
                'approved' // Auto-approve CSV imports by admin users
              ];
            } else {
              // Basic schema without approval_status
              insertQuery = `INSERT INTO story_ideas (
                idea_title, idea_description,
                question_1, question_2, question_3, question_4, question_5, question_6,
                coverage_start_date, coverage_end_date, uploaded_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`;
              
              insertValues = [
                title.trim(),
                (row.idea_description || row.enhanced_description || row.description || '').trim(),
                row.question_1 || null, row.question_2 || null, row.question_3 || null,
                row.question_4 || null, row.question_5 || null, row.question_6 || null,
                startDate, // Use parsed date
                endDate,   // Use parsed date
                req.user.id
              ];
            }

            // Insert the story
            const storyResult = await client.query(insertQuery, insertValues);
            const storyId = storyResult.rows[0].id;
            console.log(`Imported story ${successCount + 1}: "${title}" (ID: ${storyId})`);

            // Handle tags if present (check multiple possible column names)
            const tagsValue = row.tags || row.auto_tags || row.tag;
            if (tagsValue && tagsValue.trim()) {
              const tags = tagsValue.split(',').map(t => t.trim()).filter(t => t);
              let tagsAdded = 0;
              
              for (const tagName of tags) {
                try {
                  // First try to find existing tag
                  let tagResult = await client.query(
                    'SELECT id FROM tags WHERE tag_name = $1',
                    [tagName]
                  );
                  
                  let tagId;
                  if (tagResult.rows.length > 0) {
                    tagId = tagResult.rows[0].id;
                  } else {
                    // Create new tag if it doesn't exist
                    const newTagResult = await client.query(
                      'INSERT INTO tags (tag_name, created_by) VALUES ($1, $2) RETURNING id',
                      [tagName, req.user.id]
                    );
                    tagId = newTagResult.rows[0].id;
                    console.log(`Created new tag: "${tagName}"`);
                  }
                  
                  // Link tag to story
                  await client.query(
                    'INSERT INTO story_tags (story_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [storyId, tagId]
                  );
                  tagsAdded++;
                } catch (tagError) {
                  console.log(`Warning: Failed to add tag "${tagName}" to story ${storyId}: ${tagError.message}`);
                }
              }
              
              if (tagsAdded > 0) {
                console.log(`  Added ${tagsAdded} tags to story ${storyId}`);
              }
            }

            // Handle interviewees if present (support multiple column formats)
            const people = [];
            
            // Check for single interviewees column
            if (row.interviewees && row.interviewees.trim()) {
              people.push(...row.interviewees.split(',').map(p => p.trim()).filter(p => p));
            }
            if (row.people_to_interview && row.people_to_interview.trim()) {
              people.push(...row.people_to_interview.split(',').map(p => p.trim()).filter(p => p));
            }
            
            // Check for numbered interviewee columns (interviewees 1, interviewees 2, etc.)
            Object.keys(row).forEach(key => {
              if (key.trim().match(/^interviewees?\s*\d+$/i) && row[key] && row[key].trim()) {
                people.push(row[key].trim());
              }
            });
            
            if (people.length > 0) {
              let intervieweesAdded = 0;
              
              for (const person of people) {
                try {
                  const intervieweeResult = await client.query(
                    'INSERT INTO interviewees (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
                    [person]
                  );
                  
                  await client.query(
                    'INSERT INTO story_interviewees (story_id, interviewee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [storyId, intervieweeResult.rows[0].id]
                  );
                  intervieweesAdded++;
                } catch (intervieweeError) {
                  console.log(`Warning: Failed to add interviewee "${person}" to story ${storyId}: ${intervieweeError.message}`);
                }
              }
              
              if (intervieweesAdded > 0) {
                console.log(`  Added ${intervieweesAdded} interviewees to story ${storyId}`);
              }
            }

            successCount++;
            
          } catch (rowError) {
            console.error(`Error processing row ${rowNumber}:`, rowError.message);
            errors.push({ 
              row: rowNumber, 
              title: row.idea_title || row.title || 'Unknown', 
              error: rowError.message 
            });
          }
        }

        await client.query('COMMIT');
        console.log(`📊 CSV import completed: ${successCount} stories imported, ${errors.length} errors, ${warnings.length} warnings`);
        
        if (hasApprovalStatus) {
          console.log(`✅ Auto-approved ${successCount} stories from CSV import by admin ${req.user.email || req.user.username}`);
        }
        
        if (warnings.length > 0) {
          console.log(`⚠️ Warnings during import:`, warnings.slice(0, 5)); // Log first 5 warnings
        }
        
        // Clean up uploaded file
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Warning: Failed to clean up uploaded file:', unlinkError.message);
        }
        
        res.json({
          message: `CSV import completed ${successCount > 0 ? 'successfully' : 'with issues'}`,
          imported: successCount,
          total: results.length,
          errors: errors.length > 0 ? errors.slice(0, 10) : null, // Limit errors in response
          warnings: warnings.length > 0 ? warnings.slice(0, 10) : null, // Include warnings
          schemaInfo: hasApprovalStatus ? 'Phase 2 schema detected' : 'Basic schema detected',
          approval_status: hasApprovalStatus ? 'auto-approved' : 'no approval system',
          auto_approved_count: hasApprovalStatus ? successCount : 0,
          date_parsing: {
            supported_formats: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD-MMM (e.g., 1-Jan)', 'ISO dates'],
            total_warnings: warnings.length,
            total_errors: errors.length
          }
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        
        // Clean up uploaded file
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Warning: Failed to clean up uploaded file during error:', unlinkError.message);
        }
        
        console.error('CSV import transaction error:', error);
        res.status(500).json({ 
          error: 'Failed to import CSV', 
          details: error.message,
          imported: successCount,
          total: results.length
        });
      } finally {
        client.release();
      }
    })
    .on('error', (streamError) => {
      console.error('CSV parsing error:', streamError);
      
      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Warning: Failed to clean up uploaded file during stream error:', unlinkError.message);
      }
      
      res.status(400).json({ 
        error: 'Failed to parse CSV file', 
        details: streamError.message 
      });
    });
});

// ==============================================================================
// PHASE 2: STORY APPROVAL ENDPOINTS (Admin only)
// ==============================================================================

// Get stories by approval status (admin/teacher view)
router.get('/admin/pending', verifyToken, isAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        s.*, 
        COALESCE(u.name, u.email) as uploaded_by_name,
        u.email as uploaded_by_email,
        u.name as uploaded_by_fullname,
        array_agg(DISTINCT t.tag_name) as tags,
        array_agg(DISTINCT i.name) as interviewees
      FROM story_ideas s
      LEFT JOIN users u ON s.uploaded_by = u.id
      LEFT JOIN story_tags st ON s.id = st.story_id
      LEFT JOIN tags t ON st.tag_id = t.id
      LEFT JOIN story_interviewees si ON s.id = si.story_id
      LEFT JOIN interviewees i ON si.interviewee_id = i.id
      WHERE s.approval_status = 'pending'
      GROUP BY s.id, u.name, u.email
      ORDER BY s.submitted_at ASC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending stories:', error);
    res.status(500).json({ error: 'Failed to fetch pending stories' });
  }
});

// Get stories by status for admin dashboard
router.get('/admin/by-status/:status', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['draft', 'pending', 'approved', 'rejected'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }
    
    const query = `
      SELECT 
        s.*, 
        COALESCE(u.name, u.email) as uploaded_by_name,
        u.email as uploaded_by_email,
        u.name as uploaded_by_fullname,
        COALESCE(approver.name, approver.email) as approved_by_name,
        approver.name as approved_by_fullname,
        array_agg(DISTINCT t.tag_name) as tags,
        array_agg(DISTINCT i.name) as interviewees
      FROM story_ideas s
      LEFT JOIN users u ON s.uploaded_by = u.id
      LEFT JOIN users approver ON s.approved_by = approver.id
      LEFT JOIN story_tags st ON s.id = st.story_id
      LEFT JOIN tags t ON st.tag_id = t.id
      LEFT JOIN story_interviewees si ON s.id = si.story_id
      LEFT JOIN interviewees i ON si.interviewee_id = i.id
      WHERE s.approval_status = $1
      GROUP BY s.id, u.name, u.email, approver.name, approver.email
      ORDER BY s.uploaded_date DESC
    `;
    
    const result = await pool.query(query, [status]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stories by status:', error);
    res.status(500).json({ error: 'Failed to fetch stories by status' });
  }
});

// Submit story for approval (user action)
router.patch('/:id/submit', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if user owns the story or is admin
    const storyCheck = await pool.query(
      'SELECT uploaded_by, approval_status FROM story_ideas WHERE id = $1',
      [id]
    );
    
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    const story = storyCheck.rows[0];
    if (story.uploaded_by !== userId && req.user.role !== 'amitrace_admin') {
      return res.status(403).json({ error: 'Access denied. You can only submit your own stories.' });
    }
    
    if (story.approval_status !== 'draft') {
      return res.status(400).json({ error: 'Story can only be submitted from draft status' });
    }
    
    // Update status to pending
    const result = await pool.query(
      `UPDATE story_ideas 
       SET approval_status = 'pending', submitted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
    
    res.json({
      message: 'Story submitted for approval',
      story: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting story for approval:', error);
    res.status(500).json({ error: 'Failed to submit story for approval' });
  }
});

// Approve story (admin only)
router.patch('/:id/approve', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;
    
    // Check if story exists and is in pending status
    const storyCheck = await pool.query(
      'SELECT approval_status FROM story_ideas WHERE id = $1',
      [id]
    );
    
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    if (storyCheck.rows[0].approval_status !== 'pending') {
      return res.status(400).json({ error: 'Story must be in pending status to approve' });
    }
    
    // Update story to approved
    const result = await pool.query(
      `UPDATE story_ideas 
       SET approval_status = 'approved', 
           approved_by = $1, 
           approved_at = CURRENT_TIMESTAMP,
           approval_notes = $2
       WHERE id = $3 
       RETURNING *`,
      [adminId, notes || null, id]
    );
    
    res.json({
      message: 'Story approved successfully',
      story: result.rows[0]
    });
  } catch (error) {
    console.error('Error approving story:', error);
    res.status(500).json({ error: 'Failed to approve story' });
  }
});

// Reject story (admin only)
router.patch('/:id/reject', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;
    
    if (!notes) {
      return res.status(400).json({ error: 'Rejection notes are required' });
    }
    
    // Check if story exists and is in pending status
    const storyCheck = await pool.query(
      'SELECT approval_status FROM story_ideas WHERE id = $1',
      [id]
    );
    
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    if (storyCheck.rows[0].approval_status !== 'pending') {
      return res.status(400).json({ error: 'Story must be in pending status to reject' });
    }
    
    // Update story to rejected
    const result = await pool.query(
      `UPDATE story_ideas 
       SET approval_status = 'rejected', 
           approved_by = $1, 
           approved_at = CURRENT_TIMESTAMP,
           approval_notes = $2
       WHERE id = $3 
       RETURNING *`,
      [adminId, notes, id]
    );
    
    res.json({
      message: 'Story rejected',
      story: result.rows[0],
      notes: notes
    });
  } catch (error) {
    console.error('Error rejecting story:', error);
    res.status(500).json({ error: 'Failed to reject story' });
  }
});

// Get approval history for a story (admin only)
router.get('/:id/approval-history', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        ah.*,
        COALESCE(u.name, u.email) as changed_by_name,
        u.name as changed_by_fullname
      FROM story_approval_history ah
      LEFT JOIN users u ON ah.changed_by = u.id
      WHERE ah.story_id = $1
      ORDER BY ah.changed_at DESC
    `;
    
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching approval history:', error);
    res.status(500).json({ error: 'Failed to fetch approval history' });
  }
});

// Get approval statistics (admin dashboard)
router.get('/admin/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        approval_status,
        COUNT(*) as count
      FROM story_ideas 
      GROUP BY approval_status
      
      UNION ALL
      
      SELECT 
        'total' as approval_status,
        COUNT(*) as count
      FROM story_ideas
    `;
    
    const recentQuery = `
      SELECT 
        COUNT(*) as count
      FROM story_ideas 
      WHERE approval_status = 'pending' 
      AND submitted_at > NOW() - INTERVAL '7 days'
    `;
    
    const [statsResult, recentResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(recentQuery)
    ]);
    
    const stats = {};
    statsResult.rows.forEach(row => {
      stats[row.approval_status] = parseInt(row.count);
    });
    
    stats.pending_this_week = parseInt(recentResult.rows[0].count);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching approval stats:', error);
    res.status(500).json({ error: 'Failed to fetch approval statistics' });
  }
});

// Bulk approve all draft/pending stories (admin utility)
router.post('/admin/bulk-approve', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status_filter = 'draft' } = req.body; // Default to approving draft stories
    const adminId = req.user.id;
    
    console.log(`Admin ${adminId} performing bulk approval for ${status_filter} stories`);
    
    // Get count first
    const countQuery = await pool.query(
      `SELECT COUNT(*) as count FROM story_ideas WHERE approval_status = $1`,
      [status_filter]
    );
    
    const storyCount = parseInt(countQuery.rows[0].count);
    
    if (storyCount === 0) {
      return res.json({
        message: `No ${status_filter} stories found to approve`,
        approved: 0,
        total: storyCount
      });
    }
    
    // Bulk approve all stories with the specified status
    const result = await pool.query(
      `UPDATE story_ideas 
       SET approval_status = 'approved', 
           approved_by = $1, 
           approved_at = CURRENT_TIMESTAMP,
           approval_notes = $2
       WHERE approval_status = $3 
       RETURNING id, idea_title`,
      [
        adminId, 
        `Bulk approved by admin on ${new Date().toISOString()}`, 
        status_filter
      ]
    );
    
    console.log(`Bulk approval completed: ${result.rows.length} stories approved`);
    
    res.json({
      message: `Successfully approved ${result.rows.length} ${status_filter} stories`,
      approved: result.rows.length,
      total: storyCount,
      approved_stories: result.rows.map(row => ({
        id: row.id,
        title: row.idea_title
      }))
    });
  } catch (error) {
    console.error('Error in bulk approve:', error);
    res.status(500).json({ error: 'Failed to bulk approve stories' });
  }
});

module.exports = router;