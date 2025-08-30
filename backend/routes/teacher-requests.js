const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verifyToken, isAmitraceAdmin } = require('../middleware/auth');
const emailService = require('../services/emailService');
const gmailService = require('../services/gmailService');
const passwordGenerator = require('../utils/passwordGenerator');
const validationHelpers = require('../utils/validationHelpers');
const tokenUtils = require('../utils/tokenUtils');
const { createLogger } = require('../utils/logger');
const bcrypt = require('bcrypt');

// Create logger instance
const logger = createLogger('teacher-requests');
const isProduction = process.env.NODE_ENV === 'production';
const skipOptionalColumns = process.env.SKIP_OPTIONAL_COLUMNS === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Helper function to check if a user exists by email
 * @param {object} clientOrPool - Database client or pool
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if user exists
 */
async function userExistsByEmail(clientOrPool, email) {
  const normalizedEmail = email?.trim().toLowerCase();
  const result = await clientOrPool.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [normalizedEmail]
  );
  return result.rows.length > 0;
}

/**
 * Create a generic error response based on environment
 * @param {Error} error - Error object
 * @param {string} userMessage - Message to show to user
 * @returns {object} Error response object
 */
function createErrorResponse(error, userMessage) {
  if (isProduction) {
    return { error: userMessage || 'An unexpected error occurred' };
  } else {
    return {
      error: userMessage || error.message,
      details: error.message,
      code: error.code
    };
  }
}

