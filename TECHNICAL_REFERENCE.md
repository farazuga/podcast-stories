# VidPOD Technical Reference Documentation

*Last Updated: August 28, 2025*

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Environment Variables](#environment-variables)
3. [API Endpoints](#api-endpoints)
4. [URLs and Domains](#urls-and-domains)
5. [Frontend Variables](#frontend-variables)
6. [Constants and Enums](#constants-and-enums)
7. [Authentication](#authentication)
8. [Email System](#email-system)
9. [Critical Notes](#critical-notes)

---

## Database Schema

### users
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | Auto-increment |
| username | VARCHAR(50) | UNIQUE NOT NULL | Legacy field, email preferred |
| **password** | VARCHAR(255) | NOT NULL | ⚠️ **NOT password_hash** - bcrypt hashed |
| email | VARCHAR(255) | NOT NULL | Primary login identifier |
| school | VARCHAR(255) | - | Legacy field |
| role | VARCHAR(20) | CHECK IN ('amitrace_admin', 'teacher', 'student', 'admin', 'user') | User role |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation date |
| name | VARCHAR(255) | - | Display name |
| student_id | VARCHAR(50) | - | Student identifier |
| teacher_id | INTEGER | REFERENCES users(id) | For student-teacher relationship |
| school_id | INTEGER | REFERENCES schools(id) | School association |

### story_ideas
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | Auto-increment |
| idea_title | VARCHAR(255) | NOT NULL | Story title |
| idea_description | TEXT | - | Story description |
| question_1 through question_6 | TEXT | - | Interview questions |
| coverage_start_date | DATE | - | Story coverage period start |
| coverage_end_date | DATE | - | Story coverage period end |
| uploaded_by | INTEGER | REFERENCES users(id) | Story creator |
| uploaded_date | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation date |
| is_approved | BOOLEAN | DEFAULT false | Admin approval status |

### password_reset_tokens
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | Auto-increment |
| user_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE | User requesting reset |
| token | VARCHAR(255) | UNIQUE NOT NULL | 64-char hex token |
| expires_at | TIMESTAMP | NOT NULL | Token expiration (1 hour default) |
| used | BOOLEAN | DEFAULT false | Token usage status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Token creation time |

### schools
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | Auto-increment |
| school_name | VARCHAR(255) | UNIQUE NOT NULL | School name |
| created_by | INTEGER | REFERENCES users(id) | Admin who created |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation date |

### classes
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | Auto-increment |
| class_name | VARCHAR(255) | NOT NULL | Class name |
| subject | VARCHAR(255) | - | Subject area |
| description | TEXT | - | Class description |
| class_code | CHAR(4) | UNIQUE NOT NULL | 4-digit join code |
| teacher_id | INTEGER | REFERENCES users(id) | Class teacher |
| school_id | INTEGER | REFERENCES schools(id) | School association |
| is_active | BOOLEAN | DEFAULT true | Class status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation date |

### teacher_requests
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | Auto-increment |
| name | VARCHAR(255) | NOT NULL | Teacher name |
| email | VARCHAR(255) | UNIQUE NOT NULL | Teacher email |
| school_id | INTEGER | REFERENCES schools(id) | Requested school |
| message | TEXT | - | Request message |
| status | VARCHAR(20) | DEFAULT 'pending' CHECK IN ('pending', 'approved', 'rejected') | Request status |
| requested_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Request date |
| approved_by | INTEGER | REFERENCES users(id) | Approving admin |
| approved_at | TIMESTAMP | - | Approval date |

### user_favorites
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | Auto-increment |
| user_id | INTEGER | REFERENCES users(id) ON DELETE CASCADE | User |
| story_id | INTEGER | REFERENCES story_ideas(id) ON DELETE CASCADE | Favorited story |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Favorite date |
| UNIQUE | (user_id, story_id) | - | Prevent duplicate favorites |

### tags
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | Auto-increment |
| tag_name | VARCHAR(50) | UNIQUE NOT NULL | Tag name |
| created_by | INTEGER | REFERENCES users(id) | Creator |

### interviewees
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | Auto-increment |
| name | VARCHAR(255) | UNIQUE NOT NULL | Interviewee name |

### Junction Tables

**user_classes**: Links students to classes
- user_id, class_id, joined_at

**story_tags**: Links stories to tags
- story_id, tag_id

**story_interviewees**: Links stories to interviewees
- story_id, interviewee_id

---

## Environment Variables

### Required in Production

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
JWT_SECRET=your-secure-secret-key-here
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=production
PORT=8080

# Email (Choose OAuth or SMTP)
## OAuth2 (Gmail API)
EMAIL_USER=your-email@gmail.com
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token

## OR SMTP
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Default Admin Account
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password-here
ADMIN_EMAIL=admin@vidpod.com
ADMIN_SCHOOL=Podcast Central HS
```

### Default Values

| Variable | Default | Notes |
|----------|---------|-------|
| NODE_ENV | development | Environment mode |
| PORT | 3000 | Server port |
| JWT_EXPIRES_IN | 7d | Token expiration |
| ADMIN_USERNAME | admin | Default admin username |
| ADMIN_SCHOOL | Podcast Central HS | Default school |

---

## API Endpoints

### Authentication

#### POST /api/auth/login
**Description**: User login with email and password
**Authentication**: None
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response**: 
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "student",
    "name": "John Doe"
  }
}
```

#### POST /api/auth/register
**Description**: Register new user
**Authentication**: None
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "student",
  "school_id": 1
}
```

#### GET /api/auth/verify
**Description**: Verify JWT token validity
**Authentication**: Bearer token
**Response**: 200 OK or 401 Unauthorized

### Password Reset

#### POST /api/password-reset/request
**Description**: Request password reset email
**Request Body**:
```json
{
  "email": "user@example.com"
}
```

#### GET /api/password-reset/verify/:token
**Description**: Verify reset token validity
**Parameters**: token (64-char hex string)

#### POST /api/password-reset/reset
**Description**: Reset password with token
**Request Body**:
```json
{
  "token": "64-char-hex-token",
  "password": "newPassword123"
}
```

### Stories

#### GET /api/stories
**Description**: List stories with filters
**Authentication**: Bearer token
**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 10)
- `search` - Search in title/description
- `tag` - Filter by tag
- `school_id` - Filter by school
- `is_approved` - Filter by approval status
- `uploaded_by` - Filter by creator

#### POST /api/stories
**Description**: Create new story
**Authentication**: Bearer token
**Request Body**:
```json
{
  "idea_title": "Story Title",
  "idea_description": "Story description",
  "question_1": "First interview question",
  "coverage_start_date": "2025-01-01",
  "coverage_end_date": "2025-01-31",
  "tags": ["Education", "Technology"],
  "interviewees": ["John Doe", "Jane Smith"]
}
```

#### PUT /api/stories/:id
**Description**: Update story
**Authentication**: Bearer token (owner or admin)

#### DELETE /api/stories/:id  
**Description**: Delete story
**Authentication**: Bearer token (admin only)

#### POST /api/stories/import
**Description**: Import stories from CSV
**Authentication**: Bearer token (admin only)
**Content-Type**: multipart/form-data
**File**: CSV file with story data

### Favorites

#### GET /api/favorites
**Description**: Get user's favorite stories
**Authentication**: Bearer token

#### POST /api/favorites/:storyId
**Description**: Add story to favorites
**Authentication**: Bearer token

#### DELETE /api/favorites/:storyId
**Description**: Remove from favorites
**Authentication**: Bearer token

#### GET /api/favorites/popular
**Description**: Get most favorited stories
**Query Parameters**: `limit` (default: 10)

### Classes

#### GET /api/classes
**Description**: Get user's classes
**Authentication**: Bearer token

#### POST /api/classes
**Description**: Create class (teachers only)
**Authentication**: Bearer token (teacher role)
**Request Body**:
```json
{
  "class_name": "English 101",
  "subject": "English",
  "description": "Introduction to English"
}
```

#### POST /api/classes/join
**Description**: Join class with code (students)
**Authentication**: Bearer token (student role)
**Request Body**:
```json
{
  "class_code": "AB12"
}
```

### Schools

#### GET /api/schools
**Description**: List all schools
**Authentication**: None (public)

#### GET /api/schools/public
**Description**: Public schools list for registration
**Authentication**: None

#### POST /api/schools
**Description**: Create new school
**Authentication**: Bearer token (admin only)

### Teacher Management

#### GET /api/teacher-requests
**Description**: List teacher registration requests
**Authentication**: Bearer token (admin only)

#### PUT /api/teacher-requests/:id/approve
**Description**: Approve teacher request
**Authentication**: Bearer token (admin only)

#### PUT /api/teacher-requests/:id/reject
**Description**: Reject teacher request
**Authentication**: Bearer token (admin only)

### Tags

#### GET /api/tags
**Description**: List all tags
**Authentication**: None

#### POST /api/tags
**Description**: Create new tag
**Authentication**: Bearer token (admin only)

---

## URLs and Domains

### Production URLs

| Service | URL |
|---------|-----|
| Main Application | https://podcast-stories-production.up.railway.app |
| API Base | https://podcast-stories-production.up.railway.app/api |
| Static Assets | https://podcast-stories-production.up.railway.app/css/, /js/, /includes/ |
| Old Frontend (deprecated) | https://frontend-production-b75b.up.railway.app |

### Development URLs

| Service | URL |
|---------|-----|
| Local Server | http://localhost:3000 |
| API Base | http://localhost:3000/api |

### External Services

| Service | URL |
|---------|-----|
| Railway Dashboard | https://railway.app/dashboard |
| GitHub Repository | https://github.com/farazuga/podcast-stories |

---

## Frontend Variables

### localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| token | string | JWT authentication token |
| user | JSON object | User data (id, email, role, name, school_id, teacher_id) |

### JavaScript Configuration

#### /js/config.js
```javascript
const AppConfig = {
  API_BASE_URL: 'https://podcast-stories-production.up.railway.app/api',
  DATE_FORMAT: 'MM/DD/YYYY',
  PAGINATION_LIMIT: 10,
  TOKEN_HEADER: 'Authorization',
  TOKEN_PREFIX: 'Bearer '
}
```

### Date Formats

- Database: `YYYY-MM-DD` (ISO 8601)
- Display: `MM/DD/YYYY` (US format)
- API: ISO 8601 strings

---

## Constants and Enums

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| amitrace_admin | System administrator | Full system access |
| teacher | Teacher account | Create classes, manage students |
| student | Student account | Join classes, create stories |
| admin | Legacy admin (migrate to amitrace_admin) | Admin access |
| user | Legacy user (migrate to student) | Basic access |

### Story Status

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| is_approved | boolean | true/false | Admin approval status |

### Token Expiration

| Token Type | Duration | Notes |
|------------|----------|-------|
| JWT Auth | 7 days | Configurable via JWT_EXPIRES_IN |
| Password Reset | 1 hour | Hardcoded in token-service.js |

### Class Code

- Format: 4 characters (A-Z, 0-9)
- Example: `AB12`, `XY89`
- Generated randomly, must be unique

---

## Authentication

### JWT Token Structure

**Header**:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload**:
```json
{
  "userId": 1,
  "email": "user@example.com",
  "role": "student",
  "iat": 1693267200,
  "exp": 1693872000
}
```

### Authorization Header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Password Hashing

- Algorithm: bcrypt
- Salt rounds: 10
- Column: `users.password` (NOT password_hash)

---

## Email System

### Gmail OAuth2 Configuration

Required for Gmail API:
- CLIENT_ID from Google Cloud Console
- CLIENT_SECRET from Google Cloud Console
- REFRESH_TOKEN from OAuth2 flow
- EMAIL_USER (Gmail address)

### SMTP Configuration

Alternative to OAuth2:
- EMAIL_USER (email address)
- EMAIL_PASS (app-specific password)

### Email Templates

#### Password Reset Email
- Subject: "Password Reset Request - VidPOD"
- Link format: `https://podcast-stories-production.up.railway.app/reset-password.html?token={token}`
- Expiration: 1 hour

#### Teacher Approval Email
- Subject: "Your VidPOD Teacher Account Has Been Approved!"
- Contains: Username and temporary password

#### Teacher Rejection Email
- Subject: "VidPOD Teacher Account Request Update"
- Contains: Rejection message

---

## Critical Notes

### ⚠️ Important Column Names

1. **Password Column**: The column is `password` NOT `password_hash`
   ```sql
   UPDATE users SET password = $1 WHERE id = $2  -- ✅ CORRECT
   UPDATE users SET password_hash = $1 WHERE id = $2  -- ❌ WRONG
   ```

2. **Email as Primary Login**: Use `email` not `username` for login
   ```javascript
   // Login with email, not username
   const user = await getUserByEmail(email);
   ```

### 🔗 URL Configuration

1. **Password Reset URLs**: Must use main domain
   ```javascript
   // ✅ CORRECT
   const resetUrl = `https://podcast-stories-production.up.railway.app/reset-password.html?token=${token}`;
   
   // ❌ WRONG (old frontend domain)
   const resetUrl = `https://frontend-production-b75b.up.railway.app/reset-password.html?token=${token}`;
   ```

### 🔐 Security Notes

1. **Never log full tokens in production**
   ```javascript
   console.log(`Token: ${token.substring(0, 8)}...`); // ✅ Log only partial
   console.log(`Token: ${token}`); // ❌ Never log full token
   ```

2. **Always hash passwords with bcrypt**
   ```javascript
   const bcrypt = require('bcrypt');
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

3. **Validate all user inputs**
   - Password minimum length: 6 characters
   - Email format validation
   - SQL injection prevention via parameterized queries

### 📝 Database Migrations

Recent critical migrations:
1. Removed unique constraint on `password_reset_tokens.user_id`
2. Added `is_approved` to `story_ideas`
3. Multi-tier user management system

---

## Maintenance

### Adding New Features

When adding new features, update:
1. This document (TECHNICAL_REFERENCE.md)
2. Database schema if tables change
3. API documentation for new endpoints
4. Environment variables if new configs needed

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.1.0 | Aug 28, 2025 | Fixed password reset, documented all systems |
| 2.0.0 | Aug 2025 | Multi-tier user management |
| 1.0.0 | Initial | Basic story management |

---

*For questions or updates, contact the development team or refer to the GitHub repository.*