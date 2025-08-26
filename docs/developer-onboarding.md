# VidPOD Developer Onboarding Guide

*Comprehensive guide for new developers joining the VidPOD project*

## Table of Contents
1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Development Environment Setup](#development-environment-setup)
4. [Code Organization](#code-organization)
5. [Key Concepts](#key-concepts)
6. [Development Workflow](#development-workflow)
7. [Testing Guide](#testing-guide)
8. [Deployment Process](#deployment-process)
9. [Troubleshooting](#troubleshooting)
10. [Resources and Learning Materials](#resources-and-learning-materials)

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **PostgreSQL** (v13 or higher)
- **Git** (for version control)
- **Code Editor** (VS Code recommended)

### Quick Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/podcast-stories.git
   cd podcast-stories
   ```

2. **Install dependencies:**
   ```bash
   # Install root-level testing dependencies
   npm install
   
   # Install backend dependencies
   cd backend && npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Set up the database:**
   ```bash
   # Create local PostgreSQL database
   createdb vidpod_dev
   
   # Run database setup in correct order
   psql vidpod_dev < backend/db/schema.sql
   psql vidpod_dev < backend/db/updated-schema.sql
   
   # Apply migrations in chronological order (check migration numbers)
   psql vidpod_dev < backend/migrations/007_create_user_favorites.sql
   psql vidpod_dev < backend/migrations/008_create_analytics_tables.sql
   psql vidpod_dev < backend/migrations/009_phase1_user_email_migration.sql
   psql vidpod_dev < backend/migrations/010_phase2_story_approval.sql
   psql vidpod_dev < backend/migrations/010_user_management_system.sql
   psql vidpod_dev < backend/migrations/011_add_first_last_name_fields.sql
   # Note: Check backend/migrations/ directory for any additional migrations
   ```

5. **Start the development server:**
   ```bash
   # Navigate to backend directory
   cd backend
   
   # Start development server with auto-reload
   npm run dev
   
   # Or start production server
   npm start
   ```

6. **Access the application:**
   - Open your browser to `http://localhost:3000`
   - Use test credentials: `admin@vidpod.com / vidpod`

---

## Architecture Overview

VidPOD follows a three-tier web application architecture. Understanding this structure is crucial for effective development.

### 📊 System Architecture
For detailed architectural diagrams and system overview, see: [System Overview Documentation](./architecture/system-overview.md)

Key architectural components:
- **Frontend**: Vanilla HTML/CSS/JavaScript (served from `backend/frontend/`)
- **Backend**: Express.js REST API with JWT authentication (17 route modules)
- **Database**: PostgreSQL with complex relational schema
- **Hosting**: Railway.app with automatic deployments

### 🔑 Core Concepts

**Multi-Tier Role System:**
- `amitrace_admin`: Full system access, approves teachers, manages schools
- `teacher`: Creates classes, manages students, creates/edits stories
- `student`: Joins classes, creates stories, manages favorites

**Content Approval Workflow:**
- Stories require admin approval before becoming public
- Teachers must be approved by admins before gaining full access
- Role-based content visibility and editing permissions

**Unified Navigation System:**
- Single navigation template shared across all authenticated pages
- Role-based menu visibility controlled by JavaScript
- Mobile-responsive design with hamburger menu

---

## Development Environment Setup

### Local Database Setup

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create development database:**
   ```bash
   createdb vidpod_dev
   createuser vidpod_user --pwprompt
   # Enter password when prompted
   ```

3. **Set up database schema:**
   ```bash
   psql vidpod_dev < backend/db/updated-schema.sql
   ```

### Environment Configuration

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://vidpod_user:your_password@localhost:5432/vidpod_dev

# Authentication
JWT_SECRET=your-super-secret-jwt-key-for-development

# Server
NODE_ENV=development
PORT=3000

# Email (development - use Ethereal Email for testing)
EMAIL_USER=your-test-email@ethereal.email
EMAIL_PASS=your-test-password

# Admin User (will be created on first run)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=vidpod
ADMIN_EMAIL=admin@vidpod.com
```

### Development Server

```bash
# Navigate to backend directory first
cd backend

# Start development server with hot reload
npm run dev

# Start production server
npm start

# Run manual tests (from root directory)
cd ..
npm test                    # Runs all test suites
npm run test:e2e           # End-to-end tests
npm run test:api           # API tests
npm run test:admin         # Admin panel tests
npm run test:csv           # CSV import tests
```

---

## Code Organization

### Project Structure

```
podcast-stories/
├── backend/
│   ├── server.js                 # Main Express application
│   ├── db/
│   │   ├── updated-schema.sql    # Database schema
│   │   └── migrations/           # Database migrations
│   ├── routes/                   # API endpoint modules
│   │   ├── auth.js              # Authentication endpoints
│   │   ├── stories.js           # Story management endpoints
│   │   ├── users.js             # User management endpoints
│   │   └── ... (18 total files)
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── services/
│   │   └── email.js             # Email notification service
│   └── frontend/                # Served static files
├── frontend/                     # Development frontend files
│   ├── *.html                   # Page templates
│   ├── css/styles.css           # Application styling
│   ├── js/                      # JavaScript modules
│   ├── includes/                # Reusable components
│   └── assets/                  # Static assets
├── docs/                        # Documentation
├── testing/                     # Test suites
└── package.json
```

### Naming Conventions

**Files and Directories:**
- Use kebab-case for filenames: `story-detail.html`, `user-management.js`
- Use camelCase for JavaScript variables and functions
- Use PascalCase for constructor functions and classes

**Database:**
- Use snake_case for table and column names: `story_ideas`, `user_id`
- Use descriptive names: `coverage_start_date` not `start_date`

**API Endpoints:**
- Use REST conventions: `GET /api/stories`, `POST /api/stories`
- Use plural nouns for resources: `/api/stories`, `/api/users`
- Use descriptive actions: `/api/stories/:id/approve`

---

## Key Concepts

### Authentication System

**JWT Token Flow:**
```javascript
// Login request
const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
});

const { token, user } = await response.json();

// Store token
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(user));

// Use token in subsequent requests
const authHeaders = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
};
```

**Role-Based Access Control:**
```javascript
// Middleware checks user role
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};

// Usage in routes
router.delete('/api/stories/:id', authenticateToken, requireRole(['amitrace_admin']), deleteStory);
```

### Database Relationships

**Key Relationships:**
- `users` → `schools`: Many-to-one relationship
- `users` → `classes`: Many-to-many via `user_classes`
- `story_ideas` → `tags`: Many-to-many via `story_tags`
- `users` → `story_ideas`: One-to-many (favorites) via `user_favorites`

**Example Query with Joins:**
```sql
SELECT s.*, u.name as author_name, 
       array_agg(DISTINCT t.tag_name) as tags,
       COUNT(DISTINCT f.user_id) as favorite_count
FROM story_ideas s
LEFT JOIN users u ON s.uploaded_by = u.id
LEFT JOIN story_tags st ON s.id = st.story_id
LEFT JOIN tags t ON st.tag_id = t.id
LEFT JOIN user_favorites f ON s.id = f.story_id
WHERE s.is_approved = true
GROUP BY s.id, u.name
ORDER BY s.created_at DESC;
```

### Unified Navigation System

**Navigation Loading:**
```html
<!-- In every authenticated page -->
<script src="js/navigation.js"></script>
<script src="js/include-navigation.js"></script>
```

**Role-Based Menu Items:**
```javascript
// In navigation.js
const menuItems = {
    'amitrace_admin': [
        { href: 'admin.html', text: 'Admin Panel' },
        { href: 'admin-browse-stories.html', text: 'Browse Stories' },
        { href: 'user-management.html', text: 'User Management' }
    ],
    'teacher': [
        { href: 'teacher-dashboard.html', text: 'Dashboard' },
        { href: 'stories.html', text: 'Browse Stories' },
        { href: 'add-story.html', text: 'Add Story' }
    ],
    'student': [
        { href: 'dashboard.html', text: 'Dashboard' },
        { href: 'stories.html', text: 'Browse Stories' },
        { href: 'add-story.html', text: 'Add Story' }
    ]
};
```

### Story Approval Workflow

**Story Creation:**
1. User creates story (any role can create)
2. Story saved with `is_approved: false`
3. Only visible to admins and creator
4. Admin reviews and approves/rejects
5. Approved stories become publicly visible

**Implementation:**
```javascript
// Create story
router.post('/api/stories', authenticateToken, async (req, res) => {
    const story = await db.query(
        'INSERT INTO story_ideas (...) VALUES (...) RETURNING *',
        [...values, false] // is_approved = false
    );
    res.json(story.rows[0]);
});

// Approve story (admin only)
router.put('/api/stories/:id/approve', authenticateToken, requireRole(['amitrace_admin']), async (req, res) => {
    await db.query('UPDATE story_ideas SET is_approved = true WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});
```

---

## Development Workflow

### Feature Development Process

1. **Create Feature Branch:**
   ```bash
   git checkout -b feature/user-story-summary
   ```

2. **Backend Development:**
   - Add/modify API endpoints in `backend/routes/`
   - Update database schema if needed (create migration)
   - Add authentication/authorization if required
   - Test endpoints with curl or Postman

3. **Frontend Development:**
   - Create/modify HTML templates in `frontend/`
   - Add JavaScript functionality in `frontend/js/`
   - Update CSS styling in `frontend/css/styles.css`
   - Test user interface and interactions

4. **Testing:**
   - Write unit tests for new functionality
   - Run existing test suite: `npm test` (from root directory)
   - Perform manual testing across user roles
   - Test responsive design on mobile

5. **Documentation:**
   - Update API documentation if endpoints changed
   - Update this guide if new concepts introduced
   - Add comments to complex code sections

6. **Code Review:**
   - Create pull request with clear description
   - Include screenshots for UI changes
   - Address reviewer feedback
   - Ensure all tests pass

### Adding New API Endpoints

1. **Create Route Handler:**
   ```javascript
   // In appropriate route file (e.g., backend/routes/stories.js)
   router.get('/api/stories/trending', authenticateToken, async (req, res) => {
       try {
           const result = await db.query(`
               SELECT s.*, COUNT(f.user_id) as favorite_count
               FROM story_ideas s
               LEFT JOIN user_favorites f ON s.id = f.story_id
               WHERE s.is_approved = true
               GROUP BY s.id
               ORDER BY favorite_count DESC
               LIMIT 10
           `);
           res.json(result.rows);
       } catch (error) {
           console.error('Error fetching trending stories:', error);
           res.status(500).json({ error: 'Failed to fetch trending stories' });
       }
   });
   ```

2. **Register Route:**
   ```javascript
   // In backend/server.js
   const storiesRouter = require('./routes/stories');
   app.use('/api', storiesRouter);
   ```

3. **Frontend Integration:**
   ```javascript
   // In frontend JavaScript
   async function loadTrendingStories() {
       try {
           const response = await fetch('/api/stories/trending', {
               headers: {
                   'Authorization': `Bearer ${localStorage.getItem('token')}`
               }
           });
           const stories = await response.json();
           displayStories(stories);
       } catch (error) {
           console.error('Error loading trending stories:', error);
       }
   }
   ```

### Database Schema Changes

1. **Create Migration File:**
   ```sql
   -- backend/db/migrations/add_story_popularity_score.sql
   ALTER TABLE story_ideas 
   ADD COLUMN popularity_score INTEGER DEFAULT 0;
   
   CREATE INDEX idx_story_popularity ON story_ideas(popularity_score DESC);
   ```

2. **Test Migration Locally:**
   ```bash
   psql vidpod_dev < backend/db/migrations/add_story_popularity_score.sql
   ```

3. **Update Schema File:**
   ```sql
   -- Add to backend/db/updated-schema.sql
   ALTER TABLE story_ideas 
   ADD COLUMN popularity_score INTEGER DEFAULT 0;
   ```

4. **Deploy to Production:**
   ```bash
   # Migration will be applied automatically on Railway deployment
   git push origin main
   ```

---

## Testing Guide

### Test Categories

**Unit Tests:**
- Individual function testing
- API endpoint testing  
- Database operation testing
- Authentication flow testing

**Integration Tests:**
- End-to-end user workflows
- Cross-component interaction
- Multi-role scenario testing

**Manual Tests:**
- User experience validation
- Cross-browser compatibility
- Mobile responsive design
- Accessibility compliance

### Running Tests

```bash
# Run all tests (from root directory)
npm test                    # Runs test:all - includes E2E, API, and integration
npm run test:e2e           # End-to-end user flow tests
npm run test:api           # Backend API tests  
npm run test:integration   # Integration tests
npm run test:admin         # Admin panel comprehensive tests
npm run test:teacher       # Teacher workflow tests
npm run test:student       # Student workflow tests
npm run test:csv           # CSV import functionality tests

# Debug and verification commands
npm run debug:deployment   # Check deployment status
npm run debug:database     # Check database connectivity
npm run verify:all         # Run deployment and database checks
```

### Test Structure Example

```javascript
// Example test file: tests/api/auth.test.js
const request = require('supertest');
const app = require('../../backend/server');

describe('Authentication Endpoints', () => {
    describe('POST /api/auth/login', () => {
        it('should authenticate valid user', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@vidpod.com',
                    password: 'vidpod'
                });
            
            expect(response.status).toBe(200);
            expect(response.body.token).toBeDefined();
            expect(response.body.user.role).toBe('amitrace_admin');
        });
        
        it('should reject invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@vidpod.com',
                    password: 'wrong-password'
                });
            
            expect(response.status).toBe(401);
            expect(response.body.error).toBeDefined();
        });
    });
});
```

### Testing Best Practices

1. **Test All User Roles:** Ensure functionality works correctly for admin, teacher, and student roles
2. **Test Edge Cases:** Empty inputs, invalid data, non-existent resources
3. **Test Authentication:** Verify protected routes require authentication
4. **Test Authorization:** Ensure role-based access control works correctly
5. **Clean Up:** Reset database state between tests

For comprehensive testing documentation, see: [Master Testing Guide](./testing/master-testing-guide.md)

---

## Deployment Process

### Development to Production

VidPOD uses Railway.app for automatic deployments from GitHub.

1. **Local Testing:**
   ```bash
   # Ensure all tests pass
   npm test    # (from root directory)
   
   # Test production build locally
   NODE_ENV=production npm start
   ```

2. **Commit and Push:**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   git push origin feature-branch
   ```

