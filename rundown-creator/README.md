# VidPOD Rundown Creator

## 📻 Independent Rundown Management System

A standalone application for managing podcast show rundowns with comprehensive approval workflows, drag-and-drop segment management, and story integration. Built to work independently alongside the main VidPOD system.

---

## 🎯 Project Overview

### Purpose
The VidPOD Rundown Creator is an independent microservice that enables users to:
- Create and manage podcast show rundowns
- Add and reorder segments with drag-and-drop functionality
- Integrate stories from the main VidPOD database
- Collaborate through approval workflows
- Export rundowns in CSV and PDF formats

### Key Features
- **Independent Architecture:** Runs as separate Express server on port 3001
- **Auth Proxy Integration:** Seamlessly integrates with main VidPOD authentication
- **Database Isolation:** Uses prefixed tables (`rundown_app_*`) to avoid conflicts
- **Real-time Updates:** Live segment duration calculations and reordering
- **Export Capabilities:** PDF and CSV export for approved rundowns
- **Responsive Design:** Works on desktop, tablet, and mobile devices

---

## 🏗️ Architecture

### System Overview
```
┌─────────────────────┐    ┌─────────────────────┐
│   Main VidPOD API   │    │ Rundown Creator App │
│   (Port 3000)       │◄──►│   (Port 3001)       │
│                     │    │                     │
│ - Authentication    │    │ - Rundown CRUD      │
│ - User Management   │    │ - Segment Management│
│ - Story Database    │    │ - Export Features   │
└─────────────────────┘    └─────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────────────────────────────────┐
│           Shared PostgreSQL Database             │
│                                                 │
│ Main Tables:        │  Independent Tables:      │
│ - users            │  - rundown_app_rundowns   │
│ - stories          │  - rundown_app_segments   │
│ - classes          │  - rundown_app_stories    │
└─────────────────────────────────────────────────┘
```

### Independent Development Benefits
1. **Concurrent Development:** Multiple developers can work without conflicts
2. **Technology Freedom:** Different tech stacks for different components
3. **Deployment Isolation:** Deploy and scale independently
4. **Risk Mitigation:** Changes don't affect main VidPOD system
5. **Testing Independence:** Isolated testing environments

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL database access
- Access to main VidPOD API (for authentication)

### Installation

1. **Clone and Setup:**
```bash
cd rundown-creator
npm install
```

2. **Environment Configuration:**
```bash
cp .env.example .env
# Edit .env with your database and API details
```

3. **Database Setup:**
```bash
# Run the schema setup
psql $DATABASE_URL < backend/db/schema.sql
```

4. **Start Development Server:**
```bash
npm run dev  # Starts with nodemon for auto-reload
```

5. **Access Application:**
- Open: http://localhost:3001
- Login with main VidPOD credentials
- Create your first rundown!

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Server Configuration
PORT=3001
NODE_ENV=development

# Integration Configuration
VIDPOD_API_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001

# Security
JWT_SECRET=your-jwt-secret-here

# Optional: Debug Mode
DEBUG_MODE=true
```

### Database Configuration

The application uses independent tables with `rundown_app_` prefix:

```sql
-- Core rundown table
rundown_app_rundowns
- id, title, description, status, created_by, class_id
- total_duration, created_at, updated_at

-- Segment management
rundown_app_segments  
- id, rundown_id, segment_type, title, duration
- sort_order, guest_name, is_remote, notes

-- Story integration
rundown_app_stories
- id, rundown_id, story_id, segment_id
- notes, questions, added_at
```

---

## 🛠️ Development Guide

### Project Structure

```
rundown-creator/
├── backend/                    # Express API server
│   ├── server.js              # Main server setup
│   ├── db/
│   │   └── schema.sql         # Database schema
│   ├── routes/
│   │   ├── rundowns.js        # Rundown CRUD
│   │   ├── segments.js        # Segment management  
│   │   └── integration.js     # Story integration & export
│   ├── middleware/
│   │   └── auth-proxy.js      # Authentication proxy
│   └── tests/
│       └── rundown.test.js    # API tests
│
├── frontend/                   # Vanilla JS frontend
│   ├── index.html             # Main application
│   ├── css/
│   │   └── rundown-styles.css # Complete styling
│   └── js/
│       ├── config.js          # Configuration
│       ├── rundowns.js        # Rundown management
│       ├── segments.js        # Segment drag-drop
│       ├── stories.js         # Story integration
│       └── app.js             # Main application
│
└── tests/                      # E2E tests
    └── e2e.test.js            # Playwright tests
