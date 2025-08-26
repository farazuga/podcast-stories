/**
 * CSV Import Service
 * Centralized service for handling CSV story imports
 * Extracted and consolidated from routes/stories.js
 */

const { Pool } = require('pg');
const csv = require('csv-parser');
const fs = require('fs');
const csvValidationService = require('./csvValidationService');
const csvParserService = require('./csvParserService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class CSVImportService {
  constructor() {
    this.results = [];
    this.errors = [];
    this.warnings = [];
    this.successCount = 0;
    this.hasApprovalStatus = false;
  }

  /**
   * Main CSV import function
   * @param {Object} file - Multer file object
   * @param {Object} user - User object with id and role
   * @param {Object} options - Import options (autoApprove, etc.)
   * @returns {Promise<Object>} Import results
   */
  async importCSV(file, user, options = {}) {
    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`📤 CSV import started by user ${user.id} (${user.email || user.username})`);
    console.log(`📁 File: ${file.originalname}, Size: ${file.size} bytes`);
    console.log(`🔧 Enhanced CSV import with flexible date parsing v2.0`);

    // Reset state
    this.results = [];
    this.errors = [];
    this.warnings = [];
    this.successCount = 0;

    try {
      // Check database schema capabilities
      await this.checkSchemaCapabilities();

      // Parse CSV file
      await this.parseCSVFile(file.path);

      // Process parsed data
      await this.processCSVData(user, options);

      // Clean up uploaded file
      this.cleanupFile(file.path);

      return this.generateImportResults();

    } catch (error) {
      // Clean up on error
      this.cleanupFile(file.path);
      throw error;
    }
  }

  /**
   * Check if database supports approval status (Phase 2 features)
   */
  async checkSchemaCapabilities() {
    const client = await pool.connect();
    try {
      const schemaCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'story_ideas' AND column_name = 'approval_status'
      `);
      this.hasApprovalStatus = schemaCheck.rows.length > 0;
      console.log(`Database schema check: approval_status field ${this.hasApprovalStatus ? 'exists' : 'not found'}`);
    } catch (error) {
      console.log('Schema check failed, assuming basic schema');
      this.hasApprovalStatus = false;
    } finally {
      client.release();
    }
  }

  /**
   * Parse CSV file and collect data
   */
  async parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({
          skipEmptyLines: true,
          skipLinesWithError: false,
          strict: false,
          separator: ',',
          quote: '"',
          escape: '"'
        }))
        .on('data', (data) => {
          console.log(`📝 Raw CSV row data:`, Object.keys(data));
          
          // Handle BOM in header by cleaning first field
          const cleanedData = {};
          Object.keys(data).forEach(key => {
            const cleanKey = key.replace(/^\uFEFF/, ''); // Remove BOM
            cleanedData[cleanKey] = data[key];
          });
          
          // Skip empty rows
          if (cleanedData.idea_title || cleanedData.title) {
            this.results.push(cleanedData);
            console.log(`📋 Added row: "${cleanedData.idea_title || cleanedData.title}"`);
          } else {
            console.log(`⚠️ Skipped empty row:`, cleanedData);
          }
        })
        .on('end', () => {
          console.log(`Parsed ${this.results.length} rows from CSV`);
          resolve();
        })
        .on('error', (error) => {
          console.error('CSV parsing error:', error);
          reject(new Error(`Failed to parse CSV file: ${error.message}`));
        });
    });
  }

  /**
   * Process parsed CSV data and insert into database
   */
  async processCSVData(user, options) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < this.results.length; i++) {
        const row = this.results[i];
        const rowNumber = i + 2; // +2 because CSV row 1 is header, and we're 0-indexed
        
        try {
          await this.processCSVRow(client, row, rowNumber, user, options);
          this.successCount++;
        } catch (rowError) {
          console.error(`Error processing row ${rowNumber}:`, rowError.message);
          this.errors.push({ 
            row: rowNumber, 
            title: row.idea_title || row.title || 'Unknown', 
            error: rowError.message 
          });
        }
      }

      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process a single CSV row
   */
  async processCSVRow(client, row, rowNumber, user, options) {
    // Validate required fields
    const title = row.idea_title || row.title;
    if (!title || title.trim() === '') {
      throw new Error('Story title is required');
    }

    // Parse and validate dates
    const startDateRaw = row.coverage_start_date || row.start_date || '';
    const endDateRaw = row.coverage_end_date || row.end_date || '';
    
    const startDate = csvParserService.parseFlexibleDate(startDateRaw);
    const endDate = csvParserService.parseFlexibleDate(endDateRaw);
    
    // Log date parsing warnings
    if (startDateRaw && !startDate) {
      this.warnings.push({
        row: rowNumber,
        title: title,
        warning: `Could not parse start date: "${startDateRaw}"`
      });
    }
    if (endDateRaw && !endDate) {
      this.warnings.push({
        row: rowNumber,
        title: title,
        warning: `Could not parse end date: "${endDateRaw}"`
      });
    }

    // Insert the story
    const storyId = await this.insertStory(client, row, title, startDate, endDate, user, options);
    console.log(`Imported story ${this.successCount + 1}: "${title}" (ID: ${storyId})`);

    // Handle tags
    await this.processStoryTags(client, row, storyId, user);

    // Handle interviewees
    await this.processStoryInterviewees(client, row, storyId);
  }

  /**
   * Insert story into database
   */
  async insertStory(client, row, title, startDate, endDate, user, options) {
    let insertQuery, insertValues;
    
    if (this.hasApprovalStatus) {
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
        startDate,
        endDate,
        user.id, 
        options.autoApprove || user.role === 'amitrace_admin' ? 'approved' : 'pending'
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
        startDate,
        endDate,
        user.id
      ];
    }

    const storyResult = await client.query(insertQuery, insertValues);
    return storyResult.rows[0].id;
  }

  /**
   * Process and link tags to story
   */
  async processStoryTags(client, row, storyId, user) {
    const tagsValue = row.tags || row.auto_tags || row.tag;
    if (!tagsValue || !tagsValue.trim()) return;

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
            [tagName, user.id]
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

  /**
   * Process and link interviewees to story
   */
  async processStoryInterviewees(client, row, storyId) {
    const people = [];
    
    // Check for single interviewees column
    if (row.interviewees && row.interviewees.trim()) {
      people.push(...row.interviewees.split(',').map(p => p.trim()).filter(p => p));
    }
    if (row.people_to_interview && row.people_to_interview.trim()) {
      people.push(...row.people_to_interview.split(',').map(p => p.trim()).filter(p => p));
    }
    
    // Check for numbered interviewee columns
    Object.keys(row).forEach(key => {
      if (key.trim().match(/^interviewees?\s*\d+$/i) && row[key] && row[key].trim()) {
        people.push(row[key].trim());
      }
    });
    
    if (people.length === 0) return;

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

  /**
   * Generate import results summary
   */
  generateImportResults() {
    console.log(`📊 CSV import completed: ${this.successCount} stories imported, ${this.errors.length} errors, ${this.warnings.length} warnings`);
    
    if (this.hasApprovalStatus) {
      console.log(`✅ Auto-approved ${this.successCount} stories from CSV import`);
    }
    
    if (this.warnings.length > 0) {
      console.log(`⚠️ Warnings during import:`, this.warnings.slice(0, 5));
    }

    return {
      message: `CSV import completed ${this.successCount > 0 ? 'successfully' : 'with issues'}`,
      imported: this.successCount,
      total: this.results.length,
      errors: this.errors.length > 0 ? this.errors.slice(0, 10) : null,
      warnings: this.warnings.length > 0 ? this.warnings.slice(0, 10) : null,
      schemaInfo: this.hasApprovalStatus ? 'Phase 2 schema detected' : 'Basic schema detected',
      approval_status: this.hasApprovalStatus ? 'auto-approved' : 'no approval system',
      auto_approved_count: this.hasApprovalStatus ? this.successCount : 0,
      date_parsing: {
        supported_formats: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD-MMM (e.g., 1-Jan)', 'ISO dates'],
        total_warnings: this.warnings.length,
        total_errors: this.errors.length
      }
    };
  }

  /**
   * Clean up uploaded file
   */
  cleanupFile(filePath) {
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkError) {
      console.error('Warning: Failed to clean up uploaded file:', unlinkError.message);
    }
  }
}

module.exports = new CSVImportService();