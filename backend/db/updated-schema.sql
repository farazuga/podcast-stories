-- Updated Database Schema for Multi-Tier User Management System
-- Run this after the original schema.sql

-- Schools table (managed by Amitrace Admins)
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    school_name VARCHAR(255) UNIQUE NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher registration requests (pending approval)
CREATE TABLE teacher_requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    school_id INTEGER REFERENCES schools(id),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP
);

-- Classes table (created by teachers)
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    class_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    description TEXT,
    class_code CHAR(4) UNIQUE NOT NULL,
    teacher_id INTEGER REFERENCES users(id),
    school_id INTEGER REFERENCES schools(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student-Class enrollment (many-to-many)
CREATE TABLE user_classes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, class_id)
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS student_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);

-- Update role column to support new user types
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('amitrace_admin', 'teacher', 'student', 'admin', 'user'));

-- Indexes for better performance
CREATE INDEX idx_teacher_requests_status ON teacher_requests(status);
CREATE INDEX idx_teacher_requests_email ON teacher_requests(email);
CREATE INDEX idx_classes_code ON classes(class_code);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_school ON classes(school_id);
CREATE INDEX idx_user_classes_user ON user_classes(user_id);
CREATE INDEX idx_user_classes_class ON user_classes(class_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_teacher ON users(teacher_id);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);

-- Insert initial data
-- Create initial school for existing admin
INSERT INTO schools (school_name, created_by) 
SELECT 'Podcast Central HS', id FROM users WHERE role IN ('admin', 'amitrace_admin') LIMIT 1;

-- Update existing admin user to amitrace_admin
UPDATE users SET 
    role = 'amitrace_admin',
    name = 'System Administrator',
    school_id = (SELECT id FROM schools WHERE school_name = 'Podcast Central HS')
WHERE role IN ('admin') AND username = 'admin';