3. **Create Pull Request:**
   - Create PR from feature branch to main
   - Ensure all CI checks pass
   - Get code review approval

4. **Deploy to Production:**
   ```bash
   # Merge to main triggers automatic Railway deployment
   git checkout main
   git merge feature-branch
   git push origin main
   ```

### Environment Variables

**Required Production Variables:**
```env
DATABASE_URL=postgresql://... # Railway PostgreSQL addon
JWT_SECRET=secure-production-secret
NODE_ENV=production

# Email service (choose one method)
EMAIL_USER=notifications@vidpod.com
EMAIL_PASS=app-specific-password

# OR OAuth2
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...

# Default admin account
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-production-password
ADMIN_EMAIL=admin@vidpod.com
```

### Database Migrations

```bash
# Local development
psql $DATABASE_URL < backend/db/migrations/new_migration.sql

# Production (Railway automatically applies on deployment)
# Ensure migrations are in backend/db/updated-schema.sql
```

### Health Checks

```javascript
// Built-in health check endpoint
GET /api/health
// Returns: { status: 'ok', timestamp: '...' }
```

For detailed deployment documentation, see: [Railway Deployment Guide](./deployment/railway-deployment-guide.md)

---

## Troubleshooting

### Common Issues

**Login Problems:**
```bash
# Clear browser localStorage
localStorage.clear();

# Check email format (must be email, not username)
# Verify test credentials: admin@vidpod.com / vidpod
```

