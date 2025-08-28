# VidPOD Rundown System

## Overview

The VidPOD Rundown System is a comprehensive rundown management feature that allows teachers and admins to create, manage, and share podcast show rundowns with their classes. It integrates seamlessly with the existing VidPOD ecosystem.

## Features

### Core Functionality
- **Rundown Creation**: Create new rundowns with show name, air date, and target duration
- **Segment Management**: Add, edit, reorder, and delete segments with drag-and-drop support
- **Talent Management**: Add hosts and guests (maximum 4 total) with role-based organization
- **Story Integration**: Import stories from the VidPOD story database into rundowns
- **Real-time Timing**: Automatic calculation of total duration with target comparison
- **PDF Export**: Generate branded PDF exports of complete rundowns
- **Class Sharing**: Share rundowns with classes for collaborative production

### User Roles & Permissions
- **Teachers & Admins**: Full access to create, edit, and manage rundowns
- **Students**: View shared rundowns from their classes
- **Role-based Navigation**: Rundown link only visible to teachers and admins

## Database Schema

### Core Tables

#### `rundowns`
- Primary rundown information
- Links to users (creator) and classes
- Tracks sharing status and timing targets

#### `rundown_segments`
- Individual segments within rundowns
- JSONB content field for flexible segment data
- Support for pinned segments (intro/outro)
- Drag-and-drop ordering with `sort_order`

#### `rundown_talent`
- Hosts and guests associated with rundowns
- Role-based categorization
- 4-person total limit enforcement

#### `rundown_stories`
- Stories integrated from the VidPOD story database
- Snapshots story data at integration time
- Optional notes and segment assignment

## API Endpoints

### Rundowns (`/api/rundowns`)
- `GET /` - List user's accessible rundowns
- `POST /` - Create new rundown
- `GET /:id` - Get rundown with full details
- `PUT /:id` - Update rundown information
- `DELETE /:id` - Archive rundown

### Segments (`/api/rundown-segments`)
- `GET /rundown/:rundownId` - Get segments for rundown
- `POST /rundown/:rundownId` - Add segment to rundown
- `PUT /:id` - Update segment
- `DELETE /:id` - Delete segment
- `PUT /rundown/:rundownId/reorder` - Reorder segments
- `POST /:id/duplicate` - Duplicate segment

### Talent (`/api/rundown-talent`)
- `GET /rundown/:rundownId` - Get talent for rundown
- `POST /rundown/:rundownId` - Add talent to rundown
- `PUT /:id` - Update talent information
- `DELETE /:id` - Remove talent

### Stories (`/api/rundown-stories`)
- `GET /available` - Browse stories available for integration
- `GET /rundown/:rundownId` - Get integrated stories
- `POST /rundown/:rundownId` - Add story to rundown
- `PUT /:id` - Update story integration
- `DELETE /:id` - Remove story from rundown
- `GET /rundown/:rundownId/export/pdf` - Export rundown as PDF

## Frontend Components

### Main Interface (`rundowns.html`)
- Rundown picker with air date sorting
- Real-time timing chip with visual status indicators
- Expandable/collapsible segment management
- Integrated story browser panel

### JavaScript Modules

#### `rundown-utils.js`
- Utility functions for time parsing, validation, and UI helpers
- Drag-and-drop setup and keyboard navigation
- API calling with authentication
- Notification system

#### `rundowns.js`
- Main rundown management class
- Auto-save functionality with debouncing
- Timing calculations and visual updates

#### `rundown-segments.js`
- Segment CRUD operations with drag-and-drop
- Keyboard shortcuts (Ctrl+T to toggle, Arrow keys for navigation)
- Question management with talent tag insertion
- Status cycling (Draft → Needs Review → Ready)

#### `rundown-talent.js`
- Host and guest management with 4-person limit
- Talent tag insertion system for questions
- Role-based organization and sorting

#### `rundown-stories.js`
- Story integration from VidPOD story database
- Search and filter capabilities
- Rundown selector modal for adding from stories page

### CSS Styling (`rundown.css`)
- Responsive design with mobile support
- VidPOD brand colors and consistency
- Drag-and-drop visual feedback
- Print-friendly styles for PDF generation

## Integration Points

### Navigation System
- Added to unified navigation for teachers and admins
- Role-based visibility controls
- Mobile-responsive menu integration

### Story Browser Integration
- "Add to Rundown" buttons on story cards
- Modal rundown selector
- Seamless story-to-rundown workflow

### Class System Integration
- Rundowns can be associated with classes
- Class-based sharing permissions
- Teacher-student collaboration features

## Installation & Setup