```

### Key Development Concepts

#### Authentication Proxy Pattern
```javascript
// backend/middleware/auth-proxy.js
const verifyToken = async (req, res, next) => {
  const response = await axios.get(`${VIDPOD_API_URL}/auth/verify`, {
    headers: { 'Authorization': authHeader }
  });
  if (response.status === 200) {
    req.user = response.data.user;
    next();
  }
};
```

#### Database Isolation Strategy
- All tables prefixed with `rundown_app_`
- Foreign keys reference main VidPOD tables without constraints
- Independent data lifecycle management
- Easy cleanup and migration

#### Frontend Architecture
- **Modular Design:** Separate managers for rundowns, segments, stories
- **Event-Driven:** Clean separation between UI and business logic
- **Responsive:** Mobile-first CSS with modern design patterns
- **Accessible:** ARIA labels and keyboard navigation support

---

## 🧪 Testing

### Backend API Tests (Jest + Supertest)

```bash
# Run all backend tests
npm test

# Watch mode for development
npm run test:watch

# Specific test file
npm test rundown.test.js
```

**Test Coverage:**
- Authentication proxy validation
- CRUD operations for rundowns and segments
- Approval workflow testing
- Story integration APIs
- Export functionality
- Error handling and validation

### Frontend E2E Tests (Playwright)

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI mode
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

**E2E Test Coverage:**
- Complete user workflows
- Authentication and authorization
- Drag-and-drop functionality  
- Modal interactions
- Responsive design testing
- Cross-browser compatibility

### Test Configuration

**Jest Configuration:**
```json
{
  "testEnvironment": "node",
  "setupFilesAfterEnv": ["<rootDir>/backend/tests/setup.js"],
  "testMatch": ["**/backend/tests/**/*.test.js"]
}
```

**Playwright Configuration:**
- Multi-browser testing (Chrome, Firefox, Safari)
- Mobile device testing
- Screenshot and video capture on failure
- Automatic retry on CI failures

---

## 📋 API Documentation

### Core Endpoints

#### Rundowns Management
```
GET    /api/rundowns           # List rundowns with filters
POST   /api/rundowns           # Create new rundown  
GET    /api/rundowns/:id       # Get rundown details
PUT    /api/rundowns/:id       # Update rundown
DELETE /api/rundowns/:id       # Archive rundown

POST   /api/rundowns/:id/submit   # Submit for review
POST   /api/rundowns/:id/approve  # Approve rundown
POST   /api/rundowns/:id/reject   # Reject rundown
```

#### Segment Management
```
GET    /api/segments/:rundownId     # Get segments for rundown
POST   /api/segments/:rundownId     # Add segment to rundown
PUT    /api/segments/:id            # Update segment
DELETE /api/segments/:id            # Delete segment

PUT    /api/segments/:rundownId/reorder  # Reorder segments
POST   /api/segments/:rundownId/duplicate/:segmentId  # Duplicate segment
```

#### Story Integration
```
GET    /api/integration/stories                    # Browse available stories
POST   /api/integration/rundowns/:id/stories       # Add story to rundown  
DELETE /api/integration/rundowns/:id/stories/:storyId  # Remove story

GET    /api/integration/rundowns/:id/export/csv    # Export as CSV
GET    /api/integration/rundowns/:id/export/pdf    # Export as PDF
```

### Request/Response Examples

**Create Rundown:**
```bash
curl -X POST http://localhost:3001/api/rundowns \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekly News Show",
    "description": "Our weekly news roundup",
    "class_id": 1
  }'
```

**Add Segment:**
```bash
curl -X POST http://localhost:3001/api/segments/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "segment_type": "intro",
    "title": "Welcome to the Show",
    "duration": 120,
    "notes": "Opening remarks"
  }'
