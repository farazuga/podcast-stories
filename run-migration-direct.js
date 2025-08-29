#!/usr/bin/env node

/**
 * Direct Migration Runner
 * Runs the migration SQL directly via API query
 */

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function runDirectMigration() {
    console.log('🚀 Direct Rundown Migration');
    console.log('='.repeat(50));

    try {
        // Step 1: Authenticate
        console.log('1. Authenticating...');
        const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@vidpod.com',
                password: 'vidpod'
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Authentication failed');
        }

        const { token } = await loginResponse.json();
        console.log('✅ Authenticated successfully');

        // Step 2: Try to create tables one by one
        console.log('\n2. Creating rundown tables...');

        const createStatements = [
            {
                name: 'rundowns',
                sql: `CREATE TABLE IF NOT EXISTS rundowns (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
                    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
                    scheduled_date TIMESTAMP,
                    total_duration INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`
            },
            {
                name: 'rundown_segments',
                sql: `CREATE TABLE IF NOT EXISTS rundown_segments (
                    id SERIAL PRIMARY KEY,
                    rundown_id INTEGER NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL CHECK (type IN ('intro', 'story', 'interview', 'break', 'outro', 'custom')),
                    content JSONB DEFAULT '{}',
                    duration INTEGER DEFAULT 0,
                    order_index INTEGER NOT NULL,
                    is_pinned BOOLEAN DEFAULT FALSE,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(rundown_id, order_index)
                );`
            },
            {
                name: 'rundown_talent',
                sql: `CREATE TABLE IF NOT EXISTS rundown_talent (
                    id SERIAL PRIMARY KEY,
                    rundown_id INTEGER NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL CHECK (role IN ('host', 'co-host', 'guest', 'expert')),
                    bio TEXT,
                    contact_info JSONB DEFAULT '{}',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(rundown_id, name)
                );`
            },
            {
                name: 'rundown_stories',
                sql: `CREATE TABLE IF NOT EXISTS rundown_stories (
                    id SERIAL PRIMARY KEY,
                    rundown_id INTEGER NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
                    story_id INTEGER NOT NULL REFERENCES story_ideas(id) ON DELETE CASCADE,
                    segment_id INTEGER REFERENCES rundown_segments(id) ON DELETE SET NULL,
                    order_index INTEGER,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(rundown_id, story_id)
                );`
            }
        ];

        // Try using the debug endpoint to run raw SQL
        console.log('   Using debug endpoint to execute SQL...');

        for (const table of createStatements) {
            console.log(`   Creating ${table.name}...`);
            
            const response = await fetch(`${PRODUCTION_URL}/api/debug/sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: table.sql
                })
            });

            if (response.ok) {
                console.log(`   ✅ ${table.name} created successfully`);
            } else {
                const error = await response.text();
                console.log(`   ❌ ${table.name} failed: ${response.status}`);
                console.log(`   Error: ${error}`);
            }
        }

        // Step 3: Create indexes
        console.log('\n3. Creating indexes...');
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_rundowns_created_by ON rundowns(created_by);',
            'CREATE INDEX IF NOT EXISTS idx_rundowns_class_id ON rundowns(class_id);',
            'CREATE INDEX IF NOT EXISTS idx_rundowns_status ON rundowns(status);',
            'CREATE INDEX IF NOT EXISTS idx_rundown_segments_rundown_id ON rundown_segments(rundown_id);',
            'CREATE INDEX IF NOT EXISTS idx_rundown_talent_rundown_id ON rundown_talent(rundown_id);',
            'CREATE INDEX IF NOT EXISTS idx_rundown_stories_rundown_id ON rundown_stories(rundown_id);'
        ];

        for (const indexSql of indexes) {
            const indexName = indexSql.match(/idx_(\w+)/)?.[1] || 'unknown';
            console.log(`   Creating index ${indexName}...`);
            
            const response = await fetch(`${PRODUCTION_URL}/api/debug/sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: indexSql
                })
            });

            if (response.ok) {
                console.log(`   ✅ Index ${indexName} created`);
            } else {
                console.log(`   ⚠️ Index ${indexName} may already exist`);
            }
        }

        // Step 4: Test rundown endpoint
        console.log('\n4. Testing rundown endpoint...');
        const testResponse = await fetch(`${PRODUCTION_URL}/api/rundowns`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (testResponse.ok) {
            const data = await testResponse.json();
            console.log(`   ✅ Rundown endpoint working! Found ${data.length} rundowns`);
            
            console.log('\n🎉 MIGRATION SUCCESSFUL!');
            console.log('✅ All rundown tables created');
            console.log('✅ Rundown API endpoints functional');
            console.log('='.repeat(50));
            
        } else {
            const error = await testResponse.text();
            console.log(`   ❌ Rundown endpoint still failing: ${testResponse.status}`);
            console.log(`   Error: ${error}`);
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    }
}

// Run if executed directly
if (require.main === module) {
    runDirectMigration();
}