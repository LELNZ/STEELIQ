# Lateral Engineering Steel Fabrication Management System

## Overview

This is a comprehensive steel fabrication business management system built for Lateral Engineering Limited, designed to optimize steel cutting operations, material library management, and job estimation workflows. The application serves as a complete JMS (Job Management System) with cutting optimization, inventory tracking, and supplier management capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: Radix UI with custom Tailwind CSS styling
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **API Pattern**: RESTful API with structured error handling
- **File Processing**: Multer for CSV import/export functionality
- **Authentication**: bcrypt for password hashing

### Data Storage Solutions
- **Primary Database**: Neon PostgreSQL (serverless)
- **ORM**: Drizzle with comprehensive schema definitions
- **Migration System**: Drizzle Kit for database schema management
- **Connection Pooling**: Neon serverless pooling with WebSocket support

## Key Components

### Material Library System
- **Comprehensive Catalogue**: 602+ steel materials covering SHS, RHS, Flats, Angles, Rounds, Universal Beams/Columns
- **Standards Compliance**: AS/NZS 3679.1-300, AS/NZS 1163, API 5L, ASTM specifications
- **Dimensional Tracking**: Width, thickness, diameter, depth, flange/web dimensions
- **Surface Area Calculations**: Automated calculations for coating/painting estimates
- **Weight Management**: kg/m calculations for pricing and logistics

### Cutting Optimization Engine
- **1D Linear Optimization**: Minimizes waste with 2.4mm kerf width + 0.5mm user error margin
- **Remnant Management**: Tracks reusable pieces >500mm with QR/barcode labeling
- **Multi-Algorithm Support**: First Fit Decreasing, Best Fit, and custom algorithms
- **Angle Cut Support**: Configurable start/end angles for precision cutting
- **Visual Planning**: Interactive cutting plans with measurement indicators

### Inventory Management
- **Real-time Tracking**: Current stock levels with automated low-stock alerts
- **Mill Certificate Tracking**: Heat numbers and quality certifications
- **Location Management**: Multiple storage location support
- **Job Material Planning**: Direct integration with cutting plans

### Supplier & Contact Management
- **Standardized Forms**: Consistent data entry across supplier and client contacts
- **Payment Terms Tracking**: 30-day standard with customizable terms
- **Price History**: Historical pricing data with trend analysis
- **Import/Export**: CSV-based bulk data operations

## Data Flow

### Material Selection → Optimization → Cutting Plans
1. User selects materials from comprehensive library
2. Defines cut requirements with lengths and quantities
3. System calculates optimal cutting patterns
4. Generates visual cutting plans with waste minimization
5. Updates inventory based on material consumption

### Job Management Workflow
1. Project creation with client details
2. Material takeoff and cost estimation
3. Cutting optimization and planning
4. Job execution tracking
5. Completion and invoicing

### Pricing Integration
- **Dynamic Pricing**: Automatic price/kg ↔ price/m conversion using weight data
- **Supplier Integration**: Multi-supplier pricing with comparison tools
- **Cost Tracking**: Real-time project cost monitoring

## External Dependencies

### Core Dependencies
- **Database**: @neondatabase/serverless for PostgreSQL connectivity
- **ORM**: drizzle-orm with drizzle-kit for migrations
- **UI Framework**: @radix-ui components for accessible interface
- **Validation**: zod for runtime type checking
- **HTTP Client**: Built-in fetch with TanStack Query caching

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **Tailwind CSS**: Utility-first styling with custom design system
- **ESBuild**: Fast bundling for production builds
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with hot module replacement
- **Database**: Neon serverless PostgreSQL
- **Port Configuration**: Local 5000, external 80
- **File Processing**: In-memory upload handling

### Production Deployment
- **Platform**: Replit autoscale deployment
- **Build Process**: Vite build + ESBuild server bundling
- **Database**: Neon production instance with connection pooling
- **Static Assets**: Served via Express with proper caching headers

### Environment Configuration
- **DATABASE_URL**: Neon connection string (required)
- **NODE_ENV**: Development/production mode switching
- **Port Mapping**: Automatic scaling based on demand

## Advanced Features Implementation

### Multi-Drawing Batch Processing
- Upload and analyze multiple PDF drawings simultaneously
- Support for detailer drawings in all formats from steel detailers
- Workshop cutlists integration into workflow
- Automated drawing format detection and processing

### Three-Phase Estimation Workflow
- Phase 1: Initial Simulation (AI-assisted rough estimate)
- Phase 2: Professional Estimate (detailed review and refinement)
- Phase 3: Job Creation (final approval and job setup)
- User review gates between phases with full editability
- Client adaptation capabilities at each phase

