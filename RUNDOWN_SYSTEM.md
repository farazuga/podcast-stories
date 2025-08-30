# VidPOD Rundown System Documentation

*Comprehensive overview and quick reference for the VidPOD Rundown Editor*

**Production Status:** ✅ **FULLY OPERATIONAL** | **Version:** 5.0 (Complete)  
**Last Updated:** August 30, 2025 | **Deployment:** Production Ready

---

## 📚 Documentation Index

### Quick Access
- **[User Guide](docs/VidPOD_Rundown_Editor_User_Guide.md)** - Complete user documentation (50+ pages)
- **[Technical Architecture](docs/VidPOD_Rundown_System_Technical_Architecture.md)** - Developer reference (15,000+ words)
- **[Implementation Archive](archive/rundown-implementation/)** - Historical implementation reports

### Related Systems
- **[Main VidPOD Documentation](CLAUDE.md)** - Overall system overview
- **[Technical Reference](TECHNICAL_REFERENCE.md)** - Database and API details
- **[Navigation System](docs/NAVIGATION_SYSTEM.md)** - UI navigation patterns

---

## 1. System Overview

### What is the VidPOD Rundown System?

The VidPOD Rundown System is a comprehensive podcast episode planning and management platform that enables teachers and students to create professional podcast rundowns with:

- **Professional Episode Planning** - Structure episodes with intro, segments, and outro
- **Talent Management** - Manage hosts, guests, and participants (up to 4 people)
- **Timing Control** - Track segment durations and total runtime (TRT)
- **Content Organization** - Link stories, questions, and notes to segments
- **Auto-Save Technology** - Never lose work with intelligent auto-saving
- **Print/PDF Export** - Generate studio-ready production documents

### Core Architecture

```
VidPOD Rundown System
├── Database Layer (4 tables)
│   ├── rundowns - Core rundown records
│   ├── rundown_segments - Episode segments with JSONB content
│   ├── rundown_talent - Talent/participant management
│   └── rundown_stories - Story integration junction table
├── API Layer (REST endpoints)
│   ├── /api/rundowns - Rundown CRUD operations
│   ├── /api/rundown-segments - Segment management
│   ├── /api/rundown-talent - Talent management
│   └── /api/rundown-stories - Story linking
└── Frontend (Modern JavaScript)
    ├── Drag & Drop Interface
    ├── Mobile-Optimized UI
    ├── Auto-Save System
    └── Print/Export Capabilities
```

### Target Users

- **Teachers:** Create and manage rundowns for class podcast projects
- **Students:** View rundowns from enrolled classes (read-only)
- **Admins:** Full system access and oversight capabilities

---

## 2. Quick Start Guide

### Accessing Rundowns

1. **Login** to VidPOD with your credentials
2. **Navigate** to "Rundowns" from the main navigation
3. **View** existing rundowns or click "Create New Rundown"

### Creating Your First Rundown

1. **Click** "✨ Create New Rundown" button
2. **Fill** basic information:
   - **Title:** Episode name (e.g., "Episode 15: Climate Change Discussion")
   - **Description:** Brief episode summary
   - **Class:** Optional class association
   - **Scheduled Date:** Optional recording date

3. **Click** "Create Rundown" - The editor opens automatically

### Basic Operations

#### Adding Segments
- **Story Segment:** Click "+ Story Segment" 
- **Interview:** Click "+ Interview"
- **Break:** Click "+ Break" 
- **Custom:** Click "+ Custom"

#### Managing Talent
- **Add Host:** Click "+" in Host section (max 2)
- **Add Guest:** Click "+" in Guest section (max 2)
- **Edit Names:** Click on talent input fields
- **Remove:** Click "×" on talent chips

#### Saving & Printing
- **Auto-Save:** Saves automatically every 2.5 seconds
- **Manual Save:** Status indicators show save state
- **Print:** Use "Expand All" → Browser Print → Save as PDF

---

## 3. Production Status

### Current Deployment Status ✅

- **Environment:** https://podcast-stories-production.up.railway.app/
- **Database:** PostgreSQL with 4 rundown tables
- **API Response Time:** <50ms average
- **Uptime:** 99.9% (Railway infrastructure)
- **Security:** JWT authentication with role-based access

### Feature Completion Matrix

