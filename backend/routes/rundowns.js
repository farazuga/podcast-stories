const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, isTeacherOrAbove } = require('../middleware/auth');

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

// Get all rundowns for the current user
router.get('/', verifyToken, async (req, res) => {
    try {
        const { role, userId } = req.user;
        let query, params;
        
        if (role === 'amitrace_admin') {
            // Admin can see all rundowns
            query = `
                SELECT r.*, u.name as creator_name, c.class_name
                FROM rundowns r
                LEFT JOIN users u ON r.created_by = u.id
                LEFT JOIN classes c ON r.class_id = c.id
                ORDER BY r.updated_at DESC
            `;
            params = [];
        } else if (role === 'teacher') {
            // Teachers see only their created rundowns
            query = `
                SELECT r.*, u.name as creator_name, c.class_name
                FROM rundowns r
                LEFT JOIN users u ON r.created_by = u.id
                LEFT JOIN classes c ON r.class_id = c.id
                WHERE r.created_by = $1
                ORDER BY r.updated_at DESC
            `;
            params = [userId];
        } else {
            // Students see rundowns from their enrolled classes
            query = `
                SELECT DISTINCT r.*, u.name as creator_name, c.class_name
                FROM rundowns r
                LEFT JOIN users u ON r.created_by = u.id
                LEFT JOIN classes c ON r.class_id = c.id
                INNER JOIN user_classes uc ON c.id = uc.class_id
                WHERE uc.user_id = $1 AND r.class_id IS NOT NULL
                ORDER BY r.updated_at DESC
            `;
            params = [userId];
        }
        
        const result = await db.query(query, params);
        
        // Add segment and talent counts for each rundown
        const rundowns = await Promise.all(result.rows.map(async (rundown) => {
            const [segmentResult, talentResult, storyResult] = await Promise.all([
                db.query('SELECT COUNT(*) FROM rundown_segments WHERE rundown_id = $1', [rundown.id]),
                db.query('SELECT COUNT(*) FROM rundown_talent WHERE rundown_id = $1', [rundown.id]),
                db.query('SELECT COUNT(*) FROM rundown_stories WHERE rundown_id = $1', [rundown.id])
            ]);
            
            return {
                ...rundown,
                segment_count: parseInt(segmentResult.rows[0].count),
                talent_count: parseInt(talentResult.rows[0].count),
                story_count: parseInt(storyResult.rows[0].count)
            };
        }));
        
        res.json(rundowns);
    } catch (error) {
        console.error('Error fetching rundowns:', error);
        res.status(500).json({ error: 'Failed to fetch rundowns' });
    }
});

// Create new rundown
router.post('/', verifyToken, isTeacherOrAbove, async (req, res) => {
    try {
        const { title, description, class_id, scheduled_date } = req.body;
        const { userId } = req.user;
        
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        // Verify class ownership if class_id is provided
        if (class_id) {
            const classCheck = await db.query(
                'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
                [class_id, userId]
            );
            
            if (classCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied to this class' });
            }
        }
        
        const result = await db.query(`
            INSERT INTO rundowns (title, description, created_by, class_id, scheduled_date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [title, description, userId, class_id, scheduled_date]);
        
        // Create default intro and outro segments
        await Promise.all([
            db.query(`
                INSERT INTO rundown_segments (rundown_id, title, type, order_index, is_pinned, duration)
                VALUES ($1, 'Intro', 'intro', 0, true, 60)
            `, [result.rows[0].id]),
            
            db.query(`
                INSERT INTO rundown_segments (rundown_id, title, type, order_index, is_pinned, duration)
                VALUES ($1, 'Outro', 'outro', 999, true, 30)
            `, [result.rows[0].id])
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating rundown:', error);
        res.status(500).json({ error: 'Failed to create rundown' });
    }
});

// Get specific rundown with full details
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const rundownId = req.params.id;
        const { userId, role } = req.user;
        
        // Check access
        const hasAccess = await checkRundownAccess(rundownId, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        // Get rundown with related data
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
                SELECT rs.*, si.idea_title, si.idea_description, si.uploaded_by, u.name as story_author
                FROM rundown_stories rs
                JOIN story_ideas si ON rs.story_id = si.id
                LEFT JOIN users u ON si.uploaded_by = u.id
                WHERE rs.rundown_id = $1
                ORDER BY rs.order_index ASC
            `, [rundownId])
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
        console.error('Error fetching rundown details:', error);
        res.status(500).json({ error: 'Failed to fetch rundown details' });
    }
});

// Update rundown
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const rundownId = req.params.id;
        const { userId, role } = req.user;
        const { title, description, status, scheduled_date, class_id } = req.body;
        
        // Check access
        const hasAccess = await checkRundownAccess(rundownId, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        const result = await db.query(`
            UPDATE rundowns
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                status = COALESCE($3, status),
                scheduled_date = COALESCE($4, scheduled_date),
                class_id = COALESCE($5, class_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [title, description, status, scheduled_date, class_id, rundownId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rundown not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating rundown:', error);
        res.status(500).json({ error: 'Failed to update rundown' });
    }
});

// Delete rundown
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const rundownId = req.params.id;
        const { userId, role } = req.user;
        
        // Check access
        const hasAccess = await checkRundownAccess(rundownId, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        // Delete rundown (cascade will handle related records)
        const result = await db.query('DELETE FROM rundowns WHERE id = $1 RETURNING *', [rundownId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rundown not found' });
        }
        
        res.json({ message: 'Rundown deleted successfully' });
    } catch (error) {
        console.error('Error deleting rundown:', error);
        res.status(500).json({ error: 'Failed to delete rundown' });
    }
});

module.exports = router;