**API Errors:**
```bash
# Check if server is running
curl http://localhost:3000/api/health

# Check authentication token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/stories

# Check database connection
psql $DATABASE_URL -c "SELECT count(*) FROM users;"
```

**Frontend Display Issues:**
```bash
# Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
# Check browser console for JavaScript errors
# Verify navigation is loading correctly
```

**Database Issues:**
```bash
# Reset local database
dropdb vidpod_dev && createdb vidpod_dev
psql vidpod_dev < backend/db/updated-schema.sql

# Check connection
psql $DATABASE_URL -c "\dt" # List tables
```

### Debug Tools

**Frontend Debugging:**
- Browser DevTools Console
- Network tab for API call inspection
- Application tab for localStorage inspection
- Responsive design mode for mobile testing

**Backend Debugging:**
- Server logs via `console.log()` statements
- Database query logging
- API testing with curl or Postman
- Node.js debugger with `--inspect` flag

**Database Debugging:**
```bash
# Connect to database
psql $DATABASE_URL

# Useful queries
SELECT * FROM users WHERE role = 'amitrace_admin';
SELECT * FROM story_ideas WHERE is_approved = false;
SELECT * FROM classes WHERE is_active = true;
```

### Performance Issues

**Slow Database Queries:**
```sql
-- Enable query logging
SET log_statement = 'all';

-- Check slow queries
EXPLAIN ANALYZE SELECT ...;

-- Add indexes for frequent queries
CREATE INDEX idx_stories_approved ON story_ideas(is_approved);
```

