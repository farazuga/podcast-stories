const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

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

// Get talent for a rundown
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
            SELECT * FROM rundown_talent 
            WHERE rundown_id = $1 
            ORDER BY 
                CASE role 
                    WHEN 'host' THEN 1 
                    WHEN 'co-host' THEN 2 
                    WHEN 'guest' THEN 3 
                    WHEN 'expert' THEN 4 
                    ELSE 5 
                END,
                name ASC
        `, [rundownId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching talent:', error);
        res.status(500).json({ error: 'Failed to fetch talent' });
    }
});

// Add talent to rundown
router.post('/', verifyToken, async (req, res) => {
    try {
        const { rundown_id, name, role, bio, contact_info, notes } = req.body;
        const { userId, role: userRole } = req.user;
        
        if (!rundown_id || !name || !role) {
            return res.status(400).json({ error: 'Rundown ID, name, and role are required' });
        }
        
        // Validate role
        const validRoles = ['host', 'co-host', 'guest', 'expert'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be: host, co-host, guest, or expert' });
        }
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundown_id, userId, userRole);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        // Check talent limit (max 4 people)
        const countResult = await db.query('SELECT COUNT(*) FROM rundown_talent WHERE rundown_id = $1', [rundown_id]);
        if (parseInt(countResult.rows[0].count) >= 4) {
            return res.status(400).json({ error: 'Maximum 4 talent members allowed per rundown' });
        }
        
        // Check for duplicate names in the same rundown
        const duplicateCheck = await db.query(
            'SELECT id FROM rundown_talent WHERE rundown_id = $1 AND name = $2',
            [rundown_id, name]
        );
        
        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Talent with this name already exists in this rundown' });
        }
        
        const result = await db.query(`
            INSERT INTO rundown_talent (rundown_id, name, role, bio, contact_info, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [rundown_id, name, role, bio, contact_info || {}, notes]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding talent:', error);
        if (error.code === '23505') {
            // Unique constraint violation
            res.status(400).json({ error: 'Talent with this name already exists in this rundown' });
        } else {
            res.status(500).json({ error: 'Failed to add talent' });
        }
    }
});

// Update talent
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const talentId = req.params.id;
        const { name, role, bio, contact_info, notes } = req.body;
        const { userId, role: userRole } = req.user;
        
        // Get rundown_id for access check
        const talentResult = await db.query('SELECT rundown_id FROM rundown_talent WHERE id = $1', [talentId]);
        if (talentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Talent not found' });
        }
        
        const rundownId = talentResult.rows[0].rundown_id;
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundownId, userId, userRole);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        // Validate role if provided
        if (role) {
            const validRoles = ['host', 'co-host', 'guest', 'expert'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ error: 'Invalid role. Must be: host, co-host, guest, or expert' });
            }
        }
        
        const result = await db.query(`
            UPDATE rundown_talent
            SET name = COALESCE($1, name),
                role = COALESCE($2, role),
                bio = COALESCE($3, bio),
                contact_info = COALESCE($4, contact_info),
                notes = COALESCE($5, notes)
            WHERE id = $6
            RETURNING *
        `, [name, role, bio, contact_info, notes, talentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Talent not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating talent:', error);
        if (error.code === '23505') {
            // Unique constraint violation
            res.status(400).json({ error: 'Talent with this name already exists in this rundown' });
        } else {
            res.status(500).json({ error: 'Failed to update talent' });
        }
    }
});

// Delete talent
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const talentId = req.params.id;
        const { userId, role: userRole } = req.user;
        
        // Get rundown_id for access check
        const talentResult = await db.query('SELECT rundown_id FROM rundown_talent WHERE id = $1', [talentId]);
        if (talentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Talent not found' });
        }
        
        const rundownId = talentResult.rows[0].rundown_id;
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundownId, userId, userRole);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        const result = await db.query('DELETE FROM rundown_talent WHERE id = $1 RETURNING *', [talentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Talent not found' });
        }
        
        res.json({ message: 'Talent deleted successfully' });
    } catch (error) {
        console.error('Error deleting talent:', error);
        res.status(500).json({ error: 'Failed to delete talent' });
    }
});

// Get talent summary for all rundowns (admin only)
router.get('/summary', verifyToken, async (req, res) => {
    try {
        const { role } = req.user;
        
        if (role !== 'amitrace_admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const result = await db.query(`
            SELECT 
                t.*,
                r.title as rundown_title,
                r.status as rundown_status,
                u.name as creator_name
            FROM rundown_talent t
            JOIN rundowns r ON t.rundown_id = r.id
            JOIN users u ON r.created_by = u.id
            ORDER BY r.updated_at DESC, t.role, t.name
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching talent summary:', error);
        res.status(500).json({ error: 'Failed to fetch talent summary' });
    }
});

// Get talent statistics
router.get('/stats/:rundownId', verifyToken, async (req, res) => {
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
                role,
                COUNT(*) as count,
                ARRAY_AGG(name ORDER BY name) as names
            FROM rundown_talent
            WHERE rundown_id = $1
            GROUP BY role
            ORDER BY 
                CASE role 
                    WHEN 'host' THEN 1 
                    WHEN 'co-host' THEN 2 
                    WHEN 'guest' THEN 3 
                    WHEN 'expert' THEN 4 
                    ELSE 5 
                END
        `, [rundownId]);
        
        const totalResult = await db.query(
            'SELECT COUNT(*) as total FROM rundown_talent WHERE rundown_id = $1',
            [rundownId]
        );
        
        res.json({
            total: parseInt(totalResult.rows[0].total),
            by_role: result.rows,
            remaining_slots: 4 - parseInt(totalResult.rows[0].total)
        });
    } catch (error) {
        console.error('Error fetching talent stats:', error);
        res.status(500).json({ error: 'Failed to fetch talent statistics' });
    }
});

module.exports = router;