// Get all teacher requests (Amitrace Admin only)
router.get('/', verifyToken, isAmitraceAdmin, async (req, res) => {
  logger.info('🔍 Teacher Requests API - GET / called', {
    adminId: req.user?.id,
    adminEmail: req.user?.email,
    query: req.query,
    timestamp: new Date().toISOString(),
    skipOptionalColumns: skipOptionalColumns
  });
  
  try {
    const { status, school_id, skip_optional } = req.query;
    
    // Allow admin-only override of skipOptionalColumns via query parameter
    const shouldSkipOptional = skipOptionalColumns || (skip_optional === 'true');
    
    logger.debug('Skip optional columns decision', {
      skipOptionalColumns,
      skip_optional_param: skip_optional,
      shouldSkipOptional,
      adminId: req.user?.id
    });
    
    // Conditionally include optional columns based on environment variable or admin override
    // Optional columns: processed_at, action_type, password_set_at
    // These columns were added in migration 012_add_teacher_request_missing_columns.sql
    // Comment 12 - Always include fields as nullable placeholders for stable API contract
    const optionalFields = shouldSkipOptional ? `,
        NULL::timestamp as processed_at,
        NULL::text as action_type,
        NULL::timestamp as password_set_at` : `,
        tr.processed_at,
        tr.action_type,
        tr.password_set_at`;
    
    let query = `
      SELECT 
        tr.id,
        tr.name,
        tr.email,
        tr.message,
        tr.status,
        tr.requested_at,
        tr.approved_at,
        s.school_name,
        s.id as school_id,
        COALESCE(approved_by_user.name, approved_by_user.email) as approved_by_name${optionalFields}
      FROM teacher_requests tr
      JOIN schools s ON tr.school_id = s.id
      LEFT JOIN users approved_by_user ON tr.approved_by = approved_by_user.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (status) {
      conditions.push(`tr.status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (school_id) {
      conditions.push(`tr.school_id = $${params.length + 1}`);
      params.push(school_id);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY tr.requested_at DESC`;
    
    logger.info('🔍 Teacher Requests API - Executing query', {
      query: query,
      params: params,
      skipOptionalColumns: skipOptionalColumns,
      skip_optional_param: skip_optional,
      shouldSkipOptional: shouldSkipOptional
    });
    
    logger.info('Fetching teacher requests', { adminId: req.user?.id, filters: req.query });
    const result = await pool.query(query, params);
    logger.debug('Teacher requests fetched', { count: result.rows.length });
    
    // Comment 11 - Redact PII (emails) in production logs
    const redactEmail = (email) => {
      if (!isProduction || !email) return email;
      // Keep first 2 characters + domain for debugging while protecting PII
      const [localPart, domain] = email.split('@');
      if (localPart && domain) {
        const redactedLocal = localPart.substring(0, 2) + '*'.repeat(Math.max(0, localPart.length - 2));
        return `${redactedLocal}@${domain}`;
      }
      return email;
    };
    
    logger.info('🔍 Teacher Requests API - Query results', {
      count: result.rows.length,
      requests: result.rows.map(r => ({ 
        id: r.id, 
        name: r.name, 
        email: redactEmail(r.email), 
        status: r.status 
      }))
    });
    
    res.json(result.rows);
  } catch (error) {
    logger.error('❌ Error fetching teacher requests', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      adminId: req.user?.id,
      skipOptionalColumns: skipOptionalColumns
    });
    
    // Enhanced error handling for database column issues (Comment 8)
    if (error.code === '42703' && error.message.includes('does not exist')) {
      // PostgreSQL error code 42703: undefined_column
      const missingColumn = error.message.match(/column "([^"]+)" does not exist/)?.[1];
      const isOptionalColumn = ['processed_at', 'action_type', 'password_set_at', 'approved_by', 'approved_at'].includes(missingColumn);
      
      // Specific log message for common schema issues
      logger.error('🔧 DATABASE SCHEMA ISSUE - Missing Column Detected', {
        missingColumn,
        isOptionalColumn,
        skipOptionalColumns,
        query_param_skip_optional: req.query.skip_optional,
        workaround: 'Use ?skip_optional=true query parameter for immediate fix',
        permanent_fix: 'Run migration script: node backend/scripts/run-teacher-requests-migration.js --live',
        environment_fix: 'Set SKIP_OPTIONAL_COLUMNS=true environment variable',
        adminId: req.user?.id
      });
      
      if (isOptionalColumn) {
        // Provide helpful error message for missing optional columns
        const errorResponse = {
          error: isProduction 
            ? 'Database schema needs updating. Please contact administrator.'
            : `Missing database column: ${missingColumn}. This is a known issue.`,
          code: 'MISSING_OPTIONAL_COLUMNS',
          missingColumn: missingColumn,
          workarounds: [
            {
              method: 'query_parameter',
              description: 'Add ?skip_optional=true to this request URL',
              immediate: true
            },
            {
              method: 'environment_variable', 
              description: 'Set SKIP_OPTIONAL_COLUMNS=true in deployment environment',
              scope: 'application-wide'
            }
          ],
          permanent_solution: {
            method: 'database_migration',
            description: 'Run: node backend/scripts/run-teacher-requests-migration.js --live',
            file: 'backend/migrations/012_add_teacher_request_missing_columns.sql'
          }
        };

        // Don't expose internal details in production
        if (isProduction) {
          delete errorResponse.workarounds;
          delete errorResponse.permanent_solution;
        }
        
        return res.status(500).json(errorResponse);
      } else {
        // Handle missing required columns
        logger.error('❌ CRITICAL - Required column missing', {
          missingColumn,
          recommendation: 'Database schema corruption or missing migration'
        });
        
        return res.status(500).json({
          error: 'Critical database schema issue',
          code: 'MISSING_REQUIRED_COLUMN'
        });
      }
    }
    
    res.status(500).json(createErrorResponse(error, 'Failed to fetch teacher requests'));
  }
});

// Health check route for teacher-requests
router.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Schema check endpoint for database validation and troubleshooting
router.get('/schema-check', verifyToken, isAmitraceAdmin, async (req, res) => {
  logger.info('🔍 Teacher Requests Schema Check requested', { adminId: req.user?.id });
  
  try {
    // Check if teacher_requests table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'teacher_requests'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      return res.status(500).json({
        error: 'teacher_requests table does not exist',
        tableExists: false
      });
    }
    
    // Get current table schema
    const schemaResult = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'teacher_requests' 
      ORDER BY ordinal_position;
    `);
    
    const currentColumns = schemaResult.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      default: row.column_default
    }));
    
    // Define expected optional columns that can cause issues
    const optionalColumns = [
      { name: 'processed_at', type: 'timestamp', required: false },
      { name: 'action_type', type: 'text', required: false },
      { name: 'password_set_at', type: 'timestamp', required: false },
      { name: 'approved_by', type: 'integer', required: false },
      { name: 'approved_at', type: 'timestamp', required: false }
    ];
    
    // Check which optional columns exist
    const columnStatus = optionalColumns.map(expectedCol => {
      const existingCol = currentColumns.find(col => col.name === expectedCol.name);
      return {
        name: expectedCol.name,
        expected: true,
        exists: !!existingCol,
        type: existingCol?.type || null,
        typeMatch: existingCol ? existingCol.type.includes(expectedCol.type) : false
      };
    });
    
    const missingColumns = columnStatus.filter(col => !col.exists);
    const presentColumns = columnStatus.filter(col => col.exists);
    
    // Test if the main query would work
    let queryWorks = false;
    let queryError = null;
    
    try {
      const testQuery = skipOptionalColumns ? `
        SELECT tr.id, tr.name, tr.email, tr.status
        FROM teacher_requests tr 
        LIMIT 1
      ` : `
        SELECT 
          tr.id, tr.name, tr.email, tr.status,
          tr.processed_at, tr.action_type, tr.password_set_at
        FROM teacher_requests tr 
        LIMIT 1
      `;
      
      await pool.query(testQuery);
      queryWorks = true;
    } catch (testError) {
      queryError = testError.message;
    }
    
    // Generate recommendations
    const recommendations = [];
    
    if (missingColumns.length > 0 && !skipOptionalColumns) {
      recommendations.push({
        priority: 'IMMEDIATE',
        issue: `Missing optional columns: ${missingColumns.map(c => c.name).join(', ')}`,
        solution: 'Set SKIP_OPTIONAL_COLUMNS=true environment variable as immediate fix'
      });
      
      recommendations.push({
        priority: 'PERMANENT', 
        issue: 'Optional columns missing from database schema',
        solution: 'Run migration: node backend/scripts/run-teacher-requests-migration.js --live'
      });
    }
    
    if (missingColumns.length === 0 && skipOptionalColumns) {
      recommendations.push({
        priority: 'OPTIMIZATION',
        issue: 'SKIP_OPTIONAL_COLUMNS is set but all columns exist',
        solution: 'Remove SKIP_OPTIONAL_COLUMNS environment variable to enable full functionality'
      });
    }
    
    const response = {
      tableExists: true,
      totalColumns: currentColumns.length,
      optionalColumnsStatus: {
        total: optionalColumns.length,
        present: presentColumns.length,
        missing: missingColumns.length,
        details: columnStatus
      },
      environmentStatus: {
        skipOptionalColumns: skipOptionalColumns,
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Missing'
      },
      queryTest: {
        works: queryWorks,
        error: queryError
      },
      recommendations: recommendations,
      currentSchema: currentColumns.map(col => col.name),
      lastChecked: new Date().toISOString()
    };
    
    logger.info('🔍 Schema check completed', {
      missingColumns: missingColumns.length,
      queryWorks,
      recommendationCount: recommendations.length
    });
    
    res.json(response);
    
  } catch (error) {
    logger.error('❌ Schema check failed', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });
    
    res.status(500).json({
      error: 'Schema check failed',
      details: isProduction ? 'Internal server error' : error.message,
      tableExists: false
    });
  }
});

