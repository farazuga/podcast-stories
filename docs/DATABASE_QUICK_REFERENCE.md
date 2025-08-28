# Database Quick Reference

*For complete schema details, see [TECHNICAL_REFERENCE.md](../TECHNICAL_REFERENCE.md)*

## Table Relationships

```
schools (1:many) → users
schools (1:many) → classes
schools (1:many) → teacher_requests

users (1:many) → story_ideas (as uploaded_by)
users (1:many) → classes (as teacher_id) 
users (1:many) → password_reset_tokens
users (1:many) → user_favorites
users (many:many) → classes (via user_classes)

story_ideas (many:many) → tags (via story_tags)
story_ideas (many:many) → interviewees (via story_interviewees)
story_ideas (1:many) → user_favorites

classes (1:many) → user_classes
```

## Key Tables Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| users | User accounts | email, **password** (not password_hash), role |
| story_ideas | Story submissions | idea_title, is_approved, uploaded_by |
| schools | Educational institutions | school_name |
| classes | Teacher-created classes | class_code (4 chars), teacher_id |
| password_reset_tokens | Password reset flow | token (64 chars), expires_at |
| user_favorites | User's favorite stories | user_id, story_id |
| teacher_requests | Teacher registration requests | email, status |

## Common Queries

### User Management
```sql
-- Find user by email (primary login method)
SELECT id, email, role, name, school_id FROM users 
WHERE email = $1;

-- Get user with school info
SELECT u.*, s.school_name 
FROM users u 
LEFT JOIN schools s ON u.school_id = s.id 
WHERE u.email = $1;

-- Update password (IMPORTANT: column is 'password' not 'password_hash')
UPDATE users SET password = $1 WHERE id = $2;
```

### Story Queries
```sql
-- Get stories with approval status
SELECT s.*, u.name as author_name, sch.school_name
FROM story_ideas s
JOIN users u ON s.uploaded_by = u.id
LEFT JOIN schools sch ON u.school_id = sch.id
WHERE s.is_approved = true
ORDER BY s.uploaded_date DESC;

-- Get stories with tags
SELECT s.id, s.idea_title, array_agg(t.tag_name) as tags
FROM story_ideas s
LEFT JOIN story_tags st ON s.id = st.story_id
LEFT JOIN tags t ON st.tag_id = t.id
GROUP BY s.id, s.idea_title;

-- Get user's favorite stories
SELECT s.*, uf.created_at as favorited_at
FROM story_ideas s
JOIN user_favorites uf ON s.id = uf.story_id
WHERE uf.user_id = $1
ORDER BY uf.created_at DESC;
```

### Class Management
```sql
-- Get teacher's classes with student count
SELECT c.*, COUNT(uc.user_id) as student_count
FROM classes c
LEFT JOIN user_classes uc ON c.id = uc.class_id
WHERE c.teacher_id = $1 AND c.is_active = true
GROUP BY c.id;

-- Join student to class by code
INSERT INTO user_classes (user_id, class_id)
SELECT $1, id FROM classes WHERE class_code = $2;

-- Generate unique 4-digit class code
WITH RECURSIVE generate_code AS (
  SELECT UPPER(
    CHR(65 + (RANDOM() * 26)::int) || 
    CHR(65 + (RANDOM() * 26)::int) || 
    (RANDOM() * 10)::int || 
    (RANDOM() * 10)::int
  ) as code
),
check_unique AS (
  SELECT code FROM generate_code
  WHERE NOT EXISTS (SELECT 1 FROM classes WHERE class_code = code)
  LIMIT 1
)
SELECT code FROM check_unique;
```

### Password Reset
```sql
-- Create password reset token
INSERT INTO password_reset_tokens (user_id, token, expires_at, used, created_at)
VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
RETURNING id, created_at;

-- Validate reset token (with user JOIN)
SELECT prt.*, u.email, u.name, u.role
FROM password_reset_tokens prt
JOIN users u ON prt.user_id = u.id
WHERE prt.token = $1
  AND prt.expires_at > CURRENT_TIMESTAMP
  AND prt.used = false;

-- Mark token as used after password reset
UPDATE password_reset_tokens 
SET used = true 
WHERE user_id = $1;
```

