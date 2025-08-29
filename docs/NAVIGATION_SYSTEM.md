# VidPOD Navigation System Documentation

## Overview
VidPOD uses a unified, role-based navigation system that provides consistent navigation across all authenticated pages. The system uses HTML data attributes for declarative role management and JavaScript for dynamic behavior.

## Architecture

### Core Files
- **`/includes/navigation.html`** - Single source of truth for navigation structure
- **`/js/navigation.js`** - Navigation controller (VidPODNav object)
- **`/js/include-navigation.js`** - Auto-loader for navigation component

### Key Features
- **Single Source of Truth**: One HTML template for all pages
- **Role-Based Visibility**: Declarative data-role attributes
- **Auto-Loading**: Navigation automatically injected into pages
- **Mobile Responsive**: Hamburger menu for mobile devices
- **Clean Architecture**: No duplicate code or complex hiding logic

## Role-Based Access Control

### Navigation Items by Role

#### 🎓 **Student Role**
Students can access:
- 🏠 Dashboard (`/dashboard.html`)
- 📚 Browse Stories (`/stories.html`)

#### 👨‍🏫 **Teacher Role**
Teachers can access:
- 🏠 Dashboard (`/dashboard.html`)
- 📚 Browse Stories (`/stories.html`)
- ✏️ Add Story (`/add-story.html`)
- 📝 Rundowns (`/rundowns.html`)
- 🎓 My Classes (`/teacher-dashboard.html`)

#### ⚙️ **Amitrace Admin Role**
Admins can access:
- 🏠 Dashboard (`/dashboard.html`)
- 📚 Browse Stories (`/stories.html`)
- ✏️ Add Story (`/add-story.html`)
- 📝 Rundowns (`/rundowns.html`)
- 🏛️ Admin Browse Stories (`/admin-browse-stories.html`)
- ⚙️ Admin Panel (`/admin.html`)

## Implementation Details

### HTML Structure
Navigation items use `data-role` attributes to specify allowed roles:

```html
<!-- Available to all roles -->
<a href="/dashboard.html" data-role="student,teacher,amitrace_admin">Dashboard</a>

<!-- Teachers and admins only -->
<a href="/add-story.html" data-role="teacher,amitrace_admin">Add Story</a>

<!-- Teachers only -->
<a href="/teacher-dashboard.html" data-role="teacher">My Classes</a>

<!-- Admins only -->
<a href="/admin.html" data-role="amitrace_admin">Admin Panel</a>
```

### JavaScript Flow

1. **Page Load**
   - `include-navigation.js` loads on DOMContentLoaded
   - Fetches `/includes/navigation.html`
   - Inserts navigation HTML into page

2. **Initialization**
   - `NavigationLoader.setupNavigation()` called
   - Retrieves user from localStorage
   - Calls `VidPODNav.init()` with user data

3. **Role Visibility**
   - `VidPODNav.updateRoleVisibility()` processes all `[data-role]` elements
   - Shows/hides based on user's role matching allowed roles
   - Adds `user-role-{role}` class to body for CSS targeting

4. **User Display**
   - Shows user name and role badge
   - Applies role-specific styling
   - Updates navigation counts (e.g., class badges)

## Usage in Pages

### Standard Implementation
All authenticated pages should include:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Page Title</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <!-- Navigation auto-loads here at body start -->
    
    <!-- Page content -->
    <div class="container">
        <!-- Your content -->
    </div>
    
    <!-- Required scripts -->
    <script src="js/navigation.js"></script>
    <script src="js/include-navigation.js"></script>
</body>
</html>
```

### Disable Auto-Loading
To prevent automatic navigation loading:

```javascript
<script>
    window.autoLoadNavigation = false;
</script>
<script src="js/include-navigation.js"></script>
```

### Manual Navigation Control
To programmatically update navigation:

```javascript
// Update user
VidPODNav.updateUser({
    name: 'John Doe',
    email: 'john@example.com',
    role: 'teacher'
});

// Change active page
VidPODNav.setCurrentPage('stories');

// Handle logout
VidPODNav.handleLogout();
```

## Mobile Navigation

### Responsive Breakpoint
- **Desktop**: > 768px - Shows horizontal navigation bar
- **Mobile**: ≤ 768px - Shows hamburger menu

### Mobile Menu Structure
- Hamburger toggle button appears
- Full navigation in collapsible menu
- Auto-closes on link click
- Closes when clicking outside

## CSS Classes

### Body Classes
- `user-role-student` - Applied when student logged in
- `user-role-teacher` - Applied when teacher logged in
- `user-role-amitrace_admin` - Applied when admin logged in

### Navigation States
- `.nav-item` - Base navigation item
- `.nav-item.active` - Current page indicator
- `.mobile-menu.active` - Mobile menu open state

### Role Badge Styling
- `.user-role.student` - Green badge
- `.user-role.teacher` - Blue badge
- `.user-role.amitrace_admin` - Orange badge

## Troubleshooting

### Navigation Not Showing
1. Check console for JavaScript errors
2. Verify `/includes/navigation.html` exists
3. Ensure `navigation.js` and `include-navigation.js` are loaded
4. Check localStorage has valid user token

### Wrong Items Visible
1. Verify user role in localStorage
2. Check `data-role` attributes in navigation.html
3. Clear browser cache and reload
4. Test with different user accounts

### Mobile Menu Issues
1. Check viewport width (must be ≤ 768px)
2. Verify `.mobile-menu` CSS is loaded
3. Test hamburger button click handler
4. Check for JavaScript errors

## Testing

### Manual Testing Checklist
- [ ] Login as student - verify only Dashboard and Browse Stories visible
- [ ] Login as teacher - verify teacher navigation items visible
- [ ] Login as admin - verify all admin items visible
- [ ] Test mobile menu toggle on small screen
- [ ] Verify active page highlighting
- [ ] Test logout functionality
- [ ] Check role badge displays correctly

### Automated Testing
Run navigation tests:
```bash
node test-clean-navigation.js
```

## Recent Updates (August 2025)

### Navigation System Consolidation
- **Fixed Role Visibility**: Added explicit `data-role` attributes to all navigation items
- **Removed Duplicate Code**: Eliminated redundant role checking in `include-navigation.js`
- **Improved Performance**: Single DOM pass for role visibility updates
- **Clear Documentation**: Consolidated all navigation documentation

### Changes Made
1. Added `data-role="student,teacher,amitrace_admin"` to Dashboard and Browse Stories
2. Removed duplicate `updateRoleVisibility` logic from `include-navigation.js`
3. Centralized all role management in `VidPODNav.updateRoleVisibility()`
4. Created comprehensive documentation

## Best Practices

1. **Always use data-role attributes** - Every navigation item should explicitly declare allowed roles
2. **Test with all roles** - Verify navigation works for student, teacher, and admin
3. **Keep HTML declarative** - Role permissions in HTML, behavior in JavaScript
4. **Maintain single source** - Only edit `/includes/navigation.html` for navigation changes
5. **Document changes** - Update this documentation when modifying navigation

## Support

For navigation issues or questions:
1. Check this documentation first
2. Review browser console for errors
3. Test with different user accounts
4. Report issues at https://github.com/anthropics/claude-code/issues

---

*Last Updated: August 28, 2025*  
*Version: 2.1.0 - Unified Navigation System*