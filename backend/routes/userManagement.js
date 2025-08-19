/**
 * USER MANAGEMENT ROUTES
 * 
 * Comprehensive user management system for VidPOD
 * Features:
 * - Teacher and Admin management
 * - Hard delete with CASCADE
 * - Multi-select bulk operations
 * - Super admin role management
 * - Deletion impact analysis
 */

const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { verifyToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      error: 'Access denied. Super admin privileges required.' 
    });
  }
  next();
};

// ============================================================================
// TEACHER MANAGEMENT ENDPOINTS
// ============================================================================

// GET /api/user-management/teachers - List all teachers with statistics
router.get('/teachers', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log(`📋 User Management: Fetching teachers list for ${req.user.email}`);
    
    const query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.username,
        u.created_at,
        s.school_name,
        COALESCE(class_stats.class_count, 0) as class_count,
        COALESCE(student_stats.student_count, 0) as student_count,
        COALESCE(story_stats.story_count, 0) as story_count
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN (
        SELECT teacher_id, COUNT(*) as class_count
        FROM classes 
        WHERE is_active = true
        GROUP BY teacher_id
      ) class_stats ON u.id = class_stats.teacher_id
      LEFT JOIN (
        SELECT c.teacher_id, COUNT(DISTINCT uc.user_id) as student_count
        FROM classes c
        JOIN user_classes uc ON c.id = uc.class_id
        WHERE c.is_active = true
        GROUP BY c.teacher_id
      ) student_stats ON u.id = student_stats.teacher_id
      LEFT JOIN (
        SELECT uploaded_by, COUNT(*) as story_count
        FROM story_ideas
        GROUP BY uploaded_by
      ) story_stats ON u.id = story_stats.uploaded_by
      WHERE u.role = 'teacher'
      ORDER BY u.created_at DESC
    `;
    
    const result = await pool.query(query);
    console.log(`✅ Found ${result.rows.length} teachers`);
    
    res.json({
      teachers: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// GET /api/user-management/teacher/:id/impact - Get deletion impact for teacher
router.get('/teacher/:id/impact', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Analyzing deletion impact for teacher ${id}`);
    
    // Check if teacher exists
    const teacherCheck = await pool.query(
      'SELECT email, name FROM users WHERE id = $1 AND role = $2',
      [id, 'teacher']
    );
    
    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Get deletion impact using the database function
    const impactResult = await pool.query(
      'SELECT get_user_deletion_impact($1) as impact',
      [id]
    );
    
    const impact = impactResult.rows[0].impact;
    const teacher = teacherCheck.rows[0];
    
    console.log(`📊 Deletion impact for ${teacher.email}:`, impact);
    
    res.json({
      teacher: teacher,
      impact: impact
    });
  } catch (error) {
    console.error('❌ Error analyzing deletion impact:', error);
    res.status(500).json({ error: 'Failed to analyze deletion impact' });
  }
});