```

---

## 🎨 User Interface

### Design System

**VidPOD Brand Colors:**
```css
:root {
  --primary-color: #f79b5b;      /* VidPOD Orange */
  --secondary-color: #04362a;     /* Dark Green */
  --background: #f5f7fa;          /* Light Gray */
  --text: #333333;                /* Dark Gray */
}
```

**Component Architecture:**
- **Cards:** Rundown and segment display
- **Modals:** Segment and story management
- **Forms:** Comprehensive validation and feedback
- **Navigation:** Breadcrumb and tab-based

### Responsive Design

**Breakpoints:**
- Mobile: < 768px (single column layout)
- Tablet: 768px - 1024px (two column layout)  
- Desktop: > 1024px (three column layout)

**Touch-Friendly:**
- Large tap targets (44px minimum)
- Swipe gestures for mobile navigation
- Touch-optimized drag and drop

### Accessibility Features

- **Keyboard Navigation:** Full tab navigation support
- **Screen Reader:** ARIA labels and semantic HTML
- **Color Contrast:** WCAG 2.1 AA compliance
- **Focus Management:** Clear focus indicators

---

## 🚢 Deployment

### Development Deployment

```bash
# Start both services
npm run dev          # Rundown Creator (port 3001)
cd ../backend && npm run dev  # Main VidPOD API (port 3000)
```

### Production Deployment

**Option 1: Railway (Recommended)**
```bash
# Deploy to Railway
railway login
railway link your-project-id
railway up
```

**Option 2: Docker**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

**Option 3: Manual Server**
```bash
# Install dependencies
npm ci --only=production

# Set environment variables
export DATABASE_URL=...
export VIDPOD_API_URL=...

# Start application
npm start
```

### Environment Considerations

**Database:**
- Ensure both main VidPOD and Rundown Creator share the same database
- Run migration scripts in the correct order
- Set up database connection pooling for production

**CORS Configuration:**
- Configure CORS origins for your domains
- Set secure headers for production
- Enable HTTPS in production environments

---

## 🔍 Troubleshooting

### Common Issues

#### Authentication Failures
**Problem:** Users can't login or get "unauthorized" errors
**Solution:**
1. Verify main VidPOD API is running and accessible
2. Check VIDPOD_API_URL environment variable
3. Ensure JWT_SECRET matches between services
4. Test auth proxy endpoint manually

#### Database Connection Issues
**Problem:** "Database connection failed" errors
**Solution:**
1. Verify DATABASE_URL format and credentials
2. Check database server accessibility
3. Ensure rundown_app_* tables exist
4. Test connection with psql directly

#### Drag and Drop Not Working
**Problem:** Segments won't reorder via drag and drop
**Solution:**
1. Check browser console for JavaScript errors
2. Verify HTML5 draggable attributes are set
3. Test with different browsers
4. Ensure touch events work on mobile

#### Export Features Failing
**Problem:** CSV/PDF exports don't work or fail
**Solution:**
1. Check file system permissions for temp files
2. Verify PDF library dependencies installed
3. Test export APIs directly with curl
4. Check browser download settings

### Debug Mode

Enable debug mode for detailed logging:
```env
DEBUG_MODE=true
NODE_ENV=development
```

This provides:
- Detailed API request/response logging
- Database query logging  
- Frontend state debugging
- Performance monitoring

### Performance Optimization

**Backend:**
- Enable database connection pooling
- Add Redis for session caching (optional)
- Implement API rate limiting
- Optimize database queries with indexes

**Frontend:**
- Minimize bundle size with tree shaking
- Implement lazy loading for large lists
- Add service worker for offline capability
- Optimize images and assets

---

## 🤝 Contributing

### Development Workflow

1. **Fork and Clone:** Create your feature branch
2. **Environment Setup:** Follow quick start guide
3. **Code Changes:** Implement your feature
4. **Testing:** Run both unit and E2E tests
5. **Documentation:** Update relevant docs
6. **Pull Request:** Submit with detailed description

### Code Standards

**JavaScript:**
- ES6+ features preferred
- Async/await over callbacks
- Comprehensive error handling
- Clear variable naming

**CSS:**
- CSS custom properties for theming
- Mobile-first responsive design
- BEM naming convention
- Component-based organization

**Testing:**
- Unit tests for all API endpoints
- E2E tests for user workflows  
- 80%+ code coverage target
- Mock external dependencies

### Release Process

1. **Version Bump:** Update package.json version
2. **Changelog:** Document all changes
3. **Testing:** Full test suite must pass
4. **Documentation:** Update relevant docs
5. **Deployment:** Deploy to staging first
6. **Verification:** Manual testing on staging
7. **Production:** Deploy to production
8. **Monitoring:** Watch for issues post-deployment

---

## 📚 Additional Resources

### Related Documentation
- [Main VidPOD Documentation](../README.md)
- [API Integration Guide](./API_INTEGRATION.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### External References
- [Express.js Documentation](https://expressjs.com/)
- [Playwright Testing](https://playwright.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Railway Deployment](https://railway.app/docs)

### Support and Community
- **GitHub Issues:** Report bugs and feature requests
- **Discord/Slack:** Join the VidPOD community
- **Email:** Contact the development team
- **Documentation:** Comprehensive guides and examples

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

*Created by the VidPOD Team*  
*Last Updated: January 2025*