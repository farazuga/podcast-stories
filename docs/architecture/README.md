# VidPOD Architecture Documentation

*Comprehensive technical documentation for understanding the VidPOD system architecture*

## 📊 System Overview

### [System Overview with Mermaid Diagrams](./system-overview.md)
Complete architectural documentation featuring three comprehensive Mermaid diagrams:

1. **[High-Level Architecture Diagram](./system-overview.md#high-level-architecture)** - Shows frontend/backend/database relationships, authentication flow, and component interactions
2. **[Database Schema Relationships](./system-overview.md#database-schema-relationships)** - Visualizes all tables, relationships, foreign keys, and junction tables from the updated schema
3. **[API Routes Structure](./system-overview.md#api-routes-structure)** - Maps all 18 route files showing endpoint organization and authentication requirements

### [Navigation System Architecture](./navigation.md)
Detailed implementation guide for the unified navigation system:
- Single navigation template with role-based visibility
- Mobile-responsive hamburger menu design
- Auto-loading across all authenticated pages
- JavaScript controller for menu state management

## 🏗️ Architecture Context for Development

### Database Design Principles
The VidPOD database schema implements a **multi-tier relational model** with:
- **Role-based access control** through user roles (amitrace_admin, teacher, student)
- **Approval workflows** for content moderation and teacher registration
- **Complex relationships** via junction tables for many-to-many associations
- **Data integrity** through foreign key constraints and normalized design

*For complete schema visualization and table relationships, see: [Database Schema Diagram](./system-overview.md#database-schema-relationships)*

### API Architecture
The backend API follows **RESTful conventions** with:
- **18 modular route files** organized by domain functionality
- **JWT authentication middleware** with role-based authorization
- **Consistent error handling** and status code conventions  
- **Parameterized queries** for SQL injection prevention

*For endpoint mapping and authentication flow, see: [API Routes Structure Diagram](./system-overview.md#api-routes-structure)*

### Frontend Architecture
The client-side follows **component-based design** with:
- **Unified navigation system** eliminating code duplication
- **Role-based UI rendering** controlled by user permissions
- **Mobile-first responsive design** with CSS Grid and Flexbox
- **Modular JavaScript** with ES6+ standards and fetch API

*For complete component interaction and data flow, see: [High-Level Architecture Diagram](./system-overview.md#high-level-architecture)*

## 🔗 Related Documentation

### Developer Resources
- **[Developer Onboarding Guide](../developer-onboarding.md)** - Comprehensive setup and learning path for new developers
- **[System Architecture Overview](./system-overview.md)** - Technical deep dive with architectural diagrams
- **[Master Testing Guide](../testing/master-testing-guide.md)** - Testing procedures with architectural context

### Implementation Guides
- **[Feature Documentation](../features/README.md)** - How individual features integrate with the overall architecture
- **[Railway Deployment Guide](../deployment/railway-deployment-guide.md)** - Production deployment with architectural considerations
- **[CSV Import Documentation](../features/csv-import.md)** - Data import system architecture and workflow

## 📈 Architectural Decision Records (ADRs)

### Technology Choices

**Three-Tier Architecture Decision:**
- **Reasoning**: Clear separation of concerns, scalability, maintainability
- **Trade-offs**: More complex than monolithic, but better for team collaboration
- **Implementation**: Frontend (HTML/CSS/JS) → Backend (Express.js) → Database (PostgreSQL)

**JWT Authentication Decision:**
- **Reasoning**: Stateless authentication, cross-domain compatibility, role embedding
- **Trade-offs**: Token management complexity vs. session simplicity
- **Implementation**: Bearer tokens with 7-day expiration and role-based payload

**Unified Navigation Decision:**
- **Reasoning**: Eliminate duplicate code, consistent user experience, maintainability
- **Trade-offs**: Initial complexity vs. long-term maintenance benefits
- **Implementation**: Single template with JavaScript-controlled role visibility

**PostgreSQL Database Decision:**
- **Reasoning**: ACID compliance, complex relationships, JSON support, performance
- **Trade-offs**: Setup complexity vs. NoSQL simplicity, but better for relational data
- **Implementation**: Normalized schema with foreign key constraints and junction tables

## 🛠️ Development Guidelines

### Architectural Best Practices

1. **Follow Three-Tier Separation**
   - Keep frontend presentation logic separate from business logic
   - Implement business rules in backend API endpoints
   - Use database for data integrity and relationships

2. **Maintain Role-Based Design**
   - All features must consider multi-tier user roles
   - Implement authorization at both API and UI levels
   - Design approval workflows for content moderation

3. **Ensure Component Reusability**
   - Use unified navigation system patterns for new components
   - Follow established JavaScript module patterns
   - Maintain consistent CSS design system

4. **Database Design Standards**
   - Use foreign key constraints for data integrity
   - Implement soft deletion with `is_active` flags
   - Create junction tables for many-to-many relationships

### Adding New Features

When implementing new features, consider the architectural impact:

1. **Database Changes**: Update schema, create migrations, maintain relationships
2. **API Endpoints**: Follow RESTful conventions, implement authentication/authorization
3. **Frontend Components**: Use unified navigation patterns, maintain responsive design
4. **Documentation**: Update architectural diagrams if components or relationships change

*For step-by-step feature development workflow, see: [Developer Onboarding Guide](../developer-onboarding.md#development-workflow)*

---

*This architecture documentation provides the foundation for understanding VidPOD's technical design. For implementation details and hands-on guidance, refer to the developer onboarding guide and individual component documentation.*