// Get teacher request by ID (Amitrace Admin only)
router.get('/:id', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { skip_optional } = req.query;
    
    // Allow admin-only override of skipOptionalColumns via query parameter
    const shouldSkipOptional = skipOptionalColumns || (skip_optional === 'true');
    
    // Conditionally include optional columns based on environment variable or admin override
    // Comment 12 - Always include fields as nullable placeholders for stable API contract
    const optionalFields = shouldSkipOptional ? `,
        NULL::timestamp as processed_at,
        NULL::text as action_type,
        NULL::timestamp as password_set_at` : `,
        tr.processed_at,
        tr.action_type,
        tr.password_set_at`;
    
    const result = await pool.query(`
      SELECT 
        tr.id,
        tr.name,
        tr.email,
        tr.message,
        tr.status,
        tr.requested_at,
        tr.approved_at,
        s.school_name,
        s.id as school_id,
        COALESCE(approved_by_user.name, approved_by_user.email) as approved_by_name${optionalFields}
      FROM teacher_requests tr
      JOIN schools s ON tr.school_id = s.id
      LEFT JOIN users approved_by_user ON tr.approved_by = approved_by_user.id
      WHERE tr.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher request not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching teacher request', error);
    
    // Add same enhanced error handling for undefined columns (Comment 8)
    if (error.code === '42703' && error.message.includes('does not exist')) {
      const missingColumn = error.message.match(/column "([^"]+)" does not exist/)?.[1];
      const isOptionalColumn = ['processed_at', 'action_type', 'password_set_at', 'approved_by', 'approved_at'].includes(missingColumn);
      
      logger.error('🔧 DATABASE SCHEMA ISSUE - Missing Column in GET /:id', {
        missingColumn,
        isOptionalColumn,
        requestId: req.params.id,
        workaround: 'Use ?skip_optional=true query parameter',
        adminId: req.user?.id
      });
      
      if (isOptionalColumn) {
        return res.status(500).json({
          error: isProduction 
            ? 'Database schema needs updating. Please contact administrator.'
            : `Missing database column: ${missingColumn}. Add ?skip_optional=true to request.`,
          code: 'MISSING_OPTIONAL_COLUMNS',
          missingColumn: missingColumn
        });
      }
    }
    
    res.status(500).json(createErrorResponse(error, 'Failed to fetch teacher request'));
  }
});

// Submit teacher request (Public endpoint)
router.post('/', async (req, res) => {
  const { first_name, last_name, name, email, school_id, message } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  
  try {
    
    // Use first_name/last_name if provided, otherwise fall back to name
    const finalFirstName = first_name || (name ? name.split(' ')[0] : '');
    const finalLastName = last_name || '';
    const finalName = name || (first_name && last_name ? `${first_name} ${last_name}` : first_name || '');
    
    // Validate required fields
    if ((!finalFirstName && !finalName) || !normalizedEmail || !school_id) {
      return res.status(400).json({ 
        error: 'First name (or full name), email, and school are required' 
      });
    }
    
    // Validate email format
    if (!validationHelpers.isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if email already exists as a user (Comment 7 - using helper)
    if (await userExistsByEmail(pool, normalizedEmail)) {
      // Comment 5 - Use 409 for conflicts
      return res.status(409).json({ 
        error: 'An account with this email already exists' 
      });
    }
    
    // Check if email already has a pending request
    const existingRequest = await pool.query(
      'SELECT id FROM teacher_requests WHERE LOWER(email) = LOWER($1) AND status = $2',
      [normalizedEmail, 'pending']
    );
    if (existingRequest.rows.length > 0) {
      // Comment 5 - Use 409 for conflicts
      return res.status(409).json({ 
        error: 'A pending request with this email already exists' 
      });
    }
    
    // Verify school exists
    const school = await pool.query('SELECT id FROM schools WHERE id = $1', [school_id]);
    if (school.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid school selected' });
    }
    
    const result = await pool.query(`
      INSERT INTO teacher_requests (name, email, school_id, message) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, name, email, school_id, message, status, requested_at
    `, [
      finalName.trim(), 
      normalizedEmail, // Use normalized email
      school_id, 
      message?.trim() || null
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Comment 13 - Check for unique constraint violation
    if (error.code === '23505') {
      logger.warn('Unique constraint violation on teacher request submission', { email: normalizedEmail });
      return res.status(409).json({ 
        error: 'An account with this email already exists' 
      });
    }
    logger.error('Error creating teacher request', error);
    res.status(500).json(createErrorResponse(error, 'Failed to submit teacher request'));
  }
});

// Approve teacher request (Amitrace Admin only)
router.post('/:id/approve', verifyToken, isAmitraceAdmin, async (req, res) => {
  // Comment 1 - Acquire a client from the pool for transaction
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    logger.info('Approving teacher request', { requestId: id, adminId: req.user.id });
    
    // Comment 8 - Don't store usable initial password, generate random unusable hash
    // This forces teachers to use the invitation link to set their password
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const unusablePassword = `REQUIRES_PASSWORD_RESET_${randomBytes}`;
    
    logger.debug('Generated unusable password hash for teacher request', { requestId: id });
    
    // Start transaction with client
    await client.query('BEGIN');
    
    // Comment 4 - Add FOR UPDATE row lock and re-check status
    const requestResult = await client.query(
      'SELECT * FROM teacher_requests WHERE id = $1 AND status = $2 FOR UPDATE',
      [id, 'pending']
    );
    
    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        error: 'Pending teacher request not found' 
      });
    }
    
    const request = requestResult.rows[0];
    
    // Comment 3 - Normalize email
    const normalizedEmail = request.email?.trim().toLowerCase();
    
    // Comment 7 - Use helper function for user existence check
    if (await userExistsByEmail(client, normalizedEmail)) {
      await client.query('ROLLBACK');
      // Comment 5 - Use 409 for conflicts
      return res.status(409).json({ 
        error: 'An account with this email already exists' 
      });
    }
    
    // Hash the unusable password - user cannot login until password is set via invitation
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(unusablePassword, saltRounds);
    
    logger.info('Starting teacher approval transaction', {
      requestId: id,
      email: normalizedEmail,
      school_id: request.school_id
    });
    
    // Create user account with transaction client
    // Note: User has unusable password hash and MUST use invitation link to set real password
    logger.info('Creating teacher user account with unusable password hash');
    const userResult = await client.query(`
      INSERT INTO users (email, password, role, name, school_id) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id, email, role, name, school_id
    `, [normalizedEmail, hashedPassword, 'teacher', request.name, request.school_id]);
    
    logger.info('User account created successfully', { userId: userResult.rows[0].id });
    
    // Comment 14 - Generate secure database token for unified password reset system
    // Use database tokens instead of JWT tokens to be compatible with password reset flow
    // IMPORTANT: Create token AFTER user creation using the new user's ID
    // CRITICAL: Use the same transaction client to avoid foreign key constraint violations
    const tokenService = require('../utils/token-service');
    const dbToken = await tokenService.createPasswordResetToken(userResult.rows[0].id, 168, client); // 7 days = 168 hours, use transaction client
    const invitationToken = { token: dbToken };
    
    logger.info('Password reset token created successfully', { userId: userResult.rows[0].id, tokenLength: dbToken?.length });
    
    // Comment 12 - Update with processed_at and action_type fields (conditionally)
    logger.info('Updating teacher request status');
    
    if (skipOptionalColumns) {
      // Skip optional columns if environment variable is set
      await client.query(`
        UPDATE teacher_requests 
        SET status = $1, 
            approved_by = $2, 
            approved_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, ['approved', req.user.id, id]);
    } else {
      // Include optional columns
      await client.query(`
        UPDATE teacher_requests 
        SET status = $1, 
            approved_by = $2, 
            approved_at = CURRENT_TIMESTAMP,
            processed_at = CURRENT_TIMESTAMP,
            action_type = $3
        WHERE id = $4
      `, ['approved', req.user.id, 'approved', id]);
    }
    
    logger.info('Committing transaction');
    await client.query('COMMIT');
    logger.info('Transaction committed successfully');
    
    // Comment 15 - Rename emailResult to mailResult
    let mailResult = { success: false };
    
    // Comment 14 - Create secure invitation URL using unified system
    const baseUrl = process.env.APP_BASE_URL || 'https://podcast-stories-production.up.railway.app';
    const invitationUrl = `${baseUrl.replace(/\/$/, '')}/reset-password.html?token=${invitationToken.token}`;
    
    // Comment 11 - Wrap email sending in try-catch blocks
    logger.info('Sending teacher approval email', { email: normalizedEmail });
    
    try {
      // Try Gmail API first
      mailResult = await gmailService.sendTeacherApprovalEmail(
        normalizedEmail,
        request.name,
        normalizedEmail,
        invitationUrl // Send invitation URL instead of password
      );
    } catch (emailError) {
      logger.error('Gmail API failed for approval email', emailError);
      mailResult = { success: false, error: emailError.message };
    }
    
    // Fallback to SMTP if Gmail API fails
    if (!mailResult.success) {
      logger.info('Trying SMTP fallback for approval email');
      try {
        mailResult = await emailService.sendTeacherApprovalEmail(
          normalizedEmail,
          request.name,
          normalizedEmail,
          invitationUrl // Send invitation URL instead of password
        );
      } catch (smtpError) {
        logger.error('SMTP fallback also failed for approval email', smtpError);
        mailResult = { success: false, error: smtpError.message };
      }
    }
    
    if (!mailResult.success) {
      logger.error('Failed to send approval email after all attempts', mailResult.error);
    }
    
    res.json({
      message: 'Teacher request approved and account created. Invitation link sent via email.',
      teacher: userResult.rows[0],
      emailSent: mailResult.success,
      invitationSent: true
    });
  } catch (error) {
    // Ensure client is released if transaction failed
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error during rollback', rollbackError);
      }
    }
    
    // Comment 13 - Check for unique constraint violation
    if (error.code === '23505') {
      logger.warn('Unique constraint violation during teacher approval', error);
      return res.status(409).json({ 
        error: 'An account with this email already exists' 
      });
    }
    
    // Enhanced error logging for debugging
    logger.error('Error approving teacher request - DETAILED DEBUG', {
      errorMessage: error.message,
      errorCode: error.code,
      errorName: error.name,
      errorStack: error.stack,
      requestId: req.params.id,
      adminId: req.user?.id,
      isProduction: process.env.NODE_ENV === 'production'
    });
    
    // Comment 8 & 10 - Return generic error in production, but include more info in development
    // TEMPORARY: Add debug info in production for troubleshooting
    res.status(500).json({ 
      error: 'Failed to approve teacher request',
      debug: {
        message: error.message,
        code: error.code,
        name: error.name,
        requestId: req.params.id,
        isProduction: process.env.NODE_ENV === 'production'
      }
    });
  } finally {
    // Comment 1 - Always release the client
    if (client) {
      client.release();
    }
  }
});

