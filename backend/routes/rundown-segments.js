const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Helper function to reorder segments after insert/delete
async function reorderSegments(rundownId) {
    try {
        // Get all segments ordered by current order_index
        const result = await db.query(`
            SELECT id FROM rundown_segments 
            WHERE rundown_id = $1 
            ORDER BY is_pinned DESC, order_index ASC, id ASC
        `, [rundownId]);
        
        // Update order_index for each segment
        for (let i = 0; i < result.rows.length; i++) {
            await db.query(`
                UPDATE rundown_segments 
                SET order_index = $1 
                WHERE id = $2
            `, [i, result.rows[i].id]);
        }
        
        return true;
    } catch (error) {
        console.error('Error reordering segments:', error);
        return false;
    }
}

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

// Get segments for a rundown
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
            SELECT * FROM rundown_segments 
            WHERE rundown_id = $1 
            ORDER BY order_index ASC
        `, [rundownId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching segments:', error);
        res.status(500).json({ error: 'Failed to fetch segments' });
    }
});

// Create new segment
router.post('/', verifyToken, async (req, res) => {
    try {
        const { rundown_id, title, type, content, duration, notes, insert_position } = req.body;
        const { userId, role } = req.user;
        
        if (!rundown_id || !title || !type) {
            return res.status(400).json({ error: 'Rundown ID, title, and type are required' });
        }
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundown_id, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        // Determine order_index
        let orderIndex = insert_position || 0;
        
        // If no specific position, insert before outro (if exists)
        if (!insert_position) {
            const outroResult = await db.query(`
                SELECT order_index FROM rundown_segments 
                WHERE rundown_id = $1 AND type = 'outro'
                ORDER BY order_index DESC LIMIT 1
            `, [rundown_id]);
            
            if (outroResult.rows.length > 0) {
                orderIndex = outroResult.rows[0].order_index;
            } else {
                // No outro, append to end
                const maxResult = await db.query(`
                    SELECT COALESCE(MAX(order_index), -1) + 1 as next_order
                    FROM rundown_segments WHERE rundown_id = $1
                `, [rundown_id]);
                orderIndex = maxResult.rows[0].next_order;
            }
        }
        
        // Shift existing segments if needed
        if (type !== 'outro') {
            await db.query(`
                UPDATE rundown_segments 
                SET order_index = order_index + 1 
                WHERE rundown_id = $1 AND order_index >= $2
            `, [rundown_id, orderIndex]);
        }
        
        const result = await db.query(`
            INSERT INTO rundown_segments (rundown_id, title, type, content, duration, order_index, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [rundown_id, title, type, content || {}, duration || 0, orderIndex, notes]);
        
        // Reorder segments to ensure consistency
        await reorderSegments(rundown_id);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating segment:', error);
        res.status(500).json({ error: 'Failed to create segment' });
    }
});

// Update segment
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const segmentId = req.params.id;
        const { title, type, content, duration, notes } = req.body;
        const { userId, role } = req.user;
        
        // Get rundown_id for access check
        const segmentResult = await db.query('SELECT rundown_id FROM rundown_segments WHERE id = $1', [segmentId]);
        if (segmentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Segment not found' });
        }
        
        const rundownId = segmentResult.rows[0].rundown_id;
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundownId, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        const result = await db.query(`
            UPDATE rundown_segments
            SET title = COALESCE($1, title),
                type = COALESCE($2, type),
                content = COALESCE($3, content),
                duration = COALESCE($4, duration),
                notes = COALESCE($5, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [title, type, content, duration, notes, segmentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Segment not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating segment:', error);
        res.status(500).json({ error: 'Failed to update segment' });
    }
});

// Reorder segments (drag and drop support)
router.put('/reorder', verifyToken, async (req, res) => {
    try {
        const { rundown_id, segment_orders } = req.body;
        const { userId, role } = req.user;
        
        if (!rundown_id || !Array.isArray(segment_orders)) {
            return res.status(400).json({ error: 'Rundown ID and segment orders array are required' });
        }
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundown_id, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        // Update order for each segment
        const updates = segment_orders.map((item, index) => 
            db.query(`
                UPDATE rundown_segments 
                SET order_index = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND rundown_id = $3
            `, [index, item.id, rundown_id])
        );
        
        await Promise.all(updates);
        
        // Fetch updated segments
        const result = await db.query(`
            SELECT * FROM rundown_segments 
            WHERE rundown_id = $1 
            ORDER BY order_index ASC
        `, [rundown_id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error reordering segments:', error);
        res.status(500).json({ error: 'Failed to reorder segments' });
    }
});

// Delete segment
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const segmentId = req.params.id;
        const { userId, role } = req.user;
        
        // Get rundown_id for access check
        const segmentResult = await db.query('SELECT rundown_id, is_pinned FROM rundown_segments WHERE id = $1', [segmentId]);
        if (segmentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Segment not found' });
        }
        
        const { rundown_id, is_pinned } = segmentResult.rows[0];
        
        // Prevent deletion of pinned segments (intro/outro)
        if (is_pinned) {
            return res.status(400).json({ error: 'Cannot delete pinned segments (intro/outro)' });
        }
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(rundown_id, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        const result = await db.query('DELETE FROM rundown_segments WHERE id = $1 RETURNING *', [segmentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Segment not found' });
        }
        
        // Reorder remaining segments
        await reorderSegments(rundown_id);
        
        res.json({ message: 'Segment deleted successfully' });
    } catch (error) {
        console.error('Error deleting segment:', error);
        res.status(500).json({ error: 'Failed to delete segment' });
    }
});

// Duplicate segment
router.post('/:id/duplicate', verifyToken, async (req, res) => {
    try {
        const segmentId = req.params.id;
        const { userId, role } = req.user;
        
        // Get original segment
        const segmentResult = await db.query('SELECT * FROM rundown_segments WHERE id = $1', [segmentId]);
        if (segmentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Segment not found' });
        }
        
        const segment = segmentResult.rows[0];
        
        // Check access to rundown
        const hasAccess = await checkRundownAccess(segment.rundown_id, userId, role);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this rundown' });
        }
        
        // Create duplicate
        const result = await db.query(`
            INSERT INTO rundown_segments (rundown_id, title, type, content, duration, order_index, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
            segment.rundown_id,
            segment.title + ' (Copy)',
            segment.type,
            segment.content,
            segment.duration,
            segment.order_index + 1,
            segment.notes
        ]);
        
        // Shift other segments
        await db.query(`
            UPDATE rundown_segments 
            SET order_index = order_index + 1 
            WHERE rundown_id = $1 AND order_index > $2 AND id != $3
        `, [segment.rundown_id, segment.order_index, result.rows[0].id]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error duplicating segment:', error);
        res.status(500).json({ error: 'Failed to duplicate segment' });
    }
});

module.exports = router;