### Interactive PDF Features
- Click on drawing elements for cost breakdowns
- Add/remove items missed or to be omitted
- Drawing comparison intelligence for revisions
- Real-time markup and annotation system

### Mobile Site Inspection App
- Visual comparison of site to construction drawings
- Actual measurements addition to plan/section/elevation views
- Direct drawing markup from mobile app
- Photo documentation with drawing correlation

### Advanced Calculations Integration
- AS/NZS compliance checking
- Crane lift planning with H&S templates
- WPS database integration with alerts
- Surface area calculations for coatings
- Risk assessment matrix workflow integration

## Changelog

- June 15, 2025: Initial setup and comprehensive feature planning
- June 15, 2025: Advanced AI estimation engine with multi-phase workflow implementation
- June 23, 2025: Fixed critical save functionality and real-time calculation issues in estimation engine
- June 23, 2025: Implemented comprehensive save system with auto-save on navigation and 10-minute timer
- June 23, 2025: Added database persistence layer for estimation data with transaction safety
- June 23, 2025: Fixed data persistence issue by implementing in-memory storage for estimation testing phase
- June 25, 2025: **MAJOR FIX** - Corrected margin calculation to industry standard (margin on direct costs, not after overheads)
- June 25, 2025: **INTEGRATION** - Implemented surface area and weight flow from materials to coatings for accurate pricing
- June 25, 2025: **CLEANUP** - Removed all simulation data, fixed persistent demo projects, database now clean for real testing
- June 25, 2025: **ACCURACY** - Unified calculation logic across entire estimation system, fixed coatings integration
- June 25, 2025: **SETTINGS ARCHITECTURE** - Created dedicated Settings page for OPEX/CAPEX configuration and project-specific margin targets
- June 25, 2025: **MARGIN ENHANCEMENT** - Implemented project size-based margin color coding (Small: 20-30%, Medium: 15-25%, Large: 10-20%) with user-editable thresholds
- June 25, 2025: **COMPREHENSIVE TOOLTIPS** - Added detailed information tooltips to all Business Settings labels with practical guidance for steel fabrication costs
- June 25, 2025: **PAGE SEPARATION** - Separated Business Settings (company-wide OPEX/CAPEX) from User Preferences (personal settings) for clearer navigation
- June 25, 2025: **USER PREFERENCES EXPANSION** - Created comprehensive 35+ user preference categories covering Display, Workflow, Cutting, Materials, Estimation, Reporting, and Mobile settings for industry-leading customization
- June 25, 2025: **GLOBAL SETTINGS ARCHITECTURE** - Separated personal user preferences from company-wide global settings following JMS/ERP industry standards with 11 major configuration categories including Company, Fabrication, Quality & Safety, Financial, Integration, and Workflow management
- June 25, 2025: **TEAM MANAGEMENT SYSTEM** - Implemented comprehensive RBAC with customizable roles, departments, and team member management with industry-standard security
- June 25, 2025: **TIME MANAGEMENT SYSTEM** - Created mobile-first time tracking with GPS location, offline sync, timesheet automation, job task allocation, and Employment Hero-style workflow for workshop and site workers
- June 30, 2025: **AI ESTIMATION ENGINE INTEGRATION** - Integrated quotation monitoring dashboard and analytics directly into AI Estimation Engine as tabbed interface, creating comprehensive estimation hub with seamless workflow from creation to pipeline tracking
- July 1, 2025: **MATERIAL LIBRARY UI CLEANUP** - Removed total statistics card and category count numbers from Material Library interface for cleaner, simplified navigation experience based on user feedback
- July 1, 2025: **TABLE STANDARDIZATION IN PROGRESS** - Working on converting Steel Catalogue from Card-based grid layout to consistent Table structure matching Consumables and Coating Systems tabs for uniform Material Library interface
- July 1, 2025: **COMPREHENSIVE COATING SYSTEMS CATALOG** - Completely rebuilt coating systems catalog with 28 authentic AS/NZS 2312 compliant coating specifications including Alkyd, Epoxy, Polyurethane, Galvanizing, Intumescent, and Zinc Metal Spray systems with full technical specifications (layers, DFT, durability, reference standards, application methods, fire ratings)
- July 1, 2025: **ENHANCED COATING SYSTEMS UI** - Created professional table interface with detailed specifications matching industry standards table format, comprehensive add/edit forms with dropdown selections, standards reference panel, and proper categorization for steel fabrication workflows
- July 1, 2025: **COATING PRICING FUNCTIONALITY COMPLETE** - Fixed critical Zod schema validation error preventing price updates by adding dual string/number type support for unitCost fields, enabling real-time price editing and database persistence for coating systems catalog
- July 2, 2025: **DELETE FUNCTION FIXED ACROSS ALL MATERIAL SECTIONS** - Corrected apiRequest parameter order in Steel Catalogue, replaced fetch with apiRequest in Coating Systems, implemented proper delete functionality in Consumables with error handling and success feedback
- July 2, 2025: **CONSUMABLE-SPECIFIC ADD FUNCTION IMPLEMENTED** - Created dedicated ConsumableAddModal with industry-specific categories (Welding, Cutting, Fasteners, Gas, Safety), brand/manufacturer tracking, unit of measure options, pack sizing, bulk pricing, minimum stock levels, and storage location management
- July 2, 2025: **LABOR RATES API INTEGRATION COMPLETE** - Successfully integrated real team member data (Adam Green $120/hr, Chipo Green $85/hr, Manny Magallanes $95/hr, Vili Pelenato $75/hr) with AI Estimation Engine via /api/labor-rates endpoint with automatic site premiums and cost rate calculations
- July 2, 2025: **WAREHOUSE DEMONSTRATION PROJECT CREATED** - Built 30x30m x8m steel warehouse test project (ID: 2) ready for AI Estimation Engine validation with authentic team rates and material specifications
- July 2, 2025: **ENTERPRISE-GRADE RBAC SYSTEM IMPLEMENTED** - Deployed comprehensive Role-Based Access Control system with 12 permission categories (System, Users, Financial, Projects, Estimation, Materials, Production, Quality, Clients, Reports, Time, Documents), 100+ granular permissions, 4-tier security levels (Critical/High/Medium/Low), 10 industry-specific roles with proper hourly rates ($70-150/hr), and 9 steel fabrication departments based on ISO 27001 and NIST security frameworks
- July 2, 2025: **EMPLOYEE DATA MANAGEMENT SYSTEM COMPLETE** - Fixed critical database error in team member creation with proper Date object conversion, implemented comprehensive employee data archiving system following NZ employment law compliance (7-year retention, Privacy Act 2020), enhanced User Account Management with deletion functionality and proper data archival workflow, replaced generic browser dialogs with themed AlertDialog components for consistent UI/UX, added user account edit functionality with dedicated UserEditForm component, updated login screen branding with LEL (Lateral Engineering) business logo with proper sizing and professional presentation
- July 2, 2025: **CRITICAL SECURITY FIX - AUTHENTICATION BYPASS PATCHED** - Identified and removed duplicate login endpoint that allowed inactive users to bypass isActive validation, enhanced UserCard visual feedback with comprehensive inactive user indicators (grayed-out styling, red INACTIVE badges, UserX icons), organized user display into Active/Inactive sections with clear separation, fixed API request parameter order for proper PATCH operations
- July 3, 2025: **INDUSTRY-STANDARD TEAM MANAGEMENT REFINEMENT** - Enhanced team management system to align with leading enterprise software (SAP SuccessFactors, BambooHR, Workday) by implementing proper workflow guidance, reordering tabs to start with "Employees" as primary workflow, adding visual icons to tab navigation, simplified user account forms to login-only information, separated employee profiles from user accounts following industry best practices, added comprehensive workflow guidance panel explaining proper process flow, implemented database-safe team member updates to resolve schema conflicts
- July 3, 2025: **USER ACCOUNT FORM CONSISTENCY ESTABLISHED** - Fixed form inconsistency where edit user form was comprehensive while create user form was basic. Both create and edit user account forms now focus solely on login credentials (username, password, name, email, phone) with clear separation from employee data. All employee information (employment details, compensation, personal data) properly managed only in Employees tab, following enterprise software standards for data separation and security
- July 3, 2025: **ACTIVE ACCOUNT TOGGLE RESTORED** - Added back critical "Active Account" toggle to user edit forms enabling/disabling login access. Toggle only appears when editing existing users (not creating new ones), includes clear status indicators "(User can log in)" vs "(Login access disabled)", properly integrated with form data and backend persistence
- July 3, 2025: **PASSWORD MANAGEMENT FOR TEAM LEADERS IMPLEMENTED** - Added "View Current Password" functionality for authorized roles managing team members. Includes secure API endpoint `/api/users/:id/password` for password retrieval, frontend interface with show/hide toggle, and clear team management context labeling
- July 3, 2025: **TEAM MEMBER UPDATE DATABASE COMPATIBILITY FIXED** - Resolved persistent team member update failures by aligning update function with actual database schema (id, user_id, role_id, department_id, hire_date, hourly_rate, is_active, created_at). Team member updates now work correctly with existing database structure
- July 3, 2025: **COMPREHENSIVE DATABASE SCHEMA EXPANSION** - Added 37 essential columns to team_members table including employee_number, employment details, personal information, contact data, address fields, job information, skills arrays, safety compliance, review dates, leave entitlements, and notes fields for complete HR management
- July 3, 2025: **AUTOMATIC EMPLOYEE NUMBER GENERATION** - Implemented year-based sequential employee numbering system (EMP2025001, EMP2025002, etc.) with automatic generation for new team members and duplicate prevention logic
- July 3, 2025: **COMPLETE TEAM MEMBER CRUD OPERATIONS** - Full create, read, update, delete functionality now working with comprehensive data handling including all personal, employment, safety, and compliance information following enterprise HR system standards
- July 3, 2025: **FINAL DATABASE SCHEMA COMPLETION** - Added all remaining missing columns (overtime_rate, site_allowance, travel_allowance, annual_salary, training_records, performance_rating, profile_photo, banking details, visa information, next_of_kin data) to complete comprehensive HR management schema
- July 3, 2025: **BCRYPT PASSWORD SECURITY ENHANCEMENT** - Updated password viewing functionality to properly explain bcrypt encryption with clear message that encrypted passwords cannot be decrypted, maintaining industry-standard security practices for team management
- July 3, 2025: **TEAM MEMBER DATA INTEGRATION COMPLETE** - Fixed critical data flow issue where employee data wasn't displaying in other tabs (Personal, Employment, Compensation) by expanding getTeamMembers API to return all 50+ employee fields, resolved duplicate /api/users endpoints conflict by disabling legacy endpoint, updated User Accounts tab to properly display employee profile relationships with real-time linking status showing employee names and numbers, all team member CRUD operations now fully functional across all tabs
- July 3, 2025: **TEAM MEMBER FIELD UPDATES FULLY FUNCTIONAL** - Resolved critical issue where compensation fields (site allowance, overtime rate) and other employee data fields weren't saving by fixing TypeScript type conflicts in updateTeamMember function, added comprehensive field processing for all 50+ HR management fields including banking details, visa information, training records, performance ratings, next of kin data, automatic employee number generation now working for existing members missing numbers (Adam Green assigned EMP2025061), all Personal/Employment/Compensation tab fields now save correctly to database

