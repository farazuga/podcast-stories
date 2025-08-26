# VidPOD - Podcast Stories Database

A sophisticated web application for managing podcast story ideas in educational environments, featuring multi-tier user management, approval workflows, and comprehensive content organization.

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/podcast-stories.git
cd podcast-stories

# Install root dependencies (testing)
npm install

# Install backend dependencies
cd backend && npm install

# Set up environment
cp .env.example .env

# Set up database (run in order)
createdb vidpod_dev
psql vidpod_dev < backend/db/schema.sql
psql vidpod_dev < backend/db/updated-schema.sql
# Apply migrations as needed

# Start development server from backend directory
cd backend && npm run dev

# Access application
open http://localhost:3000
```

**Test Credentials:**
- Admin: `admin@vidpod.com / vidpod`
- Teacher: `teacher@vidpod.com / vidpod`
- Student: `student@vidpod.com / vidpod`

## 📚 Documentation

### 🏗️ Architecture
- **[System Overview](./docs/architecture/system-overview.md)** - Comprehensive architecture with Mermaid diagrams
- **[Database Schema](./docs/architecture/system-overview.md#database-schema-relationships)** - Entity relationships and design
- **[API Structure](./docs/architecture/system-overview.md#api-routes-structure)** - Complete endpoint documentation
- **[Navigation System](./docs/architecture/navigation.md)** - Unified navigation implementation

### 👩‍💻 Development
- **[Developer Onboarding](./docs/developer-onboarding.md)** - Complete guide for new developers
- **[Testing Guide](./docs/testing/master-testing-guide.md)** - Comprehensive testing procedures
- **[Deployment Guide](./docs/deployment/railway-deployment-guide.md)** - Production deployment instructions

### 🎯 Features
- **[CSV Import](./docs/features/csv-import.md)** - Bulk data import functionality
- **[User Management](./docs/features/README.md)** - Multi-tier role system
- **[Story Approval Workflow](./docs/developer-onboarding.md#story-approval-workflow)** - Content approval process

### 📖 Complete Documentation
See **[docs/README.md](./docs/README.md)** for full documentation structure and navigation.

## ✨ Key Features

### 🔐 Multi-Tier Authentication
- **Amitrace Admins**: Full system access, approve teachers, manage schools
- **Teachers**: Create classes, manage students, create/approve stories
- **Students**: Join classes, create stories, manage favorites

### 📊 Story Management System
- **Approval Workflow**: Admin approval required for public visibility
- **Rich Metadata**: Tags, interviewees, date ranges, detailed questions
- **Bulk Operations**: Multi-select, CSV import/export, batch favorites
- **Advanced Search**: Filter by tags, dates, users, approval status

### 🏫 Class Management
- **4-Digit Class Codes**: Unique, shareable class identifiers
- **Student Enrollment**: Easy class joining with codes
- **Teacher Dashboard**: Class roster and student management

### 💝 User Engagement
- **Favorites System**: Real-time favorite counts and popular content
- **User Analytics**: Track engagement and story popularity
- **Email Notifications**: System updates and approvals

### 📱 Modern Interface
- **Unified Navigation**: Role-based menu system across all pages
- **Responsive Design**: Mobile-first approach with touch-friendly interface
- **Grid/List Views**: Flexible content display with clickable cards
- **Professional UI**: Clean, accessible design with loading states

## 🏗️ Architecture Overview

VidPOD follows a three-tier architecture with comprehensive role-based access control:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│                 │    │                 │    │                 │
│ HTML/CSS/JS     │───▶│ Express.js API  │───▶│ PostgreSQL      │
│ Unified Nav     │    │ JWT Auth        │    │ Complex Schema  │
│ Role-based UI   │    │ 17 Route Files  │    │ Multi-tier      │
│ Mobile Design   │    │ Middleware      │    │ Relationships   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**For detailed architectural diagrams and system components, see: [System Architecture Overview](./docs/architecture/system-overview.md)**

## 🛠️ Tech Stack

### Backend
- **Node.js + Express.js** - RESTful API server
- **PostgreSQL** - Relational database with complex schema
- **JWT Authentication** - Secure token-based auth
- **Bcrypt** - Password hashing
- **Nodemailer** - Email notifications
- **Multer** - File upload handling

### Frontend  
- **Vanilla HTML5/CSS3/JavaScript** - Modern web standards
- **Unified Navigation System** - Role-based component architecture
- **Fetch API** - Modern HTTP client
- **CSS Custom Properties** - Dynamic theming
- **Mobile-First Design** - Responsive layouts

### Infrastructure
- **Railway.app** - Cloud hosting and deployment
- **Nixpacks** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **PostgreSQL Add-on** - Managed database

## 📁 Project Structure

```
podcast-stories/
├── backend/
│   ├── server.js                     # Main Express server
│   ├── db/
│   │   ├── updated-schema.sql        # Complete database schema
│   │   └── migrations/               # Database migrations
│   ├── routes/                       # API endpoints (17 files)
│   │   ├── auth.js                  # Authentication endpoints
│   │   ├── stories.js               # Story management
│   │   ├── userManagement.js        # User management
│   │   ├── classes.js               # Class management
│   │   ├── favorites.js             # Favorites system
│   │   └── ...                      # Additional routes
│   ├── middleware/
│   │   └── auth.js                  # JWT authentication
│   ├── services/
│   │   └── email.js                 # Email notifications
│   └── frontend/                    # Served static files (production)
├── docs/                            # Comprehensive documentation
│   ├── architecture/                # System architecture
│   ├── features/                    # Feature documentation
│   ├── testing/                     # Testing guides
│   └── deployment/                  # Deployment guides
├── testing/                         # Test suites
│   ├── api/                        # API tests
│   ├── e2e/                        # End-to-end tests
│   └── README.md                   # Testing overview
└── frontend/                       # Development frontend (not served)
    ├── *.html                      # Page templates
    ├── css/styles.css              # Application styling
    ├── js/                         # JavaScript modules
    └── includes/                   # Reusable components
