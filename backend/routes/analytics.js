const express = require('express');
const { Pool } = require('pg');
const { authenticateToken, requireTeacherOrAdmin } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Track story interaction
router.post('/track', authenticateToken, async (req, res) => {
  try {
    const { story_id, action_type, session_id, metadata } = req.body;
    const user_id = req.user.id;
    
    // Valid action types
    const validActions = ['view', 'play', 'download', 'share'];
    if (!validActions.includes(action_type)) {
      return res.status(400).json({ error: 'Invalid action type' });
    }
    
    // Track story analytics
    await pool.query(
      'INSERT INTO story_analytics (story_id, user_id, action_type, session_id, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
      [story_id, user_id, action_type, session_id, req.ip, req.get('User-Agent')]
    );
    
    // Update user engagement for today
    await pool.query(`
      INSERT INTO user_engagement (user_id, date, stories_viewed, last_activity)
      VALUES ($1, CURRENT_DATE, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, date)
      DO UPDATE SET 
        stories_viewed = user_engagement.stories_viewed + 1,
        last_activity = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `, [user_id]);
    
    res.json({ success: true, message: 'Analytics tracked' });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    res.status(500).json({ error: 'Failed to track analytics' });
  }
});

// Get teacher analytics dashboard
router.get('/teacher/dashboard', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const teacher_id = req.user.id;
    const days = parseInt(req.query.days) || 30;
    
    // Get teacher's class analytics
    const classAnalytics = await pool.query(`
      SELECT 
        c.id,
        c.class_name,
        c.class_code,
        COUNT(DISTINCT e.student_id) as student_count,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.activity_type = 'story_view') as story_views,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.activity_type = 'favorite') as favorites_made,
        COUNT(DISTINCT ca.story_id) as unique_stories_viewed,
        MAX(ca.created_at) as last_activity
      FROM classes c
      LEFT JOIN enrollments e ON c.id = e.class_id
      LEFT JOIN class_analytics ca ON c.id = ca.class_id AND ca.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      WHERE c.teacher_id = $1 AND c.is_active = true
      GROUP BY c.id, c.class_name, c.class_code
      ORDER BY c.created_at DESC
    `, [teacher_id]);
    
    // Get most popular stories in teacher's classes
    const popularStories = await pool.query(`
      SELECT 
        s.id,
        s.idea_title as title,
        COUNT(DISTINCT ca.student_id) as view_count,
        COUNT(DISTINCT uf.user_id) as favorite_count
      FROM story_ideas s
      JOIN class_analytics ca ON s.id = ca.story_id
      JOIN classes c ON ca.class_id = c.id
      LEFT JOIN user_favorites uf ON s.id = uf.story_id
      WHERE c.teacher_id = $1 AND ca.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY s.id, s.idea_title
      ORDER BY view_count DESC, favorite_count DESC
      LIMIT 10
    `, [teacher_id]);
    
    // Get student engagement for teacher's classes
    const studentEngagement = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.name,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.activity_type = 'story_view') as story_views,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.activity_type = 'favorite') as favorites_made,
        MAX(ca.created_at) as last_activity,
        c.class_name
      FROM users u
      JOIN enrollments e ON u.id = e.student_id
      JOIN classes c ON e.class_id = c.id
      LEFT JOIN class_analytics ca ON u.id = ca.student_id AND c.id = ca.class_id 
        AND ca.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      WHERE c.teacher_id = $1 AND u.is_active = true
      GROUP BY u.id, u.username, u.name, c.class_name
      ORDER BY story_views DESC, favorites_made DESC
    `, [teacher_id]);
    
    // Get activity timeline
    const activityTimeline = await pool.query(`
      SELECT 
        DATE(ca.created_at) as date,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.activity_type = 'story_view') as views,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.activity_type = 'favorite') as favorites,
        COUNT(DISTINCT ca.student_id) as active_students
      FROM class_analytics ca
      JOIN classes c ON ca.class_id = c.id
      WHERE c.teacher_id = $1 AND ca.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(ca.created_at)
      ORDER BY date DESC
    `, [teacher_id]);
    
    res.json({
      classes: classAnalytics.rows,
      popular_stories: popularStories.rows,
      student_engagement: studentEngagement.rows,
      activity_timeline: activityTimeline.rows,
      period_days: days
    });
  } catch (error) {
    console.error('Error fetching teacher analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get admin analytics dashboard
router.get('/admin/dashboard', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'admin' && user.role !== 'amitrace_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const days = parseInt(req.query.days) || 30;
    
    // Overall platform statistics
    const platformStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student' AND u.is_active = true) as total_students,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'teacher' AND u.is_active = true) as total_teachers,
        COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = true) as total_classes,
        COUNT(DISTINCT s.id) FILTER (WHERE s.is_approved = true) as total_stories,
        COUNT(DISTINCT uf.id) as total_favorites
      FROM users u
      FULL OUTER JOIN classes c ON u.id = c.teacher_id
      FULL OUTER JOIN stories s ON u.id = s.uploaded_by
      FULL OUTER JOIN user_favorites uf ON u.id = uf.user_id
    `);
    
    // Most active teachers
    const activeTeachers = await pool.query(`
      SELECT * FROM teacher_analytics
      ORDER BY total_activities DESC
      LIMIT 10
    `);
    
    // Most popular stories platform-wide
    const popularStories = await pool.query(`
      SELECT * FROM story_popularity
      LIMIT 20
    `);
    
    // Recent activity trends
    const activityTrends = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE action_type = 'view') as story_views,
        COUNT(*) FILTER (WHERE action_type = 'play') as story_plays,
        COUNT(DISTINCT user_id) as active_users
      FROM story_analytics
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    // User growth over time
    const userGrowth = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE role = 'student') as new_students,
        COUNT(*) FILTER (WHERE role = 'teacher') as new_teachers
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    res.json({
      platform_stats: platformStats.rows[0],
      active_teachers: activeTeachers.rows,
      popular_stories: popularStories.rows,
      activity_trends: activityTrends.rows,
      user_growth: userGrowth.rows,
      period_days: days
    });
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get class-specific analytics
router.get('/class/:classId', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const teacher_id = req.user.id;
    const days = parseInt(req.query.days) || 30;
    
    // Verify teacher owns this class or is admin
    if (req.user.role !== 'admin' && req.user.role !== 'amitrace_admin') {
      const classCheck = await pool.query(
        'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
        [classId, teacher_id]
      );
      
      if (classCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }
    }
    
    // Get class details and metrics
    const classDetails = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT e.student_id) as enrolled_students,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.activity_type = 'story_view') as total_story_views,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.activity_type = 'favorite') as total_favorites,
        COUNT(DISTINCT ca.story_id) as unique_stories_viewed,
        u.username as teacher_username
      FROM classes c
      JOIN users u ON c.teacher_id = u.id
      LEFT JOIN enrollments e ON c.id = e.class_id
      LEFT JOIN class_analytics ca ON c.id = ca.class_id AND ca.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      WHERE c.id = $1
      GROUP BY c.id, u.username
    `, [classId]);
    
    // Get student activity in this class
    const studentActivity = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.name,
        e.joined_at,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.activity_type = 'story_view') as story_views,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.activity_type = 'favorite') as favorites_made,
        MAX(ca.created_at) as last_activity
      FROM users u
      JOIN enrollments e ON u.id = e.student_id
      LEFT JOIN class_analytics ca ON u.id = ca.student_id AND e.class_id = ca.class_id
        AND ca.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      WHERE e.class_id = $1
      GROUP BY u.id, u.username, u.name, e.joined_at
      ORDER BY story_views DESC, favorites_made DESC
    `, [classId]);
    
    // Get most viewed stories in this class
    const classStoryViews = await pool.query(`
      SELECT 
        s.id,
        s.idea_title as title,
        COUNT(DISTINCT ca.student_id) as view_count,
        COUNT(DISTINCT uf.user_id) FILTER (WHERE uf.user_id IN (
          SELECT student_id FROM enrollments WHERE class_id = $1
        )) as favorite_count_in_class
      FROM story_ideas s
      JOIN class_analytics ca ON s.id = ca.story_id
      LEFT JOIN user_favorites uf ON s.id = uf.story_id
      WHERE ca.class_id = $1 AND ca.activity_type = 'story_view'
        AND ca.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY s.id, s.idea_title
      ORDER BY view_count DESC
      LIMIT 15
    `, [classId]);
    
    res.json({
      class_details: classDetails.rows[0],
      student_activity: studentActivity.rows,
      story_views: classStoryViews.rows,
      period_days: days
    });
  } catch (error) {
    console.error('Error fetching class analytics:', error);
    res.status(500).json({ error: 'Failed to fetch class analytics' });
  }
});

module.exports = router;