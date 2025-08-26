# VidPOD CSV Import Feature Documentation

*Comprehensive documentation for the VidPOD CSV import functionality*

---

## 📋 Overview

The VidPOD CSV import feature allows users to bulk upload story ideas from CSV files. The system has been enhanced with robust error handling, schema compatibility, and comprehensive user feedback.

---

## ✨ Features

### Core Functionality
- **Bulk Import**: Import multiple story ideas from a single CSV file
- **Schema Compatibility**: Automatically detects and adapts to database schema versions
- **Tag Management**: Creates new tags automatically if they don't exist
- **Interviewee Management**: Creates and links interviewees automatically
- **Error Handling**: Comprehensive error reporting with row-level details
- **Progress Feedback**: Real-time upload status and detailed results

### User Experience
- **File Validation**: Checks file type (.csv) and size (10MB limit)
- **Loading States**: Visual feedback during upload process
- **Detailed Results**: Shows import statistics and error details
- **Notification System**: Enhanced notifications instead of basic alerts

---

## 📄 CSV File Format

### Required Fields
- `idea_title` - Story title (required)

### Optional Fields
- `idea_description` - Story description
- `question_1` to `question_6` - Interview questions
- `coverage_start_date` - Story coverage start date (YYYY-MM-DD format)
- `coverage_end_date` - Story coverage end date (YYYY-MM-DD format)
- `tags` - Comma-separated list of tags
- `interviewees` - Comma-separated list of interviewee names

### Alternative Field Names (Backward Compatibility)
- `title` (alternative to `idea_title`)
- `description` (alternative to `idea_description`)
- `start_date` (alternative to `coverage_start_date`)
- `end_date` (alternative to `coverage_end_date`)
- `people_to_interview` (alternative to `interviewees`)

### Sample CSV Format
```csv
idea_title,idea_description,question_1,question_2,question_3,question_4,question_5,question_6,coverage_start_date,coverage_end_date,tags,interviewees
Human Trafficking Prevention Month,Human Trafficking Prevention Month,What are some common misconceptions about human trafficking?,How can communities better support survivors of human trafficking?,What is one action individuals can take to combat human trafficking?,,,,2024-01-01,2024-01-31,Activism,Survivor Advocate
International Creativity Month,International Creativity Month,What sparks your creative inspiration?,How do you overcome creative blocks?,What advice would you give to someone looking to embrace their creativity?,,,,2024-01-01,2024-01-31,"Arts,Culture","Artist,Musician,Writer"
```

### Special Character Handling
- **Commas in content**: Wrap field in double quotes: `"Content with, commas"`
- **Quotes in content**: Escape with double quotes: `"Content with ""quotes"""`
- **Newlines in content**: Supported within quoted fields
- **Multiple tags**: Separate with commas: `"Technology,Innovation,Science"`
- **Multiple interviewees**: Separate with commas: `"John Doe,Jane Smith,Bob Johnson"`

---

## 🔧 Technical Implementation

### Backend API Endpoint
- **URL**: `POST /api/stories/import`
- **Authentication**: Required (Bearer token)
- **Content-Type**: `multipart/form-data`
- **Field Name**: `csv`
- **File Types**: `.csv` only
- **Size Limit**: 10MB

### Database Schema Compatibility

The system automatically detects the database schema version:

#### Phase 1 Schema (Basic)
```sql
INSERT INTO story_ideas (
  idea_title, idea_description,
  question_1, question_2, question_3, question_4, question_5, question_6,
  coverage_start_date, coverage_end_date, uploaded_by
) VALUES (...)
```

#### Phase 2 Schema (With Approval System)
```sql
INSERT INTO story_ideas (
  idea_title, idea_description,
  question_1, question_2, question_3, question_4, question_5, question_6,
  coverage_start_date, coverage_end_date, uploaded_by, approval_status
) VALUES (..., 'draft')
```

### Tag and Interviewee Processing

#### Automatic Tag Creation
```javascript
// Check if tag exists
let tagResult = await client.query('SELECT id FROM tags WHERE tag_name = $1', [tagName]);

if (tagResult.rows.length > 0) {
  tagId = tagResult.rows[0].id;
} else {
  // Create new tag if it doesn't exist
  const newTagResult = await client.query(
    'INSERT INTO tags (tag_name, created_by) VALUES ($1, $2) RETURNING id',
    [tagName, req.user.id]
  );
  tagId = newTagResult.rows[0].id;
}
```