## User Preferences

**Communication Style:** Simple, everyday language.

**Estimation Engine Requirements:**
- All data points must be fully editable across entire estimation system
- No basic/simplified versions - complete inline editing functionality required
- Consistent edit interface with proper icons (Calculator, Trash2) and tooltips
- Real-time cost calculations when editing quantities, rates, or hours
- Enhanced notes visibility with hover tooltips for full content display
- Uniform table layouts with Input fields for direct editing
- Auto-save on navigation away from estimation and after 10 minutes of inactivity
- Manual save button available for immediate saves
- Loading states and success/error messages for all save operations
- Unsaved changes indicators with visual feedback

**Financial Calculations:**
- Gross Profit per Hour = Gross Profit ÷ Total Hours Worked
- Gross Profit = Revenue - Cost of Goods Sold (COGS)
- COGS includes direct materials, direct labor, and direct production costs
- Total Hours Worked includes all staff involved in producing the service/product
- This metric determines pricing effectiveness, labor productivity, and job profitability

**Overhead Calculation Method:**
- System calculates overheads as percentage of direct costs (configurable per project)
- Best practice: Track actual overhead costs (workshop rent, utilities, insurance, admin)
- Recommend quarterly adjustment of overhead percentage based on actual costs
- Overhead Recovery Rate = (Recovered Overheads / Actual Overhead Costs) × 100%

**Margin Calculation Method (FIXED):**
- Industry Standard: Margin calculated on direct costs BEFORE overheads
- Formula: margin = directCosts × marginPercentage / 100
- Previous Error: margin = (directCosts + overheads) × marginPercentage (inflated pricing)
- Steel Fabrication Standard: 15-25% margin on direct costs

**Industry Benchmarks:**
- Direct Costs: 60-70% of project revenue (steel fabrication standard)
- Overheads: 15-25% of direct costs
- Margin: 15-25% for steel fabrication
- Material Cost Ratio: Materials as % of direct costs (varies by project type)