### 1. Database Migration
```bash
psql $DATABASE_URL < backend/migrations/014_create_rundown_system.sql
```

### 2. Install Dependencies
```bash
cd backend && npm install pdfkit
```

### 3. Update Navigation
Navigation is automatically updated via the unified navigation system.

### 4. Test Installation
```bash
node test-rundown-system.js
```

## Usage Guide

### Creating a Rundown
1. Navigate to "Rundowns" in the main navigation
2. Click "New Rundown" button
3. Fill in show name, air date, and optional class assignment
4. Set target duration (defaults to 20:00)
5. Add segments using "Add Segment" button
6. Drag segments to reorder (intro/outro are pinned)

### Managing Segments
- Click segment headers to expand/collapse content
- Use drag handles (⋮⋮) to reorder segments
- Status arrows (‹ ›) to cycle through Draft → Needs Review → Ready
- Edit button opens full segment editor with questions and notes

### Adding Talent
- Use "Add Host" and "Add Guest" buttons
- Maximum 4 total people (hosts + guests)
- Names are displayed as chips with remove buttons
- Talent can be tagged in segment questions using @ button

### Story Integration
- From Stories page: Click "📝 Rundown" button on any story
- From Rundowns page: Use story panel to search and add stories
- Stories are copied (not linked) for independence

### Timing Management
- Target duration shown in timing chip
- Real-time calculation of total segment time
- Visual indicators: Green (balanced), Red (over), Yellow (under)
- MM:SS format with validation

### Export & Sharing
- "Share with class" checkbox for class visibility
- PDF export generates branded rundown document
- Print-friendly styles for browser printing

## Technical Implementation

### Key Design Decisions

#### Database Architecture
- **JSONB for Segment Content**: Flexible storage for segment questions, notes, and content
- **Separate Tables**: Modular design for segments, talent, and story integration
- **Sort Order Management**: Reliable drag-and-drop with integer ordering
- **Snapshot Story Data**: Story integration copies data rather than linking

#### Frontend Architecture
- **Modular JavaScript**: Separate managers for different concerns
- **Event-Driven Design**: Clean separation between UI and business logic
- **Real-time Updates**: Debounced auto-save with immediate UI feedback
- **Responsive Design**: Mobile-first approach with touch support

#### API Design
- **RESTful Endpoints**: Consistent with VidPOD patterns
- **Role-based Access**: Integrated with existing authentication
- **Bulk Operations**: Efficient reordering and management
- **Error Handling**: Comprehensive validation and user feedback

### Performance Considerations
- **Debounced Auto-save**: Prevents excessive API calls during editing
- **Lazy Loading**: Stories loaded on-demand in integration panel
- **Optimistic Updates**: UI updates immediately with server sync
- **Efficient Reordering**: Batch operations for segment management

### Security Features
- **Role-based Access Control**: Integrated with VidPOD user roles
- **Input Validation**: Client and server-side validation
- **SQL Injection Prevention**: Parameterized queries throughout
- **XSS Protection**: HTML escaping for all user content

## Troubleshooting

### Common Issues

#### PDF Export Not Working
- Ensure `pdfkit` package is installed
- Check file system permissions
- Verify browser allows downloads

#### Drag and Drop Issues
- Ensure HTML5 drag API support in browser
- Check for JavaScript errors in console
- Verify touch events work on mobile devices

#### Story Integration Problems
- Confirm user has appropriate role (teacher/admin)
- Check rundown-stories.js is loaded on stories page
- Verify API connectivity and authentication

#### Timing Calculations Wrong
- Check MM:SS input validation
- Ensure all segment durations are valid integers
- Verify JavaScript time parsing functions

### Debug Tools
- Use `test-rundown-system.js` for system verification
- Check browser developer tools for JavaScript errors
- Monitor network tab for API call failures
- Use database queries to verify data integrity

## Future Enhancements

### Planned Features
- **Undo/Redo System**: Multi-level undo for segment operations
- **Collaborative Editing**: Real-time collaboration between users
- **Template System**: Reusable rundown templates
- **Advanced Export**: Multiple export formats and customization
- **Mobile App**: Native mobile application for rundown management
- **Analytics**: Usage analytics and rundown performance metrics

### Technical Improvements
- **WebSocket Integration**: Real-time updates for collaborative editing
- **Offline Support**: Service worker for offline rundown editing
- **Advanced Search**: Full-text search across rundowns and segments
- **Batch Operations**: Bulk import/export of rundowns
- **Integration APIs**: Webhooks for external system integration

---

## Support

For technical support or feature requests, please refer to the VidPOD main documentation or create an issue in the project repository.

*Last Updated: August 28, 2025*
*Version: 1.0.0*