**Frontend Performance:**
- Minimize API calls with data caching
- Optimize images and assets
- Use pagination for large datasets
- Implement loading states for better UX

---

## Resources and Learning Materials

### Documentation

- **[System Architecture Overview](./architecture/system-overview.md)** - Comprehensive architectural diagrams and explanations
- **[Master Testing Guide](./testing/master-testing-guide.md)** - Complete testing procedures and best practices
- **[Railway Deployment Guide](./deployment/railway-deployment-guide.md)** - Production deployment instructions
- **[CSV Import Documentation](./features/csv-import.md)** - CSV import/export functionality
- **[Navigation System Guide](./architecture/navigation.md)** - Unified navigation implementation

### Technology References

**Backend:**
- [Express.js Documentation](https://expressjs.com/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/) - JWT token debugging
- [Nodemailer Guide](https://nodemailer.com/about/)

**Frontend:**
- [MDN Web Docs](https://developer.mozilla.org/) - HTML, CSS, JavaScript reference
- [Fetch API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Responsive Design Principles](https://web.dev/responsive-web-design-basics/)

**Database:**
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [SQL Reference](https://www.w3schools.com/sql/)
- [Database Design Principles](https://www.lucidchart.com/pages/database-diagram/database-design)

### Development Tools

**Code Editor Setup (VS Code):**
```json
// Recommended extensions
{
    "recommendations": [
        "ms-vscode.vscode-json",
        "bradlc.vscode-tailwindcss",
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "ms-vscode.vscode-typescript-next"
    ]
}
```

**Useful CLI Tools:**
```bash
# Database management
brew install postgresql
npm install -g db-migrate

# API testing
brew install curl
npm install -g postman-cli

# Development utilities
npm install -g nodemon
npm install -g concurrently
```

### Learning Path for New Developers

1. **Week 1: Environment Setup**
   - Set up development environment
   - Run application locally
   - Explore codebase structure
   - Create first test account

2. **Week 2: Architecture Understanding**
   - Study system architecture diagrams
   - Understand authentication flow
   - Learn role-based access control
   - Practice API calls with different roles

3. **Week 3: Database Deep Dive**
   - Study database schema relationships
   - Practice SQL queries
   - Understand migration system
   - Learn data flow patterns

4. **Week 4: Frontend Development**
   - Understand unified navigation system
   - Practice creating new pages
   - Learn JavaScript module patterns
   - Implement responsive design features

5. **Week 5+: Feature Development**
   - Choose small feature to implement
   - Follow complete development workflow
   - Write tests for new functionality
   - Deploy to production environment

### Getting Help

**Internal Resources:**
- This developer onboarding guide
- System architecture documentation
- Code comments and inline documentation
- Test examples and patterns

**Team Communication:**
- Daily standups for blockers and questions
- Code review process for learning
- Pair programming sessions
- Architecture decision discussions

**External Resources:**
- Stack Overflow for specific technical questions
- GitHub issues for bug reports and feature requests
- Technology documentation for APIs and frameworks
- Community forums for best practices

---

*Welcome to the VidPOD development team! This guide will help you become productive quickly. Don't hesitate to ask questions and contribute improvements to this documentation as you learn.*