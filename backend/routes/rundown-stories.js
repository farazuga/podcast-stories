const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

// Helper function to check rundown access
async function checkRundownAccess(rundownId, userId, userRole) {
    if (userRole === 'amitrace_admin') {
        return true;
    }
    
    try {
        const result = await db.query(
            'SELECT created_by FROM rundowns WHERE id = $1',
            [rundownId]
        );
        
        if (result.rows.length === 0) {
            return false;
        }
        
        return result.rows[0].created_by === userId;
    } catch (error) {
        console.error('Error checking rundown access:', error);
        return false;
    }
}

// Get stories linked to a rundown
router.get('/rundown/:rundownId', verifyToken, async (req, res) => {
    try {
        const { rundownId } = req.params;
        const { userId, role } = req.user;
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundownId, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        const result = await db.query(`
            SELECT 
                rs.*,
                si.idea_title,
                si.idea_description,
                si.question_1,
                si.question_2,
                si.question_3,
                si.question_4,
                si.question_5,
                si.question_6,
                si.coverage_start_date,
                si.coverage_end_date,
                si.uploaded_by,
                u.name as story_author,
                seg.title as segment_title
            FROM rundown_stories rs
            JOIN story_ideas si ON rs.story_id = si.id
            LEFT JOIN users u ON si.uploaded_by = u.id
            LEFT JOIN rundown_segments seg ON rs.segment_id = seg.id
            WHERE rs.rundown_id = $1
            ORDER BY rs.order_index ASC
        `, [rundownId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching rundown stories:', error);
        res.status(500).json({ error: 'Failed to fetch rundown stories' });
    }
});

// Add story to rundown
router.post('/', verifyToken, async (req, res) => {
    try {
        const { rundown_id, story_id, segment_id, order_index, notes } = req.body;
        const { userId, role } = req.user;
        
        if (!rundown_id || !story_id) {
            return res.status(400).json({ error: 'Rundown ID and story ID are required' });
        }
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundown_id, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        // Verify story exists and is accessible
        const storyResult = await db.query(
            'SELECT id, idea_title FROM story_ideas WHERE id = $1 AND is_approved = true',
            [story_id]
        );
        
        if (storyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Story not found or not approved' });
        }
        
        // Check if story is already in this rundown
        const existingResult = await db.query(
            'SELECT id FROM rundown_stories WHERE rundown_id = $1 AND story_id = $2',
            [rundown_id, story_id]
        );
        
        if (existingResult.rows.length > 0) {
            return res.status(400).json({ error: 'Story already exists in this rundown' });
        }
        
        // Determine order_index if not provided
        let finalOrderIndex = order_index;
        if (!finalOrderIndex) {
            const maxResult = await db.query(
                'SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM rundown_stories WHERE rundown_id = $1',
                [rundown_id]
            );
            finalOrderIndex = maxResult.rows[0].next_order;
        }
        
        const result = await db.query(`
            INSERT INTO rundown_stories (rundown_id, story_id, segment_id, order_index, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [rundown_id, story_id, segment_id, finalOrderIndex, notes]);
        
        // Get the full story details for response
        const fullResult = await db.query(`
            SELECT 
                rs.*,
                si.idea_title,
                si.idea_description,
                u.name as story_author
            FROM rundown_stories rs
            JOIN story_ideas si ON rs.story_id = si.id
            LEFT JOIN users u ON si.uploaded_by = u.id
            WHERE rs.id = $1
        `, [result.rows[0].id]);
        
        res.status(201).json(fullResult.rows[0]);
    } catch (error) {
        console.error('Error adding story to rundown:', error);
        if (error.code === '23505') {
            res.status(400).json({ error: 'Story already exists in this rundown' });
        } else {
            res.status(500).json({ error: 'Failed to add story to rundown' });
        }
    }
});

// Update rundown story
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const rundownStoryId = req.params.id;
        const { segment_id, order_index, notes } = req.body;
        const { userId, role } = req.user;
        
        // Get rundown_id for access check
        const rundownStoryResult = await db.query(
            'SELECT rundown_id FROM rundown_stories WHERE id = $1',
            [rundownStoryId]
        );
        
        if (rundownStoryResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rundown story not found' });
        }
        
        const rundownId = rundownStoryResult.rows[0].rundown_id;
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundownId, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        const result = await db.query(`
            UPDATE rundown_stories
            SET segment_id = COALESCE($1, segment_id),
                order_index = COALESCE($2, order_index),
                notes = COALESCE($3, notes)
            WHERE id = $4
            RETURNING *
        `, [segment_id, order_index, notes, rundownStoryId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rundown story not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating rundown story:', error);
        res.status(500).json({ error: 'Failed to update rundown story' });
    }
});

// Remove story from rundown
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const rundownStoryId = req.params.id;
        const { userId, role } = req.user;
        
        // Get rundown_id for access check
        const rundownStoryResult = await db.query(
            'SELECT rundown_id FROM rundown_stories WHERE id = $1',
            [rundownStoryId]
        );
        
        if (rundownStoryResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rundown story not found' });
        }
        
        const rundownId = rundownStoryResult.rows[0].rundown_id;
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundownId, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        const result = await db.query(
            'DELETE FROM rundown_stories WHERE id = $1 RETURNING *',
            [rundownStoryId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rundown story not found' });
        }
        
        res.json({ message: 'Story removed from rundown successfully' });
    } catch (error) {
        console.error('Error removing story from rundown:', error);
        res.status(500).json({ error: 'Failed to remove story from rundown' });
    }
});

// Browse available stories for adding to rundown
router.get('/browse/:rundownId', verifyToken, async (req, res) => {
    try {
        const { rundownId } = req.params;
        const { userId, role } = req.user;
        const { search, tag, limit = 50, offset = 0 } = req.query;
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundownId, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        let whereClause = 'WHERE si.is_approved = true';
        let params = [rundownId];
        let paramIndex = 2;
        
        // Add search filter
        if (search) {
            whereClause += ` AND (si.idea_title ILIKE $${paramIndex} OR si.idea_description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        // Add tag filter
        if (tag) {
            whereClause += ` AND EXISTS (
                SELECT 1 FROM story_tags st 
                JOIN tags t ON st.tag_id = t.id 
                WHERE st.story_id = si.id AND t.tag_name = $${paramIndex}
            )`;
            params.push(tag);
            paramIndex++;
        }
        
        const query = `
            SELECT 
                si.*,
                u.name as author_name,
                CASE WHEN rs.story_id IS NOT NULL THEN true ELSE false END as already_in_rundown,
                ARRAY_AGG(DISTINCT t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL) as tags
            FROM story_ideas si
            LEFT JOIN users u ON si.uploaded_by = u.id
            LEFT JOIN rundown_stories rs ON rs.story_id = si.id AND rs.rundown_id = $1
            LEFT JOIN story_tags st ON si.id = st.story_id
            LEFT JOIN tags t ON st.tag_id = t.id
            ${whereClause}
            GROUP BY si.id, u.name, rs.story_id
            ORDER BY si.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        
        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(DISTINCT si.id)
            FROM story_ideas si
            LEFT JOIN story_tags st ON si.id = st.story_id
            LEFT JOIN tags t ON st.tag_id = t.id
            ${whereClause.replace(/AND rs\.rundown_id = \$1/, '')}
        `;
        
        const countParams = params.slice(1, -2); // Remove rundown_id, limit, offset
        const countResult = await db.query(countQuery, countParams);
        
        res.json({
            stories: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error browsing stories for rundown:', error);
        res.status(500).json({ error: 'Failed to browse stories' });
    }
});

// Export rundown as PDF
router.get('/export/:rundownId', verifyToken, async (req, res) => {
    try {
        const { rundownId } = req.params;
        const { userId, role } = req.user;
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundownId, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        // Get full rundown data
        const [rundownResult, segmentsResult, talentResult, storiesResult] = await Promise.all([
            db.query(`
                SELECT r.*, u.name as creator_name, c.class_name
                FROM rundowns r
                LEFT JOIN users u ON r.created_by = u.id
                LEFT JOIN classes c ON r.class_id = c.id
                WHERE r.id = $1
            `, [rundownId]),
            
            db.query(`
                SELECT * FROM rundown_segments
                WHERE rundown_id = $1
                ORDER BY order_index ASC
            `, [rundownId]),
            
            db.query(`
                SELECT * FROM rundown_talent
                WHERE rundown_id = $1
                ORDER BY role, name
            `, [rundownId]),
            
            db.query(`
                SELECT rs.*, si.idea_title, si.idea_description, si.question_1, si.question_2, si.question_3
                FROM rundown_stories rs
                JOIN story_ideas si ON rs.story_id = si.id
                WHERE rs.rundown_id = $1
                ORDER BY rs.order_index ASC
            `, [rundownId])
        ]);
        
        if (rundownResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rundown not found' });
        }
        
        const rundown = rundownResult.rows[0];
        const segments = segmentsResult.rows;
        const talent = talentResult.rows;
        const stories = storiesResult.rows;
        
        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        
        // Set response headers for PDF download
        const filename = `rundown-${rundown.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Pipe PDF to response
        doc.pipe(res);
        
        // PDF Header
        doc.fontSize(24).font('Helvetica-Bold').text('VidPOD Rundown', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(18).font('Helvetica').text(rundown.title, { align: 'center' });
        doc.moveDown(1);
        
        // Rundown Info
        doc.fontSize(12).font('Helvetica-Bold').text('Rundown Details:');
        doc.font('Helvetica').text(`Created by: ${rundown.creator_name}`);
        if (rundown.class_name) {
            doc.text(`Class: ${rundown.class_name}`);
        }
        if (rundown.scheduled_date) {
            doc.text(`Scheduled: ${new Date(rundown.scheduled_date).toLocaleString()}`);
        }
        doc.text(`Status: ${rundown.status}`);
        if (rundown.description) {
            doc.text(`Description: ${rundown.description}`);
        }
        doc.moveDown(1);
        
        // Talent Section
        if (talent.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('Talent:');
            talent.forEach(person => {
                doc.fontSize(12).font('Helvetica').text(`• ${person.name} (${person.role})`);
                if (person.bio) {
                    doc.fontSize(10).text(`  Bio: ${person.bio}`);
                }
            });
            doc.moveDown(1);
        }
        
        // Segments Section
        if (segments.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('Rundown Segments:');
            doc.moveDown(0.5);
            
            segments.forEach((segment, index) => {
                const duration = segment.duration ? `${Math.floor(segment.duration / 60)}:${String(segment.duration % 60).padStart(2, '0')}` : 'N/A';
                
                doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${segment.title} (${duration})`);
                doc.font('Helvetica').text(`   Type: ${segment.type}`);
                
                if (segment.content && Object.keys(segment.content).length > 0) {
                    if (segment.content.questions && Array.isArray(segment.content.questions)) {
                        doc.text('   Questions:');
                        segment.content.questions.forEach(question => {
                            doc.fontSize(10).text(`     • ${question}`);
                        });
                        doc.fontSize(12);
                    }
                    if (segment.content.script) {
                        doc.text(`   Script: ${segment.content.script}`);
                    }
                }
                
                if (segment.notes) {
                    doc.text(`   Notes: ${segment.notes}`);
                }
                
                doc.moveDown(0.5);
            });
        }
        
        // Stories Section
        if (stories.length > 0) {
            doc.addPage();
            doc.fontSize(14).font('Helvetica-Bold').text('Referenced Stories:');
            doc.moveDown(0.5);
            
            stories.forEach((story, index) => {
                doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${story.idea_title}`);
                doc.font('Helvetica').text(`Description: ${story.idea_description}`);
                
                // Add interview questions if available
                const questions = [story.question_1, story.question_2, story.question_3]
                    .filter(q => q && q.trim());
                
                if (questions.length > 0) {
                    doc.text('Interview Questions:');
                    questions.forEach(question => {
                        doc.fontSize(10).text(`   • ${question}`);
                    });
                    doc.fontSize(12);
                }
                
                if (story.notes) {
                    doc.text(`Notes: ${story.notes}`);
                }
                
                doc.moveDown(0.8);
            });
        }
        
        // Footer
        doc.fontSize(8).text(`Generated on ${new Date().toLocaleString()} by VidPOD Rundown System`, 
            50, doc.page.height - 50);
        
        // Finalize PDF
        doc.end();
        
    } catch (error) {
        console.error('Error exporting rundown PDF:', error);
        res.status(500).json({ error: 'Failed to export rundown as PDF' });
    }
});

module.exports = router;