// Reject teacher request (Amitrace Admin only)
router.post('/:id/reject', verifyToken, isAmitraceAdmin, async (req, res) => {
  // Comment 1 - Use client for transaction consistency
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    logger.info('Rejecting teacher request', { requestId: id, adminId: req.user.id });
    
    await client.query('BEGIN');
    
    // Comment 4 - Add FOR UPDATE lock
    const requestResult = await client.query(
      'SELECT * FROM teacher_requests WHERE id = $1 AND status = $2 FOR UPDATE',
      [id, 'pending']
    );
    
    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        error: 'Pending teacher request not found' 
      });
    }
    
    const request = requestResult.rows[0];
    const normalizedEmail = request.email?.trim().toLowerCase();
    
    // Comment 12 - Update with processed_at and action_type (conditionally)
    let result;
    
    if (skipOptionalColumns) {
      // Skip optional columns if environment variable is set
      result = await client.query(`
        UPDATE teacher_requests 
        SET status = $1, 
            approved_by = $2, 
            approved_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND status = $4
        RETURNING id, status
      `, ['rejected', req.user.id, id, 'pending']);
    } else {
      // Include optional columns
      result = await client.query(`
        UPDATE teacher_requests 
        SET status = $1, 
            approved_by = $2, 
            approved_at = CURRENT_TIMESTAMP,
            processed_at = CURRENT_TIMESTAMP,
            action_type = $3 
        WHERE id = $4 AND status = $5
        RETURNING id, status
      `, ['rejected', req.user.id, 'rejected', id, 'pending']);
    }
    
    await client.query('COMMIT');
    
    // Comment 15 - Rename emailResult to mailResult
    let mailResult = { success: false };
    
    // Comment 11 - Wrap email sending in try-catch
    logger.info('Sending teacher rejection email', { email: normalizedEmail });
    
    try {
      mailResult = await gmailService.sendTeacherRejectionEmail(
        normalizedEmail,
        request.name
      );
    } catch (emailError) {
      logger.error('Gmail API failed for rejection email', emailError);
      mailResult = { success: false, error: emailError.message };
    }
    
    // Fallback to SMTP if Gmail API fails
    if (!mailResult.success) {
      logger.info('Trying SMTP fallback for rejection email');
      try {
        mailResult = await emailService.sendTeacherRejectionEmail(
          normalizedEmail,
          request.name
        );
      } catch (smtpError) {
        logger.error('SMTP fallback also failed for rejection email', smtpError);
        mailResult = { success: false, error: smtpError.message };
      }
    }
    
    if (!mailResult.success) {
      logger.error('Failed to send rejection email after all attempts', mailResult.error);
    }
    
    res.json({
      message: 'Teacher request rejected. Notification sent via email.',
      id: result.rows[0].id,
      emailSent: mailResult.success
    });
  } catch (error) {
    // Ensure rollback on error
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error during rollback', rollbackError);
      }
    }
    
    logger.error('Error rejecting teacher request', error);
    res.status(500).json(createErrorResponse(error, 'Failed to reject teacher request'));
  } finally {
    // Always release client
    if (client) {
      client.release();
    }
  }
});