#### Interviewee Management
```javascript
// Insert or update interviewee
const intervieweeResult = await client.query(
  'INSERT INTO interviewees (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
  [person]
);

// Link to story
await client.query(
  'INSERT INTO story_interviewees (story_id, interviewee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
  [storyId, intervieweeResult.rows[0].id]
);
```

---

## 🎨 User Interface

### Access Control
CSV import is available to:
- **Teachers**: Can import stories for their classes
- **Admins**: Can import stories system-wide
- **Students**: Import capability depends on system configuration

### Frontend Implementation

#### HTML Structure
```html
<!-- CSV Import Button -->
<button class="btn btn-secondary" id="csvImportBtn">📁 Import CSV</button>

<!-- CSV Import Modal -->
<div id="csvModal" class="modal">
  <div class="modal-content">
    <span class="close">&times;</span>
    <h2>📁 Import Stories from CSV</h2>
    <form id="csvForm">
      <div class="form-group">
        <label for="csvFile">Choose CSV File</label>
        <input type="file" id="csvFile" accept=".csv" required>
      </div>
      
      <div class="csv-instructions">
        <h4>CSV Format Instructions:</h4>
        <p>Your CSV file should include the following columns:</p>
        <ul>
          <li><strong>idea_title</strong> - Story title (required)</li>
          <li><strong>idea_description</strong> - Story description</li>
          <li><strong>question_1</strong> to <strong>question_6</strong> - Interview questions</li>
          <li><strong>coverage_start_date</strong> - Start date (YYYY-MM-DD)</li>
          <li><strong>coverage_end_date</strong> - End date (YYYY-MM-DD)</li>
          <li><strong>tags</strong> - Comma-separated tags</li>
          <li><strong>interviewees</strong> - Comma-separated names</li>
        </ul>
      </div>
      
      <button type="submit" class="btn btn-primary">📤 Upload CSV</button>
    </form>
  </div>
</div>
```

#### JavaScript Implementation
```javascript
async function handleCSVUpload(e) {
  e.preventDefault();
  
  const fileInput = document.getElementById('csvFile');
  const file = fileInput.files[0];
  
  // Validation
  if (!file) {
    showNotification('Please select a CSV file', 'error');
    return;
  }
  
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showNotification('Please select a valid CSV file', 'error');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    showNotification('File too large. Please select a file smaller than 10MB', 'error');
    return;
  }
  
  // Show loading state
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = '📤 Uploading...';
  
  const formData = new FormData();
  formData.append('csv', file);
  
  try {
    const response = await fetch(`${API_URL}/stories/import`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: formData
    });
    
    if (response.ok) {
      const result = await response.json();
      
      let message = `Successfully imported ${result.imported}`;
      if (result.total && result.total !== result.imported) {
        message += ` of ${result.total}`;
      }
      message += ` stories!`;
      
      if (result.errors && result.errors.length > 0) {
        message += `\n\nNote: ${result.errors.length} rows had errors. Check console for details.`;
      }
      
      showNotification(message, 'success');
      
      // Close modal and reload
      document.getElementById('csvModal').style.display = 'none';
      fileInput.value = '';
      await loadStories();
      
    } else {
      const error = await response.json();
      showNotification(`Import failed: ${error.message || error.error}`, 'error');
    }
  } catch (error) {
    showNotification('Import failed: Network error', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '📤 Upload CSV';
  }
}
```

---

## ⚠️ Error Handling

### Validation Errors
- **No file selected**: "Please select a CSV file"
- **Invalid file type**: "Please select a valid CSV file"
- **File too large**: "File too large. Please select a file smaller than 10MB"
- **Missing required fields**: "Story title is required"

### Import Errors
- **Authentication errors**: "Please log in again"
- **Permission errors**: "You do not have permission to import stories"
- **Server errors**: Detailed error messages with technical details
- **Row-level errors**: Specific errors for individual CSV rows