```

## 📋 Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v13+)
- Git

### Environment Setup

```bash
# 1. Clone and install
git clone https://github.com/your-org/podcast-stories.git
cd podcast-stories
npm install

# 2. Database setup (run in order)
createdb vidpod_dev
psql vidpod_dev < backend/db/schema.sql
psql vidpod_dev < backend/db/updated-schema.sql

# Apply migrations in chronological order (check backend/migrations/)
psql vidpod_dev < backend/migrations/007_create_user_favorites.sql
psql vidpod_dev < backend/migrations/008_create_analytics_tables.sql
psql vidpod_dev < backend/migrations/009_phase1_user_email_migration.sql
psql vidpod_dev < backend/migrations/010_phase2_story_approval.sql
psql vidpod_dev < backend/migrations/010_user_management_system.sql
psql vidpod_dev < backend/migrations/011_add_first_last_name_fields.sql

# 3. Environment configuration
cp .env.example .env
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/vidpod_dev
JWT_SECRET=your-super-secret-jwt-key

# Server
NODE_ENV=development
PORT=3000

# Email (optional for development)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=app-specific-password

# Default admin (created on first run)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=vidpod
ADMIN_EMAIL=admin@vidpod.com
```

### Running the Application

```bash
# Development server (from backend/ directory)
cd backend && npm run dev

# Production server (from backend/ directory)  
cd backend && npm start

