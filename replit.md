# Lateral Engineering Steel Fabrication Management System

## Overview
This project is a comprehensive Job Management System (JMS) for steel fabrication, designed for Lateral Engineering Limited. It aims to optimize steel cutting operations, manage material libraries, and streamline job estimation workflows. Key capabilities include cutting optimization, inventory tracking, supplier management, and advanced AI-assisted estimation. The system encompasses the entire business process from material selection and project creation to job execution tracking and invoicing, with a vision to enhance efficiency, accuracy, and profitability in steel fabrication.

**Recent Updates (August 22, 2025):**
- Fixed Operations Settings architecture issues - all labor allowances, role rates, and skill levels now fully functional
- Added missing database columns (description, updated_at, allowance_type, amount) to labor_allowances table
- Updated Drizzle schema to match database structure exactly
- Fixed foreign key relationships between role_rates/departments and team_members/skill_levels
- Ensured complete data persistence across all Operations Settings tabs

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

## System Architecture

### Frontend
- **Framework**: React 18 (TypeScript)
- **Routing**: Wouter
- **State Management**: TanStack Query
- **UI Components**: Radix UI, Tailwind CSS
- **Form Handling**: React Hook Form with Zod
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **API Pattern**: RESTful API
- **File Processing**: Multer for CSV
- **Authentication**: bcrypt

### Data Storage
- **Primary Database**: Neon PostgreSQL (serverless)
- **ORM**: Drizzle ORM (type-safe)
- **Migration System**: Drizzle Kit

### Key Components & Features
- **Material Library**: Comprehensive catalogue of 600+ steel materials, AS/NZS, API, ASTM standards compliance, automated surface area and weight calculations.
- **Cutting Optimization**: 1D linear optimization with kerf width and user error, remnant management (>500mm), multi-algorithm support, angle cut support, visual planning.
- **Inventory Management**: Real-time stock, low-stock alerts, mill certificate tracking, location management, job material planning.
- **Supplier & Contact Management**: Standardized forms, payment terms, price history, CSV import/export.
- **Job Management Workflow**: Project creation, material takeoff, estimation, cutting optimization, execution tracking, invoicing.
- **Pricing Integration**: Dynamic price conversion (price/kg ↔ price/m), multi-supplier comparison, real-time cost monitoring.
- **UI/UX Decisions**: Unified design system with consistent components (StatusBadge, ActionMenu, MetricCard), blue/green color scheme for vibrant status indicators, compact layouts for mobile responsiveness (text-2xl headers, text-sm subtitles, p-4 padding, sm buttons). Fortune 500 standard UI/UX across all modules.
- **Advanced Features**: Multi-drawing batch processing (PDFs, DWGs, DXFs, workshop cutlists), Three-Phase Estimation Workflow (Simulation, Professional Estimate, Job Creation with user review gates), Interactive PDF features (cost breakdowns, markups, comparison), Mobile Site Inspection App (visual comparison, measurements, photo documentation), Advanced Calculations (AS/NZS compliance, crane lift planning, WPS integration, surface area, risk assessment).
- **Enterprise Features**: Multi-level Approval Workflows, Enterprise Document Management (version control, ISO compliance), KPI Tracking, Budget Variance Monitoring, Fortune 500/STRUMIS Process Tracking (4-phase workflow, Kanban/Timeline/List views, audit trails, smart automation), Subcontractor Management (CRUD, markup, compliance), Quote Customization System (multi-location, email config, handling costs, e-signatures, branding, templates, T&Cs, client portal), AI Estimation Engine as single source of truth, Quote-to-Job conversion with data transfer, Enterprise Archiving System (7-year retention), Fortune 500/STRUMIS Materials Enhancement (drawing references, child items for connections), Labor Rate Management System (centralized role-based rates, skill levels 0.7x-1.8x, allowances, rate history tracking).
- **Core Systems**: Team Management with RBAC (customizable roles, departments, granular permissions), Time Management (mobile-first tracking, GPS, offline sync, timesheet automation), Performance Review System (KPIs, automated scheduling), Qualification Expiry Dashboard (visual urgency, automated renewal tracking), Enterprise Settings Architecture (Organization, Financial, Operations settings with audit trails and RBAC), Email Cost Import (automated invoice recognition, cost variance analysis), Drawing Intelligence (AI analysis, revision comparison, automated BOM), Mobile Operations (time tracking, site inspection, document capture, offline sync PWA), Production Floor Tracking (work order tracking, machine monitoring, quality control, production metrics), Resource Planning & Capacity Management (capacity planning, labor allocation, equipment scheduling, project timeline).

## External Dependencies

- **Database Connectivity**: `@neondatabase/serverless`
- **ORM**: `drizzle-orm`
- **UI Components**: `@radix-ui/react-*`
- **Validation**: `zod`
- **Charting/Visualization**: `recharts`
- **Styling**: `tailwindcss`
- **Authentication**: `bcrypt`
- **PDF/Drawing Analysis**: AI/OCR integration (planned/in progress for Drawing Intelligence)
- **E-Signatures**: DocuSign/Adobe Sign (integration complete)
- **Build & Dev Tools**: `typescript`, `vite`, `esbuild`, `tsx`