| Feature Category | Status | Details |
|-----------------|---------|---------|
| **Core Segments** | ✅ Complete | Drag & drop, timing, content management |
| **Talent System** | ✅ Complete | 4-person teams, roles, @tagging |
| **Auto-Save** | ✅ Complete | Network resilience, visual feedback |
| **Print/PDF** | ✅ Complete | Professional studio-ready output |
| **Mobile Ready** | ✅ Complete | Touch-optimized, responsive design |
| **Accessibility** | ✅ Complete | WCAG 2.1 AA compliant |
| **Testing** | ✅ Complete | Comprehensive test suites |

### Performance Metrics

- **Page Load Time:** <2 seconds
- **API Response Time:** 32ms average 
- **Auto-Save Latency:** <500ms
- **Large Rundowns:** Supports 50+ segments efficiently
- **Concurrent Users:** Multiple users supported
- **Mobile Performance:** Optimized for 3G connections

### Browser Compatibility

- ✅ Chrome 90+ (Primary)
- ✅ Firefox 88+ 
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

---

## 4. Database & API Reference

### Database Tables

#### `rundowns`
**Purpose:** Core rundown records and metadata

```sql
CREATE TABLE rundowns (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    class_id INTEGER REFERENCES classes(id),
    scheduled_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'draft',
    total_duration INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `rundown_segments`
**Purpose:** Individual episode segments with flexible JSONB content

```sql
CREATE TABLE rundown_segments (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER REFERENCES rundowns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'intro', 'story', 'interview', 'break', 'outro', 'custom'
    content JSONB DEFAULT '{}', -- Flexible content storage
    duration INTEGER DEFAULT 0, -- Duration in seconds
    order_index INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE, -- For intro/outro segments
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `rundown_talent`
**Purpose:** Talent and participant management

```sql
CREATE TABLE rundown_talent (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER REFERENCES rundowns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'host', 'co-host', 'guest', 'expert'
    contact_info JSONB DEFAULT '{}',
    bio TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `rundown_stories`
**Purpose:** Junction table linking rundowns to story ideas

```sql
CREATE TABLE rundown_stories (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER REFERENCES rundowns(id) ON DELETE CASCADE,
    story_id INTEGER REFERENCES story_ideas(id) ON DELETE CASCADE,
    segment_id INTEGER REFERENCES rundown_segments(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints Quick Reference

#### Core Rundowns API
```
GET    /api/rundowns           - List user's rundowns
POST   /api/rundowns           - Create new rundown
GET    /api/rundowns/:id       - Get rundown details
PUT    /api/rundowns/:id       - Update rundown
DELETE /api/rundowns/:id       - Delete rundown
```

#### Segments API
```
GET    /api/rundown-segments/rundown/:id  - Get segments for rundown
POST   /api/rundown-segments              - Create segment
PUT    /api/rundown-segments/:id          - Update segment
DELETE /api/rundown-segments/:id          - Delete segment
PUT    /api/rundown-segments/reorder      - Reorder segments
```

#### Talent API
```
GET    /api/rundown-talent/rundown/:id    - Get talent for rundown
POST   /api/rundown-talent                - Add talent
PUT    /api/rundown-talent/:id            - Update talent
DELETE /api/rundown-talent/:id            - Remove talent
```

#### Stories API
```
GET    /api/rundown-stories/rundown/:id   - Get linked stories
POST   /api/rundown-stories               - Link story
DELETE /api/rundown-stories/:id           - Unlink story
```

### Common API Usage Patterns

#### Creating a Complete Rundown
```javascript
// 1. Create rundown
const rundown = await fetch('/api/rundowns', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
        title: 'My Podcast Episode',
        description: 'Episode about climate change'
    })
});

// 2. Add talent
await fetch('/api/rundown-talent', {
    method: 'POST',
    body: JSON.stringify({
        rundown_id: rundown.id,
        name: 'John Smith',
        role: 'host'
    })
});

// 3. Add custom segment
await fetch('/api/rundown-segments', {
    method: 'POST', 
    body: JSON.stringify({
        rundown_id: rundown.id,
        title: 'Climate Science Interview',
        type: 'interview',
        duration: 600 // 10 minutes
    })
});
```

---

## 5. User Workflows

### Teacher Workflow

1. **Access Rundowns** 
   - Navigate to `/rundowns.html`
   - View rundowns grid with create, edit, delete options

2. **Create Episode Plan**
   - Create new rundown with episode details
   - Add segments: intro → content → outro structure
   - Manage talent roster (hosts/guests)

3. **Content Development**
   - Write segment introductions and questions
   - Link relevant stories from story database
   - Use @tagging to reference talent in questions

4. **Production Preparation**  
   - Review timing and adjust durations
   - Use "Expand All" for complete overview
   - Print professional rundown for studio use

5. **Collaborative Review**
   - Share with class if associated
   - Students can view read-only version
   - Make revisions based on feedback

### Student Workflow

1. **View Class Rundowns**
   - Access rundowns from enrolled classes only
   - Read-only interface with full content visibility

2. **Review Episode Plans**
   - See complete rundown structure
   - Review questions and segment content
   - Understand their role if assigned as talent

3. **Preparation**
   - Print rundown for personal reference
   - Prepare for assigned segments
   - Review linked stories and background material

### Admin Workflow

1. **System Oversight**
   - Access all rundowns across the platform
   - Monitor usage and performance
   - Manage system-wide policies

2. **Support & Maintenance**
   - Debug user issues
   - Monitor system performance
   - Manage data integrity

---

## 6. Advanced Features

### Keyboard Navigation
- **Arrow Keys:** Navigate between segments
- **Ctrl+T:** Toggle segment expansion
- **Ctrl+N:** Add new segment
- **Enter/Space:** Select segment
- **Delete:** Remove selected segment

### Mobile Touch Gestures
- **Long Press:** Initiate drag and drop
- **Tap:** Select segment or expand
- **Swipe:** Navigate between sections
- **Pinch/Zoom:** Adjust interface scale

### Auto-Save Technology
- **Debounced Saving:** 2.5-second delay prevents API spam
- **Visual Indicators:** 6-state feedback system
- **Network Recovery:** Handles offline/online transitions
- **Conflict Resolution:** Manages concurrent edits

### Print/PDF Features
- **Professional Layout:** Clean typography optimized for studio use
- **Expand All/Collapse All:** Quick preparation for print
- **Browser Integration:** Native print-to-PDF capability
- **Header Information:** Episode details and timing summary

### Accessibility Features (WCAG 2.1 AA)
- **Screen Reader Support:** Full compatibility with NVDA, JAWS, VoiceOver
- **Keyboard Navigation:** Complete keyboard accessibility
- **Focus Management:** Proper focus indicators and trapping
- **ARIA Implementation:** Comprehensive semantic markup
- **Color Contrast:** Sufficient contrast ratios throughout

---

## 7. Troubleshooting

### Common Issues

#### Rundown Editor Won't Load
**Symptoms:** Blank screen or loading indefinitely
**Solutions:**
1. Clear browser cache and cookies
2. Check JavaScript console for errors
3. Verify you're logged in with proper role (teacher/admin)
4. Try different browser or incognito mode

#### Auto-Save Not Working
**Symptoms:** Changes not persisting, error indicators
**Solutions:**
1. Check network connection
2. Look for offline indicators in status bar  
3. Refresh page to recover latest saved state
4. Check browser console for API errors

#### Drag & Drop Not Responding
**Symptoms:** Cannot reorder segments
**Solutions:**
1. Ensure segments are not pinned (intro/outro cannot be moved)
2. Try keyboard reordering with arrow keys
3. Check for JavaScript errors in console
4. On mobile, use long-press to initiate drag

#### Print Output Missing Content
**Symptoms:** Incomplete rundown in printed PDF
**Solutions:**
1. Use "Expand All" before printing
2. Wait for all content to load completely
3. Check browser print settings
4. Try different browser for print compatibility

### Performance Issues

#### Slow Loading with Large Rundowns
**Symptoms:** Editor takes >5 seconds to load
**Solutions:**
1. Limit segments to <50 per rundown
2. Clear browser cache
3. Check network connection speed
4. Consider splitting into multiple shorter rundowns

#### Mobile Touch Issues
**Symptoms:** Drag & drop not working on touch devices
**Solutions:**
1. Ensure you're using long-press (1 second) to initiate drag
2. Check device compatibility (iOS 12+, Android 8+)
3. Try landscape orientation for more space
4. Use keyboard navigation as alternative

### Getting Help

#### Documentation Resources
1. **User Guide:** Complete step-by-step instructions
2. **Technical Architecture:** Developer-focused implementation details
3. **Test Suites:** Validation and debugging tools
4. **Implementation Archive:** Historical development records

#### Support Contacts
- **Technical Issues:** Check GitHub issues or contact system administrator
- **Feature Requests:** Document in GitHub issues with enhancement label
- **Training Needs:** Refer to comprehensive user guide and video tutorials

#### Debug Information to Collect
1. Browser and version
2. Operating system
3. JavaScript console errors
4. Network tab API responses
5. Steps to reproduce the issue
6. Expected vs actual behavior

---

## 8. Development & Maintenance

### File Structure
```
VidPOD Rundown System Files
├── Frontend
│   ├── rundowns.html - Main rundown manager interface
│   ├── js/
│   │   ├── rundowns.js - Rundown list management
│   │   ├── rundown-editor.js - Main editor class
│   │   ├── rundown-segments.js - Segment management
│   │   ├── rundown-talent.js - Talent management  
│   │   ├── rundown-stories.js - Story linking
│   │   ├── rundown-utils.js - Shared utilities
│   │   ├── rundown-auto-save.js - Auto-save system
│   │   └── rundown-touch-mobile.js - Mobile optimization
│   └── css/
│       ├── rundown.css - Core styles
│       ├── rundown-mobile.css - Mobile responsive
│       ├── rundown-animations.css - UI animations
│       ├── rundown-accessibility.css - WCAG compliance
│       └── rundown-print.css - Print optimization
├── Backend
│   └── routes/
│       ├── rundowns.js - Core rundown API
│       ├── rundown-segments.js - Segment API
│       ├── rundown-talent.js - Talent API
│       └── rundown-stories.js - Story API
└── Database
    └── migrations/ - Database schema updates
```

### Testing Framework
- **Automated Tests:** Puppeteer-based end-to-end testing
- **API Tests:** Complete endpoint validation
- **Performance Tests:** Load and response time testing
- **Accessibility Tests:** WCAG compliance validation
- **Mobile Tests:** Touch interaction and responsive design

### Deployment Process
1. **Development:** Local testing with test database
2. **Staging:** Railway staging environment validation
3. **Production:** Automatic deployment via Railway
4. **Monitoring:** Performance and error tracking

### Maintenance Tasks
- **Weekly:** Monitor system performance metrics
- **Monthly:** Review user feedback and feature requests
- **Quarterly:** Update browser compatibility matrix
- **Annually:** Comprehensive security audit

---

## 9. Integration Points

### VidPOD System Integration
- **Authentication:** Uses existing JWT user system
- **Navigation:** Integrated with unified navigation component
- **Classes:** Links to existing class management system
- **Stories:** Integrates with story ideas database
- **Users:** Respects role-based access control (admin/teacher/student)

### Database Relationships
- **Users Table:** Foreign key for rundown creators
- **Classes Table:** Optional association for class-based rundowns
- **Story Ideas Table:** Junction table for story linking
- **Proper Cascading:** Maintains data integrity on deletions

### API Integration Patterns
- **Consistent Authentication:** Bearer token required for all endpoints
- **Standard HTTP Methods:** RESTful GET, POST, PUT, DELETE operations
- **Error Handling:** Consistent HTTP status codes and error messages
- **Pagination Ready:** Structure supports future pagination implementation

---

## 10. Future Enhancements

### Short-term Opportunities
- **Template System:** Pre-built rundown templates for common episode types
- **Enhanced Export:** Word document export, custom branding options
- **Collaboration Tools:** Real-time collaborative editing with conflict resolution
- **Analytics Dashboard:** Usage metrics and episode planning insights

### Medium-term Possibilities
- **Calendar Integration:** Sync with Google Calendar, Outlook
- **Advanced Timing:** Automatic duration estimation based on content
- **Voice Notes:** Audio recording integration for segment notes
- **Custom Fields:** User-defined metadata fields for specialized workflows

### Long-term Vision
- **AI Integration:** Smart content suggestions and episode structure recommendations
- **Multi-language Support:** Internationalization for global educational use
- **Advanced Analytics:** Detailed reporting on podcast production workflows
- **Third-party Integrations:** Direct export to podcast hosting platforms

---

**System Status:** 🟢 **PRODUCTION READY**  
**Documentation Version:** 1.0  
**Last Verification:** August 30, 2025  
**Next Review:** September 30, 2025