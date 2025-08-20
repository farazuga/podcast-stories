# VidPOD Application Sitemap

*Comprehensive site structure and navigation map for the VidPOD podcast story management system*

---

## 🏗️ **Site Architecture Overview**

```
VidPOD Application
├── 🔐 Authentication System
├── 👤 Role-Based Dashboards  
├── 📚 Story Management
├── 🎓 Education Features
├── 🏛️ Administration
└── 🛠️ System Pages
```

---

## 📱 **Main Application Pages**

### 🔐 **Authentication & Registration**
| Page | URL | Access | Description |
|------|-----|--------|-------------|
| **Login** | `/index.html` | Public | Main login page with email/password |
| **Register** | `/register.html` | Public | General registration page |
| **Student Registration** | `/register-student.html` | Public | Student-specific registration |
| **Teacher Registration** | `/register-teacher.html` | Public | Teacher registration (requires approval) |
| **Forgot Password** | `/forgot-password.html` | Public | Password recovery |
| **Reset Password** | `/reset-password.html` | Public | Password reset form |

### 👤 **Role-Based Dashboards**

#### 🎓 **Student Dashboard**
| Page | URL | Access | Description |
|------|-----|--------|-------------|
| **Main Dashboard** | `/dashboard.html` | Student+ | Personal dashboard with stats and quick actions |

#### 👨‍🏫 **Teacher Dashboard** 
| Page | URL | Access | Description |
|------|-----|--------|-------------|
| **Main Dashboard** | `/dashboard.html` | Teacher+ | Enhanced dashboard with class management |
| **Teacher Classes** | `/teacher-dashboard.html` | Teacher+ | Class creation, management, student enrollment |

#### 🏛️ **Admin Dashboard**
| Page | URL | Access | Description |
|------|-----|--------|-------------|
| **Main Dashboard** | `/dashboard.html` | Admin | Full dashboard with admin widgets |
| **Admin Panel** | `/admin.html` | Admin | System administration, user management, settings |
| **Admin Browse Stories** | `/admin-browse-stories.html` | Admin | Enhanced story management with approval workflow |
| **User Management** | `/user-management.html` | Admin | User roles, permissions, teacher approvals |

---

## 📚 **Story Management System**

| Page | URL | Access | Description | Key Features |
|------|-----|--------|-------------|--------------|
| **Browse Stories** | `/stories.html` | All Users | Main story browsing interface | Search, filter, grid/list view, favorites |
| **Story Details** | `/story-detail.html?id={id}` | All Users | Individual story view | Full story content, ratings, comments |
| **Add/Edit Story** | `/add-story.html` | All Users | Story creation and editing | Form with questions, tags, interviewees |
| **Edit Story** | `/add-story.html?edit={id}` | Owner/Admin | Edit existing story | Pre-populated form with existing data |

---

## 🔗 **Navigation Flow & User Journeys**

### 📊 **Student User Flow**
```
Login → Dashboard → Browse Stories → Story Details
  ↓         ↓           ↓             ↓
Profile   Quick Add   Favorites    Rate/Comment
  ↓         ↓           ↓             ↓
Logout    Add Story   My Stories   Share Story
```

### 🎓 **Teacher User Flow**
```
Login → Dashboard → Teacher Classes → Manage Students
  ↓         ↓            ↓              ↓
Profile   My Stories   Create Class   Generate Codes
  ↓         ↓            ↓              ↓
Browse    Add Story    View Reports   Export Data
```

### 🏛️ **Admin User Flow**
```
Login → Dashboard → Admin Panel → User Management
  ↓         ↓           ↓              ↓
Stats     Stories     Schools        Teacher Approvals
  ↓         ↓           ↓              ↓
Monitor   Approval    Settings       System Health
  ↓         ↓           ↓              ↓
CSV Mgmt  Bulk Ops    Tag Mgmt      Debug Tools
```

---

## 🎯 **Feature Access Matrix**

| Feature | Student | Teacher | Admin |
|---------|---------|---------|-------|
| **View Stories** | ✅ Approved | ✅ All + Own | ✅ All |
| **Create Stories** | ✅ | ✅ | ✅ |
| **Edit Stories** | ✅ Own | ✅ Own | ✅ All |
| **Delete Stories** | ✅ Own | ✅ Own | ✅ All |
| **Approve Stories** | ❌ | ❌ | ✅ |
| **Manage Classes** | ❌ | ✅ | ✅ |
| **Join Classes** | ✅ | ❌ | ✅ |
| **CSV Import** | ❌ | ❌ | ✅ |
| **CSV Export** | ❌ | ❌ | ✅ |
| **User Management** | ❌ | ❌ | ✅ |
| **System Settings** | ❌ | ❌ | ✅ |

---