// DELETE /api/user-management/teacher/:id - Hard delete teacher with cascade
router.delete('/teacher/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Hard deleting teacher ${id} by ${req.user.email}`);
    
    // Check if teacher exists and get info for logging
    const teacherCheck = await pool.query(
      'SELECT email, name FROM users WHERE id = $1 AND role = $2',
      [id, 'teacher']
    );
    
    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    const teacher = teacherCheck.rows[0];
    
    // Get deletion impact before deletion
    const impactResult = await pool.query(
      'SELECT get_user_deletion_impact($1) as impact',
      [id]
    );
    const impact = impactResult.rows[0].impact;
    
    // Perform hard delete (CASCADE will handle related records)
    const deleteResult = await pool.query(
      'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id',
      [id, 'teacher']
    );
    
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found or already deleted' });
    }
    
    console.log(`✅ Successfully deleted teacher ${teacher.email} and cascaded data:`, impact);
    
    res.json({
      message: 'Teacher deleted successfully',
      deleted_teacher: teacher,
      cascaded_deletions: impact
    });
  } catch (error) {
    console.error('❌ Error deleting teacher:', error);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

// ============================================================================
// ADMIN MANAGEMENT ENDPOINTS
// ============================================================================

// GET /api/user-management/admins - List all admins (super admin only)
router.get('/admins', verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    console.log(`👑 Super Admin: Fetching admins list for ${req.user.email}`);
    
    const query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.username,
        u.role,
        u.created_at,
        COALESCE(story_stats.story_count, 0) as story_count
      FROM users u
      LEFT JOIN (
        SELECT uploaded_by, COUNT(*) as story_count
        FROM story_ideas
        GROUP BY uploaded_by
      ) story_stats ON u.id = story_stats.uploaded_by
      WHERE u.role IN ('amitrace_admin', 'super_admin')
      ORDER BY 
        CASE u.role 
          WHEN 'super_admin' THEN 1 
          WHEN 'amitrace_admin' THEN 2 
        END,
        u.created_at DESC
    `;
    
    const result = await pool.query(query);
    console.log(`✅ Found ${result.rows.length} admin users`);
    
    res.json({
      admins: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// POST /api/user-management/admin - Create new admin (super admin only)
router.post('/admin', verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    
    console.log(`👑 Creating new admin: ${email} with role ${role} by ${req.user.email}`);
    
    // Validate required fields
    if (!email || !name || !password || !role) {
      return res.status(400).json({ 
        error: 'Email, name, password, and role are required' 
      });
    }
    
    // Validate role
    if (!['amitrace_admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ 
        error: 'Role must be either amitrace_admin or super_admin' 
      });
    }
    
    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create admin user
    const createAdmin = await pool.query(
      `INSERT INTO users (email, password, name, role, created_at) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
       RETURNING id, email, name, role, created_at`,
      [email, hashedPassword, name, role]
    );
    
    const newAdmin = createAdmin.rows[0];
    console.log(`✅ Successfully created admin: ${newAdmin.email} (${newAdmin.role})`);
    
    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        created_at: newAdmin.created_at
      }
    });
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// DELETE /api/user-management/admin/:id - Delete admin (super admin only)
router.delete('/admin/:id', verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`👑 Deleting admin ${id} by ${req.user.email}`);
    
    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        error: 'Cannot delete your own account' 
      });
    }
    
    // Check if admin exists
    const adminCheck = await pool.query(
      'SELECT email, name, role FROM users WHERE id = $1 AND role IN ($2, $3)',
      [id, 'amitrace_admin', 'super_admin']
    );
    
    if (adminCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    const admin = adminCheck.rows[0];
    
    // Get deletion impact
    const impactResult = await pool.query(
      'SELECT get_user_deletion_impact($1) as impact',
      [id]
    );
    const impact = impactResult.rows[0].impact;
    
    // Perform hard delete
    const deleteResult = await pool.query(
      'DELETE FROM users WHERE id = $1 AND role IN ($2, $3) RETURNING id',
      [id, 'amitrace_admin', 'super_admin']
    );
    
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found or already deleted' });
    }
    
    console.log(`✅ Successfully deleted admin ${admin.email} (${admin.role})`);
    
    res.json({
      message: 'Admin deleted successfully',
      deleted_admin: admin,
      cascaded_deletions: impact
    });
  } catch (error) {
    console.error('❌ Error deleting admin:', error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

// POST /api/user-management/bulk-delete - Bulk delete users
router.post('/bulk-delete', verifyToken, isAdmin, async (req, res) => {
  try {
    const { user_ids, user_type } = req.body;
    
    console.log(`🔄 Bulk delete ${user_type}s: ${user_ids.length} users by ${req.user.email}`);
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids array is required' });
    }
    
    if (!['teacher', 'admin'].includes(user_type)) {
      return res.status(400).json({ error: 'user_type must be teacher or admin' });
    }
    
    // For admin deletions, require super admin
    if (user_type === 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Super admin privileges required for admin deletion' 
      });
    }
    
    // Prevent self-deletion in bulk operations
    if (user_ids.includes(req.user.id)) {
      return res.status(400).json({ 
        error: 'Cannot delete your own account in bulk operation' 
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const deleted_users = [];
      const total_impact = {
        classes_to_delete: 0,
        students_to_unenroll: 0,
        stories_to_delete: 0,
        favorites_to_delete: 0
      };
      
      // Process each user
      for (const user_id of user_ids) {
        // Get user info
        const userCheck = await client.query(
          user_type === 'teacher' 
            ? 'SELECT email, name, role FROM users WHERE id = $1 AND role = $2'
            : 'SELECT email, name, role FROM users WHERE id = $1 AND role IN ($2, $3)',
          user_type === 'teacher' 
            ? [user_id, 'teacher']
            : [user_id, 'amitrace_admin', 'super_admin']
        );
        
        if (userCheck.rows.length === 0) {
          console.log(`⚠️ User ${user_id} not found or invalid type, skipping`);
          continue;
        }
        
        // Get impact
        const impactResult = await client.query(
          'SELECT get_user_deletion_impact($1) as impact',
          [user_id]
        );
        const impact = impactResult.rows[0].impact;
        
        // Accumulate impact
        total_impact.classes_to_delete += impact.classes_to_delete;
        total_impact.students_to_unenroll += impact.students_to_unenroll;
        total_impact.stories_to_delete += impact.stories_to_delete;
        total_impact.favorites_to_delete += impact.favorites_to_delete;
        
        // Delete user
        const deleteResult = await client.query(
          'DELETE FROM users WHERE id = $1 RETURNING id',
          [user_id]
        );
        
        if (deleteResult.rows.length > 0) {
          deleted_users.push({
            id: user_id,
            email: userCheck.rows[0].email,
            name: userCheck.rows[0].name,
            role: userCheck.rows[0].role,
            impact: impact
          });
        }
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ Bulk delete completed: ${deleted_users.length} users deleted`);
      console.log(`📊 Total impact:`, total_impact);
      
      res.json({
        message: `Bulk delete completed successfully`,
        deleted_count: deleted_users.length,
        deleted_users: deleted_users,
        total_impact: total_impact
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error in bulk delete:', error);
    res.status(500).json({ error: 'Failed to perform bulk delete' });
  }
});

// ============================================================================
// SYSTEM STATISTICS
// ============================================================================

// GET /api/user-management/stats - Get user management statistics
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log(`📊 Fetching user management stats for ${req.user.email}`);
    
    const statsQuery = `
      SELECT 
        role,
        COUNT(*) as count
      FROM users 
      WHERE role IN ('teacher', 'amitrace_admin', 'super_admin')
      GROUP BY role
      
      UNION ALL
      
      SELECT 
        'total_manageable' as role,
        COUNT(*) as count
      FROM users 
      WHERE role IN ('teacher', 'amitrace_admin', 'super_admin')
    `;
    
    const result = await pool.query(statsQuery);
    
    const stats = {};
    result.rows.forEach(row => {
      stats[row.role] = parseInt(row.count);
    });
    
    // Ensure all roles are represented
    stats.teacher = stats.teacher || 0;
    stats.amitrace_admin = stats.amitrace_admin || 0;
    stats.super_admin = stats.super_admin || 0;
    stats.total_manageable = stats.total_manageable || 0;
    
    console.log(`📊 User management stats:`, stats);
    
    res.json(stats);
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

// GET /api/user-management/health - Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-management',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;