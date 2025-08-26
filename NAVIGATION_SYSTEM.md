# VidPOD Navigation System Documentation

*Last Updated: January 2025*

## Overview

VidPOD uses a unified navigation component that provides consistent navigation across all pages with role-based visibility and responsive design.

## Navigation Structure

### Core Files

- **HTML Template**: `/backend/frontend/includes/navigation.html`
- **JavaScript Logic**: `/backend/frontend/js/navigation.js`
- **Styling**: `/backend/frontend/css/styles.css` (navigation styles integrated)
- **Navigation Loader**: `/backend/frontend/js/include-navigation.js`
- **Mobile Hotfix**: `/backend/frontend/js/navigation-hotfix.js`

### Navigation Items

| Item | Path | Visibility | Icon |
|------|------|------------|------|
| Dashboard | `/dashboard.html` | All users | 🏠 |
| Browse Stories | `/stories.html` | All users | 📚 |
| Add Story | `/add-story.html` | All users | ✏️ |
| My Classes | `/teacher-dashboard.html` | Teachers only | 🎓 |
| Admin Browse Stories | `/admin-browse-stories.html` | Admins only | 🏛️ |
| Admin Panel | `/admin.html` | Admins only | ⚙️ |

## Role-Based Visibility

The navigation uses `data-role` attributes to control visibility:

### Student View
- Dashboard
- Browse Stories
- Add Story

### Teacher View
- Dashboard
- Browse Stories
- Add Story
- My Classes
- Settings (Admin Panel renamed)

### Admin View (admin/amitrace_admin)
- Dashboard
- Browse Stories
- Add Story
- Admin Browse Stories
- Admin Panel

## Implementation

### Including Navigation

The navigation is automatically loaded on all pages via `include-navigation.js`:

```javascript
// Navigation loads automatically on DOMContentLoaded
// Or manually load with:
NavigationLoader.loadNavigation('body', 'current-page-name');
```

### Navigation Initialization

The `VidPODNav` object handles all navigation functionality:

```javascript
VidPODNav.init({
    currentPage: 'dashboard',
    user: userObject,
    onLogout: logoutFunction
});
```

### Data-Role Attributes

Role visibility is controlled via HTML attributes:

```html
<!-- Teacher only -->
<a href="/teacher-dashboard.html" data-role="teacher">My Classes</a>

<!-- Admin only -->
<a href="/admin.html" data-role="admin,amitrace_admin">Admin Panel</a>
```

## Features

### User Display
- Shows current user's name and role
- Role-specific styling and badges
- Logout functionality

### Mobile Responsive
- Hamburger menu for mobile devices
- Responsive breakpoint at 768px
- Touch-friendly mobile navigation

### Active Page Highlighting
- Automatically highlights current page
- Uses `data-page` attributes for identification

### Badge Counts
- Dynamic badge counts (e.g., class count for teachers)
- Loaded asynchronously via API

### Teacher Customizations
- "Admin Panel" renamed to "Settings" for teachers
- Provides teacher-specific navigation experience

## User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `student` | Student users | Basic access |
| `teacher` | Teacher users | Class management |
| `admin` | Regular admin | Admin functions |
| `amitrace_admin` | Super admin | Full system access |

## CSS Classes

Key CSS classes for styling:

- `.vidpod-navbar` - Main navigation container
- `.navbar-container` - Inner container
- `.navbar-brand` - Logo/brand section
- `.navbar-nav` - Navigation items container
- `.nav-item` - Individual navigation link
- `.nav-item.active` - Active page indicator
- `.navbar-user` - User info section
- `.mobile-menu` - Mobile navigation menu

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- IE11+ with polyfills

## Troubleshooting

### Navigation Not Loading
1. Check if `/includes/navigation.html` is accessible
2. Verify `include-navigation.js` is loaded
3. Check browser console for errors

### Role Visibility Issues
1. Verify user object has correct role
2. Check `data-role` attributes in HTML
3. Ensure localStorage has valid user data

### Mobile Menu Issues
1. Check if `navigation-hotfix.js` is loaded
2. Verify viewport meta tag is present
3. Test at different screen widths

## Development Notes

- Navigation is loaded dynamically via fetch API
- Falls back to basic navigation if loading fails
- User data stored in localStorage
- JWT token used for authentication

## Recent Changes

- Removed duplicate navigation systems
- Consolidated to single unified navigation
- Removed legacy teacher/admin link logic
- Fixed role-based visibility using data-role attributes
- Archived legacy mockups and test files

## Testing

Test accounts for role verification:
- Admin: `admin@vidpod.com`
- Teacher: `teacher@vidpod.com`
- Student: `student@vidpod.com`

## Related Documentation

- See `CLAUDE.md` for overall system documentation
- See `backend/frontend/js/navigation.js` for implementation details
- See `backend/frontend/includes/navigation.html` for HTML structure