-- Database schema for Podcast Stories

-- Users table with email and school fields
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    school VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Story ideas table
CREATE TABLE story_ideas (
    id SERIAL PRIMARY KEY,
    idea_title VARCHAR(255) NOT NULL,
    idea_description TEXT,
    question_1 TEXT,
    question_2 TEXT,
    question_3 TEXT,
    question_4 TEXT,
    question_5 TEXT,
    question_6 TEXT,
    coverage_start_date DATE,
    coverage_end_date DATE,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Separate table for interviewees (normalized for searchability)
CREATE TABLE interviewees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- Junction table for story-interviewee relationship
CREATE TABLE story_interviewees (
    story_id INTEGER REFERENCES story_ideas(id) ON DELETE CASCADE,
    interviewee_id INTEGER REFERENCES interviewees(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, interviewee_id)
);

-- Tags table (admin-managed)
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    tag_name VARCHAR(50) UNIQUE NOT NULL,
    created_by INTEGER REFERENCES users(id)
);

-- Junction table for story-tag relationship
CREATE TABLE story_tags (
    story_id INTEGER REFERENCES story_ideas(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, tag_id)
);

-- Indexes for better search performance
CREATE INDEX idx_story_title ON story_ideas(idea_title);
CREATE INDEX idx_story_dates ON story_ideas(coverage_start_date, coverage_end_date);
CREATE INDEX idx_interviewee_name ON interviewees(name);
CREATE INDEX idx_tag_name ON tags(tag_name);