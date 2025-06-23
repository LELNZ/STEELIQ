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

## User Preferences

**Communication Style:** Simple, everyday language.

**Estimation Engine Requirements:**
- All data points must be fully editable across entire estimation system
- No basic/simplified versions - complete inline editing functionality required
- Consistent edit interface with proper icons (Calculator, Trash2) and tooltips
- Real-time cost calculations when editing quantities, rates, or hours
- Enhanced notes visibility with hover tooltips for full content display
- Uniform table layouts with Input fields for direct editing

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

**Industry Benchmarks:**
- Direct Costs: 60-70% of project revenue (steel fabrication standard)
- Overheads: 15-25% of direct costs
- Margin: 15-25% for steel fabrication
- Material Cost Ratio: Materials as % of direct costs (varies by project type)