# Run tests (from root directory)
npm test
```

**Access:** http://localhost:3000

## 🎯 Core Concepts

### Multi-Tier Role System
- **Amitrace Admin**: Complete system control, approves teachers and schools
- **Teacher**: Class management, story approval, student oversight  
- **Student**: Story creation, class participation, content consumption

### Content Approval Workflow
1. Stories created by users start with status **draft**
2. Users can submit stories for review (PATCH `/api/stories/:id/submit` → status becomes **pending**)
3. Only **admins** can approve/reject stories:
   - PATCH `/api/stories/:id/approve` → status becomes **approved**
   - PATCH `/api/stories/:id/reject` → status becomes **rejected**
4. **Teachers** require admin approval before gaining full access
5. **Role-based content filtering** ensures appropriate access

### Unified Navigation Architecture
- Single navigation template (`includes/navigation.html`)
- **Role-based menu visibility** controlled by JavaScript
- **Mobile-responsive** with collapsible hamburger menu
- **Auto-loading** across all authenticated pages

## 📊 Database Schema

The database implements a comprehensive **multi-tier relational model** with role-based access control:

**Core Tables:**
- `users` - Multi-role user system with school relationships
- `story_ideas` - Rich content with approval workflow
- `classes` - Teacher-managed student groups with unique codes
- `schools` - Institutional organization
- `tags` & `interviewees` - Content metadata and relationships

**Junction Tables:**
- `user_favorites` - User story favorites system
- `user_classes` - Student class enrollments  
- `story_tags` - Many-to-many story categorization
- `story_interviewees` - Interview subject tracking

**For detailed schema relationships and design principles, see: [Database Schema Documentation](./docs/architecture/system-overview.md#database-schema-relationships)**

## 🔗 API Documentation

The API consists of **17 modular route files** organized by domain:

### Core Endpoints
- **Authentication:** `/api/auth/*` - Login, registration, token management
- **Stories:** `/api/stories/*` - CRUD, approval, CSV import/export
- **Users:** `/api/users/*` - Profile management, role administration
- **Classes:** `/api/classes/*` - Class creation, student enrollment
- **Favorites:** `/api/favorites/*` - User favorites and analytics

### Admin Endpoints  
- **Schools:** `/api/schools/*` - Institution management
- **Teacher Requests:** `/api/teacher-requests/*` - Approval workflow
- **Analytics:** `/api/admin/*` - System insights and reporting

**For complete API documentation with request/response examples, see: [API Structure Documentation](./docs/architecture/system-overview.md#api-routes-structure)**

## 🚀 Deployment

### Production Environment (Railway.app)

**Live Application:** https://podcast-stories-production.up.railway.app/

```bash
# Deploy to production
git push origin main  # Auto-deploys via Railway

# Environment variables (set in Railway dashboard)
DATABASE_URL=postgresql://...  # Railway PostgreSQL addon
JWT_SECRET=secure-production-secret
NODE_ENV=production
EMAIL_USER=notifications@vidpod.com
EMAIL_PASS=app-specific-password
```

### Development Deployment

```bash
# Local development with hot reload
npm run dev

# Test production build locally
NODE_ENV=production npm start
```

**For comprehensive deployment instructions, see: [Railway Deployment Guide](./docs/deployment/railway-deployment-guide.md)**

## 🧪 Testing

VidPOD includes comprehensive test suites for reliability and maintainability:

### Test Categories
- **Unit Tests:** Individual function and component testing
- **API Tests:** Endpoint functionality and authentication
- **Integration Tests:** End-to-end user workflow validation
- **E2E Tests:** Complete user journey automation with Puppeteer

### Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:api
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

**For complete testing procedures and best practices, see: [Master Testing Guide](./docs/testing/master-testing-guide.md)**

## 👥 Development Workflow

### For New Developers
1. **Read:** [Developer Onboarding Guide](./docs/developer-onboarding.md)
2. **Study:** [System Architecture Overview](./docs/architecture/system-overview.md)  
3. **Set up:** Local development environment
4. **Explore:** Test with different user roles
5. **Contribute:** Follow established coding patterns

### Feature Development
1. Create feature branch from `main`
2. Implement backend API changes
3. Update frontend components  
4. Add comprehensive tests
5. Update documentation
6. Submit pull request

### Code Standards
- **Backend:** ES6+ JavaScript, async/await, parameterized SQL
- **Frontend:** Vanilla JavaScript, responsive design, accessibility
- **Database:** Normalized schema, foreign key constraints
- **Authentication:** JWT tokens, role-based access control

## 🆘 Support and Resources

### Documentation Links
- **[Complete Documentation Hub](./docs/README.md)** - All guides and references
- **[System Architecture](./docs/architecture/system-overview.md)** - Technical deep dive  
- **[Developer Onboarding](./docs/developer-onboarding.md)** - Comprehensive setup guide
- **[Feature Documentation](./docs/features/README.md)** - Individual feature guides

### Getting Help
- Check existing documentation first
- Review code comments and examples
- Use test accounts to understand functionality
- Create GitHub issues for bugs or feature requests

### Contributing
1. Fork the repository
2. Follow development workflow above
3. Ensure all tests pass
4. Update documentation for significant changes
5. Submit pull request with clear description

---

**VidPOD Status:** 🟢 **Production Ready**  
**Version:** 2.3.0  
**Last Updated:** August 2025  
**System Health:** All major functionality verified and operational