### Teacher Requests
```sql
-- Get pending teacher requests with school info
SELECT tr.*, s.school_name
FROM teacher_requests tr
JOIN schools s ON tr.school_id = s.id
WHERE tr.status = 'pending'
ORDER BY tr.requested_at ASC;

-- Approve teacher request (creates user account)
BEGIN;
UPDATE teacher_requests 
SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP
WHERE id = $2;

INSERT INTO users (username, password, email, role, name, school_id)
SELECT tr.email, $3, tr.email, 'teacher', tr.name, tr.school_id
FROM teacher_requests tr WHERE tr.id = $2;
COMMIT;
```

## Indexes for Performance

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_school ON users(school_id);

-- Story searches
CREATE INDEX idx_stories_approved ON story_ideas(is_approved);
CREATE INDEX idx_stories_date ON story_ideas(uploaded_date);
CREATE INDEX idx_stories_author ON story_ideas(uploaded_by);

-- Class codes
CREATE INDEX idx_classes_code ON classes(class_code);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);

-- Password reset tokens
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);

-- Favorites
CREATE INDEX idx_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_favorites_story ON user_favorites(story_id);
```

## Data Constraints

### Critical Constraints
```sql
-- User roles
CHECK (role IN ('amitrace_admin', 'teacher', 'student', 'admin', 'user'))

-- Teacher request status
CHECK (status IN ('pending', 'approved', 'rejected'))

-- Class code format (4 characters)
class_code CHAR(4) UNIQUE NOT NULL

-- Password reset token (64 hex characters)
token VARCHAR(255) UNIQUE NOT NULL

-- Unique favorites per user
UNIQUE(user_id, story_id) -- in user_favorites table
```

## Migration Commands

### Connect to Database
```bash
# Production (Railway)
psql $DATABASE_URL

# Local development
psql postgres://localhost/vidpod_development
```

### Common Migration Tasks
```sql
-- Add new column safely
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field VARCHAR(255);

-- Update role enum
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('amitrace_admin', 'teacher', 'student', 'admin', 'user'));

-- Clean up expired tokens
DELETE FROM password_reset_tokens 
WHERE expires_at < CURRENT_TIMESTAMP;

-- Fix admin role (if needed)
UPDATE users SET role = 'amitrace_admin' 
WHERE role = 'admin' AND username = 'admin';
```

## Backup and Recovery

### Backup Database
```bash
# Full database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema only
pg_dump $DATABASE_URL --schema-only > schema_backup.sql

# Data only
pg_dump $DATABASE_URL --data-only > data_backup.sql
```

### Restore Database
```bash
# Full restore
psql $DATABASE_URL < backup_file.sql

# Schema only
psql $DATABASE_URL < schema_backup.sql
```

## Data Validation Queries

### Check Data Integrity
```sql
-- Users without schools (should be minimal)
SELECT email, role FROM users WHERE school_id IS NULL;

-- Stories without authors (should be none)
SELECT id, idea_title FROM story_ideas 
WHERE uploaded_by NOT IN (SELECT id FROM users);

-- Expired unused tokens (cleanup candidates)
SELECT COUNT(*) FROM password_reset_tokens 
WHERE expires_at < CURRENT_TIMESTAMP AND used = false;

-- Classes without teachers (should be none)
SELECT class_name, class_code FROM classes 
WHERE teacher_id NOT IN (SELECT id FROM users WHERE role = 'teacher');

-- Duplicate class codes (should be none)
SELECT class_code, COUNT(*) FROM classes 
GROUP BY class_code HAVING COUNT(*) > 1;
```

## Performance Monitoring

### Query Performance
```sql
-- Slow queries (if pg_stat_statements enabled)
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;

-- Table sizes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;
```

---

*For complete column details and relationships, see [TECHNICAL_REFERENCE.md](../TECHNICAL_REFERENCE.md)*