### Response Format
```javascript
// Success Response
{
  "message": "CSV import completed successfully",
  "imported": 15,
  "total": 17,
  "errors": [
    {
      "row": 3,
      "title": "Story Title",
      "error": "Error description"
    }
  ],
  "schemaInfo": "Phase 2 schema detected"
}

// Error Response
{
  "error": "Failed to import CSV",
  "details": "Specific error details",
  "imported": 5,
  "total": 10
}
```

---

## 🧪 Testing

### Manual Testing Steps

1. **File Validation Testing**:
   - Try uploading non-CSV files
   - Try uploading files larger than 10MB
   - Try uploading without selecting a file

2. **CSV Format Testing**:
   - Test with minimal required fields only
   - Test with all fields populated
   - Test with special characters and quotes
   - Test with empty rows
   - Test with malformed CSV

3. **Content Testing**:
   - Test with existing tags vs new tags
   - Test with existing interviewees vs new ones
   - Test with various date formats
   - Test with long text content

4. **Error Handling Testing**:
   - Test without authentication
   - Test with expired tokens
   - Test with invalid CSV structure
   - Test with database constraint violations

### Automated Testing

Use the provided test scripts:
- `test-csv-import-debug.js` - Basic endpoint testing
- `test-csv-with-auth.js` - Authentication and import testing
- `test-csv-final.js` - Comprehensive test suite

---

## 🔒 Security Considerations

### Authentication & Authorization
- All CSV imports require valid JWT authentication
- Users can only import stories under their own account
- Role-based access controls apply

### File Security
- File type validation (CSV only)
- File size limits (10MB maximum)
- Temporary file cleanup after processing
- No execution of file contents

### Data Validation
- SQL injection prevention through parameterized queries
- Input sanitization for all text fields
- Transaction rollback on errors
- Duplicate prevention for tags and interviewees

---

## ⚡ Performance Considerations

### Optimization Features
- **Batch Processing**: All imports processed in a single database transaction
- **Connection Pooling**: Efficient database connection management
- **Memory Management**: Streaming CSV processing to handle large files
- **Error Isolation**: Individual row errors don't stop the entire import

### Scalability
- **File Size Limits**: 10MB limit prevents memory issues
- **Transaction Management**: Proper BEGIN/COMMIT/ROLLBACK handling
- **Cleanup Procedures**: Automatic temporary file removal

---

## 🔧 Troubleshooting

### Common Issues

1. **"No file uploaded" error**:
   - Check that form field name is 'csv'
   - Verify FormData is properly configured
   - Ensure multipart/form-data content type

2. **Authentication errors**:
   - Verify JWT token is valid and not expired
   - Check Authorization header format: `Bearer <token>`
   - Ensure user has proper permissions

3. **Import failures**:
   - Check CSV format and required fields
   - Verify database connectivity
   - Review server logs for detailed errors

4. **Partial imports**:
   - Check response for error details
   - Review console logs for row-level errors
   - Verify data format compliance

### Debug Tools
- Browser console for client-side debugging
- Server logs for backend errors
- Network tab for HTTP request/response analysis
- Test scripts for automated verification

---

## 🔄 Maintenance

### Regular Tasks
- Monitor import success rates
- Review error logs for patterns
- Update file size limits if needed
- Optimize database queries for performance

### Schema Updates
When database schema changes:
1. Update schema detection logic
2. Add new field mappings
3. Test backward compatibility
4. Update documentation

---

## 📊 Usage Examples

### Basic CSV File Example
```csv
idea_title,idea_description
"Climate Change Impact","Understanding how climate change affects local communities"
"Student Mental Health","Exploring mental health resources available to students"
"Technology in Education","How technology is transforming the classroom experience"
```

### Complete CSV File Example
```csv
idea_title,idea_description,question_1,question_2,coverage_start_date,coverage_end_date,tags,interviewees
"Local Business Recovery","Post-pandemic business recovery strategies","How has your business adapted?","What support did you receive?",2024-01-01,2024-01-31,"Business,Recovery","Business Owner,Economic Expert"
"Community Garden Project","Urban gardening initiative bringing communities together","What motivated you to start?","What challenges did you face?",2024-02-01,2024-02-28,"Community,Environment","Garden Organizer,Local Resident"
```

---

*This documentation should be updated whenever the CSV import functionality is modified or enhanced.*

**Last Updated:** August 2025  
**Version:** 2.0  
**Status:** ✅ Production Ready