// Update teacher request (Amitrace Admin only)
router.put('/:id', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status } = req.body;
    
    // Validate input
    if (!name || !email || !status) {
      return res.status(400).json({ error: 'Name, email, and status are required' });
    }
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    
    // Update the teacher request
    const result = await pool.query(
      `UPDATE teacher_requests 
       SET name = $1, email = $2, status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, email, status`,
      [name, normalizedEmail, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher request not found' });
    }
    
    logger.info('Teacher request updated', { 
      adminId: req.user.id,
      requestId: id,
      changes: { name, email: normalizedEmail, status }
    });
    
    res.json({ 
      message: 'Teacher request updated successfully',
      request: result.rows[0] 
    });
  } catch (error) {
    logger.error('Error updating teacher request', error);
    res.status(500).json(createErrorResponse(error, 'Failed to update teacher request'));
  }
});

// Reset teacher password (Amitrace Admin only)
router.post('/:id/reset-password', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the teacher request details
    const requestResult = await pool.query(
      'SELECT email, status FROM teacher_requests WHERE id = $1',
      [id]
    );
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher request not found' });
    }
    
    const request = requestResult.rows[0];
    
    if (request.status !== 'approved') {
      return res.status(400).json({ error: 'Can only reset password for approved teachers' });
    }
    
    const normalizedEmail = request.email?.trim().toLowerCase();
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, name FROM users WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher account not found' });
    }
    
    const user = userResult.rows[0];
    
    // Generate new database token for unified password reset system
    const tokenService = require('../utils/token-service');
    const dbToken = await tokenService.createPasswordResetToken(user.id, 168); // 7 days
    const invitationToken = { token: dbToken };
    
    // Create password reset URL using unified system
    const baseUrl = process.env.APP_BASE_URL || 'https://podcast-stories-production.up.railway.app';
    const invitationUrl = `${baseUrl.replace(/\/$/, '')}/reset-password.html?token=${invitationToken.token}`;
    
    // Send password reset email
    const mailResult = await sendPasswordResetEmail(normalizedEmail, user.name, invitationUrl);
    
    logger.info('Password reset link sent', {
      adminId: req.user.id,
      teacherId: user.id,
      requestId: id,
      emailSent: mailResult.success
    });
    
    res.json({ 
      message: 'Password reset link sent successfully',
      emailSent: mailResult.success
    });
  } catch (error) {
    logger.error('Error resetting teacher password', error);
    res.status(500).json(createErrorResponse(error, 'Failed to reset password'));
  }
});