## 🧭 **Navigation Structure**

### 📱 **Main Navigation Bar**
```
📻 VidPOD
├── 🏠 Dashboard
├── 📚 Browse Stories  
├── ✏️ Add Story
├── 🎓 My Classes (Teachers)
├── 🏛️ Admin Browse Stories (Admins)
└── ⚙️ Admin Panel (Admins)
```

### 👤 **User Menu**
```
User Avatar & Info
├── 👤 Profile Settings
├── 🔔 Notifications
├── ⚙️ Preferences
└── 🚪 Logout
```

---

## 📋 **Page-Specific Features**

### 🏠 **Dashboard (`/dashboard.html`)**
- **Stats Cards**: My Stories, Favorites, Classes (if applicable)
- **Quick Actions**: Create Story, Browse Stories, Manage Classes
- **Recent Activity**: Recent stories, recent favorites
- **Role-Specific Widgets**: Based on user permissions

### 📚 **Browse Stories (`/stories.html`)**
- **Search & Filters**: Keywords, tags, dates, authors
- **View Modes**: Grid view, list view
- **Bulk Actions**: Add to favorites, delete (own stories)
- **Sorting**: Date, title, author, popularity
- **Pagination**: Navigate through large story collections

### 🏛️ **Admin Browse Stories (`/admin-browse-stories.html`)**
- **Admin Stats**: Total, pending, approved, rejected stories
- **Enhanced Filters**: Status-based filtering
- **Bulk Admin Actions**: Approve, reject, delete
- **CSV Management**: Import stories, export data
- **User Information**: Author details, school info

### 🎓 **Teacher Dashboard (`/teacher-dashboard.html`)**
- **Class Management**: Create, edit, delete classes
- **Student Enrollment**: View students, manage access
- **Class Codes**: Generate and share unique codes
- **Analytics**: Class participation, story submissions

### ⚙️ **Admin Panel (`/admin.html`)**
- **User Management**: Approve teachers, manage roles
- **School Management**: Add schools, organize users
- **System Settings**: Configure application settings
- **Content Management**: Tags, categories, metadata

---

## 🔧 **System & Utility Pages**

| Page | URL | Purpose | Access |
|------|-----|---------|--------|
| **404 Error** | `/404.html` | Page not found | Public |
| **Navigation Include** | `/includes/navigation.html` | Unified navigation component | System |

### 🛠️ **Debug & Development Pages**
*(Development/Testing Only)*
- `/debug-admin.html` - Admin functionality testing
- `/debug-api-test.html` - API connectivity testing
- `/test-api-simple.html` - Simple API tests

---

## 🔐 **Security & Access Control**

### 🛡️ **Authentication Requirements**
- **JWT Token**: Required for all protected pages
- **Role Verification**: Server-side role checking
- **Session Management**: Automatic logout on token expiry

### 👥 **User Roles & Hierarchy**
```
🏛️ Amitrace Admin
├── Full system access
├── User management
├── Content approval
└── System configuration

👨‍🏫 Teacher
├── Class management
├── Student oversight
├── Content creation
└── Limited admin functions

🎓 Student
├── Content consumption
├── Story creation
├── Class participation
└── Basic interactions
```

---

## 📊 **API Integration Points**

### 🔗 **Key API Endpoints**
- `/api/auth/*` - Authentication system
- `/api/stories/*` - Story CRUD operations
- `/api/classes/*` - Class management
- `/api/users/*` - User management
- `/api/favorites/*` - Favorites system
- `/api/admin/*` - Administrative functions

---

## 🎯 **User Experience Flows**

### 📝 **Story Creation Process**
```
Add Story → Fill Form → Add Tags → Add Questions → Submit → Approval Queue → Published
```

### 🎓 **Class Management Process**
```
Create Class → Generate Code → Share with Students → Monitor Enrollment → Manage Access
```

### 🏛️ **Admin Approval Process**
```
Story Submitted → Admin Review → Approve/Reject → User Notification → Content Available
```

---

## 📱 **Mobile Responsiveness**

All pages include:
- **Responsive Design**: Mobile-first approach
- **Mobile Navigation**: Hamburger menu system
- **Touch-Friendly**: Optimized for mobile interaction
- **Performance**: Fast loading on mobile devices

---

## 🔄 **Future Expansion Areas**

### 📈 **Potential New Pages**
- `/analytics.html` - Detailed analytics dashboard
- `/reports.html` - System reporting
- `/notifications.html` - Notification center
- `/settings.html` - User preferences
- `/help.html` - Help documentation

### 🚀 **Enhanced Features**
- Real-time collaboration
- Advanced search capabilities
- Social features (following, sharing)
- Integration with external tools

---

*Last Updated: August 2025*  
*VidPOD Version: 2.1.0*