// Helper function to send password reset email
async function sendPasswordResetEmail(email, name, resetUrl) {
  try {
    // Try Gmail service first
    if (gmailService.hasOAuthCredentials()) {
      const subject = 'Reset Your VidPOD Password';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${name || 'Teacher'},</p>
          <p>An administrator has requested a password reset for your VidPOD account.</p>
          <p>Click the link below to set a new password:</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" style="background: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 7 days.</p>
          <p>If you didn't expect this email, you can safely ignore it.</p>
        </div>
      `;
      return await gmailService.sendEmail(email, subject, html);
    }
    
    // Fallback to SMTP
    if (emailService.isConfigured()) {
      return await emailService.sendPasswordResetEmail(email, name, resetUrl);
    }
    
    return { success: false, error: 'Email service not configured' };
  } catch (error) {
    logger.error('Error sending password reset email', error);
    return { success: false, error: error.message };
  }
}

// Delete teacher request (Amitrace Admin only)
router.delete('/:id', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM teacher_requests WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher request not found' });
    }
    
    res.json({ 
      message: 'Teacher request deleted successfully',
      id: result.rows[0].id 
    });
  } catch (error) {
    logger.error('Error deleting teacher request', error);
    res.status(500).json(createErrorResponse(error, 'Failed to delete teacher request'));
  }
});

// Get teacher request statistics (Amitrace Admin only)
router.get('/stats/overview', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) as total_count
      FROM teacher_requests
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    logger.error('Error fetching teacher request stats', error);
    res.status(500).json(createErrorResponse(error, 'Failed to fetch statistics'));
  }
});

// Set password using invitation token (Comment 14 - secure password flow)
router.post('/set-password', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    
    // Validate token
    const tokenValidation = tokenUtils.validateTeacherInvitationToken(token);
    if (!tokenValidation.valid) {
      logger.warn('Invalid teacher invitation token attempt', { error: tokenValidation.error });
      return res.status(400).json({ error: tokenValidation.error });
    }
    
    const { email, requestId } = tokenValidation.payload;
    const normalizedEmail = email?.trim().toLowerCase();
    
    // Comment 9 - Validate password strength
    const passwordValidation = validationHelpers.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: passwordValidation.message,
        strength: passwordValidation.strength 
      });
    }
    
    // Additional password requirements check
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    
    if (!(hasUppercase && hasLowercase && hasNumbers)) {
      return res.status(400).json({ 
        error: 'Password must contain uppercase, lowercase, and numbers' 
      });
    }
    
    await client.query('BEGIN');
    
    // Lock and check request status (conditionally check password_set_at)
    const selectFields = skipOptionalColumns ? 'email, status' : 'email, status, password_set_at';
    const reqCheck = await client.query(
      `SELECT ${selectFields} FROM teacher_requests WHERE id=$1 FOR UPDATE`,
      [requestId]
    );
    
    if (reqCheck.rows.length === 0 || reqCheck.rows[0].status !== 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or unapproved invitation' });
    }
    
    // Check if token has already been used (Comment 9 - handle token reuse)
    if (!skipOptionalColumns) {
      // Use password_set_at column when available
      if (reqCheck.rows[0].password_set_at) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invitation link already used' });
      }
    } else {
      // Use teacher_invitation_usage table when password_set_at is not available
      try {
        const usageCheck = await client.query(
          'SELECT used_at FROM teacher_invitation_usage WHERE request_id = $1',
          [requestId]
        );
        
        if (usageCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          logger.warn('Token reuse attempt detected', { 
            requestId, 
            normalizedEmail,
            previousUse: usageCheck.rows[0].used_at 
          });
          return res.status(400).json({ error: 'Invitation link already used' });
        }
      } catch (usageError) {
        // If teacher_invitation_usage table doesn't exist, log warning but continue
        logger.warn('teacher_invitation_usage table not available, cannot check token reuse', {
          error: usageError.message,
          requestId,
          recommendation: 'Run migration 013_add_teacher_invitation_usage_table.sql'
        });
      }
    }
    
    // Cross-check request email with token email
    if (!reqCheck.rows.length || reqCheck.rows[0].email.toLowerCase() !== normalizedEmail) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid invitation token' });
    }
    
    // Check if user exists and token hasn't been used
    const userResult = await client.query(
      'SELECT id, password FROM users WHERE LOWER(email) = LOWER($1) FOR UPDATE',
      [normalizedEmail]
    );
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User account not found' });
    }
    
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Update user password
    await client.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, userResult.rows[0].id]
    );
    
    // Mark the token as used (Comment 9 - handle different tracking methods)
    if (!skipOptionalColumns) {
      // Use password_set_at column when available
      await client.query(
        'UPDATE teacher_requests SET password_set_at = CURRENT_TIMESTAMP WHERE id = $1',
        [requestId]
      );
    } else {
      // Use teacher_invitation_usage table when password_set_at is not available
      try {
        await client.query(
          'INSERT INTO teacher_invitation_usage (request_id, used_at) VALUES ($1, CURRENT_TIMESTAMP)',
          [requestId]
        );
        logger.info('Token usage recorded in teacher_invitation_usage table', { requestId });
      } catch (usageInsertError) {
        // Log error but don't fail the password set operation
        logger.error('Failed to record token usage in teacher_invitation_usage table', {
          error: usageInsertError.message,
          requestId,
          recommendation: 'Run migration 013_add_teacher_invitation_usage_table.sql'
        });
        // Continue with the operation - the password set should succeed even if usage tracking fails
      }
    }
    
    await client.query('COMMIT');
    
    logger.info('Teacher password successfully set', { email: normalizedEmail });
    
    res.json({ 
      success: true,
      message: 'Password set successfully. You can now log in with your email and new password.' 
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error during rollback', rollbackError);
      }
    }
    
    logger.error('Error setting teacher password', error);
    res.status(500).json(createErrorResponse(error, 'Failed to set password'));
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;