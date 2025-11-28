# STEELIQ - Enterprise Steel Fabrication & Procurement Platform

## Platform Overview

STEELIQ is an enterprise platform built for **Lateral Engineering Limited** (New Zealand) to manage the complete steel fabrication lifecycle from initial client inquiry through to final delivery. The platform aims to achieve **Fortune 50 standards** in data integrity, operational efficiency, and enterprise control.

**Core Business Problems Solved:**
- Streamline steel estimation with AI-powered drawing analysis (reduces 4-hour process to 10 minutes)
- Automate procurement workflows (RFQs, POs, supplier management)
- Track production from quote to delivery with real-time monitoring
- Manage time, attendance, and payroll with GPS validation
- Ensure compliance with AS/NZS steel fabrication standards
- Provide complete audit trails for SOX compliance

---

## User Preferences (DO NOT DELETE OR MODIFY)

- I prefer simple language and clear explanations.
- I want iterative development with regular updates.
- **Ask before making major changes or architectural decisions.**
- Ensure all metrics are traceable to source records; do not use mock data.
- **NO MOCK OR DEMO DATA IN PRODUCTION** - All data must be real and traceable.
- Prioritize security and compliance with Fortune 50 standards.
- **Do not make changes to the server/services directory without explicit approval.**
- **Do not modify replit.md without explicit user approval.** When updating, ADD content - never delete existing instructions.
- Keep code explanations brief unless explicitly requested.
- Ensure strict type checking and comprehensive error handling.

---

## Implementation Status

### Wave 1: Foundation (COMPLETED - August 2024)
- Core database schema (75+ tables)
- User authentication and granular RBAC
- Basic job management and procurement
- Material library with 602+ AS/NZS standard items

### Wave 2: Intelligence Layer (COMPLETED - September 2024)
- AI Estimation Engine with Claude Sonnet 4.0
- DXF/DWG parser implementation (0.01mm precision)
- Pattern recognition library (18 AS/NZS patterns)
- Self-learning feedback system

### Wave 3: Enterprise Integration (COMPLETED - October 2025)
- Complete job lifecycle integration
- Fortune 50 data integrity standards (zero mock data)
- RFQ automation with supplier category matching
- Production monitoring with OEE metrics
- Immutable audit trail implementation

### Wave 4: Physical Integration (Planned Q1 2026)
- Machine telemetry via PLC/SCADA
- IoT sensor network deployment
- Time-series database implementation

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI Components | Tailwind CSS, Radix UI, shadcn/ui |
| State Management | TanStack Query v5 |
| Forms | React Hook Form + Zod validation |
| Backend | Node.js, Express.js 4.x, TypeScript |
| Database | PostgreSQL (Neon) with Drizzle ORM |
| Authentication | bcrypt, session-based with 2FA support |
| Real-time | WebSocket for notifications |
| AI | Anthropic Claude Sonnet 4.0 API |

---

## Complete Feature Inventory

### Core Application Pages
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | /dashboard | Central overview with KPIs |
| Jobs | /jobs | Job management |
| Materials | /materials | Steel catalogue |
| Inventory | /inventory | Stock tracking |
| Procurement | /procurement | RFQs, POs |
| Estimation | /estimation-clean | AI-powered estimation |
| Contacts | /contacts | Suppliers and clients |

### Advanced Modules
| Page | Route | Description |
|------|-------|-------------|
| Production Floor | /production-floor | Real-time monitoring |
| Resource Planning | /resource-planning | Capacity planning |
| Financial Intelligence | /financial-intelligence | Revenue, costs |
| Time and Payroll | /time-payroll | Time clock, GPS |
| AI Control Center | /ai-control | AI monitoring |
| Drawing Intelligence | /drawing-intelligence | PDF/DXF analysis |
| Audit Center | /audit-center | Compliance reports |
| Cutting Optimization | /optimization | Material optimization |
| Remnant Management | /remnant-management | Steel remnant tracking |
| Mobile Operations | /mobile-operations | Field operations |

### Role-Based Dashboards (6)
- Executive Dashboard (/dashboards/executive)
- Admin Dashboard (/dashboards/admin)
- Supervisor Dashboard (/dashboards/supervisor)
- Planning Dashboard (/dashboards/planning)
- Accounting Dashboard (/dashboards/accounting)
- Floor Dashboard (/dashboards/floor)

### Portals
- Client Portal (/client-portal)
- Supplier Portal (/supplier-portal)
- Supplier Integration Hub (/supplier-integration-hub)

---

## Core Microservices (32 services)

**Location:** server/services/
**WARNING: DO NOT MODIFY WITHOUT EXPLICIT APPROVAL**

### AI and Estimation Services
- aiEstimationService.ts - Drawing analysis, MTO extraction
- aiWorkflowService.ts - Job orchestration
- aiCacheService.ts - AI response caching
- aiFeedbackService.ts - User correction collection
- aiMonitoringService.ts - AI performance tracking
- patternPackService.ts - Steel pattern library

### Document Processing Services
- dxfParserService.ts - DXF file parsing
- dxfGeometryService.ts - CAD geometry calculations
- pdfAnalysisService.ts - PDF drawing analysis
- pdfGenerationService.ts - Quote/report PDF generation
- ocrService.ts - Optical character recognition
- drawingStorageService.ts - Drawing file management
- mtoExportService.ts - Material takeoff export

### Business Process Services
- jobLifecycleService.ts - Job state management
- rfqAutomationService.ts - RFQ generation
- rfqEmailService.ts - RFQ email delivery
- productionMonitoringService.ts - Real-time OEE tracking
- costAggregationService.ts - Cost rollup
- operation-service.ts - Fabrication operations

### Infrastructure Services
- emailTemplatesService.ts - Email template management
- integratedEmailService.ts - Multi-provider email
- secureStorageService.ts - Encrypted credential storage
- workerQueueService.ts - Background job processing
- errorRecoveryService.ts - Fault tolerance
- complianceLintService.ts - Code compliance checking

---

## Database Schema

**Total Tables:** 340+ exported schemas
**Schema File:** shared/schema.ts (6,026 lines)

### Core Entity Groups
| Group | Purpose |
|-------|---------|
| Users and Auth | Authentication, authorization |
| Jobs and Projects | Job lifecycle management |
| Materials | Material catalog and stock |
| Procurement | Procurement workflow |
| Production | Shop floor operations |
| Financial | Financial tracking |
| Time and Payroll | Time tracking |
| AI and Learning | AI training data |

---

## Security and Compliance

### SOX Compliance Implementation
- Audit Trail: SHA-256 hash chains on financial records
- Segregation of Duties: Role-based access, approval workflows
- Access Control: RBAC with 8+ permission levels
- Data Encryption: AES-256-GCM for sensitive data

### RBAC Roles (Hierarchy)
1. owner - Full system access
2. admin - Administrative functions
3. full - Complete operational access
4. supervisor - Team supervision
5. planning - Resource planning
6. accounting - Financial access
7. operator - Standard operations
8. basic - Minimal access

### Authentication Features
- bcrypt password hashing
- Session-based authentication
- TOTP two-factor authentication
- WebAuthn biometric support
- Progressive account lockout

### GPS Anti-Spoofing
- Mock location detection
- Velocity fraud checks
- Geofence boundary validation
- Device fingerprinting

---

## External Integrations

| Integration | Provider | Purpose |
|-------------|----------|---------|
| AI | Anthropic Claude Sonnet 4.0 | Drawing analysis |
| Email | SendGrid | Transactional emails |
| Email Import | Gmail API | Cost import |
| Messaging | WhatsApp Business API v21.0 | Time clock notifications |
| Payroll | ADP, QuickBooks, Xero | Payroll export |

---

## Development Guidelines

### Common Pitfalls to AVOID
1. Never use mock data - All data must come from real database sources
2. Never modify server/services without approval - Core business logic protected
3. Always use TanStack Query v5 object form - useQuery({ queryKey: [...] })
4. Import useToast from @/hooks/use-toast - Not from shadcn directly
5. Use import.meta.env for frontend env vars - Not process.env
6. Prefix frontend env vars with VITE_ - Required for Vite
7. Always provide value prop to SelectItem - Will throw error otherwise
8. Use hierarchical query keys - ['/api/resource', id] not template strings
9. Never import React explicitly - Vite JSX transformer handles it
10. Express 4.x only - Do not upgrade to Express 5.x (breaking changes)

### Data Integrity Rules
- No mock data - All metrics traceable to database records
- Proper relational structure with foreign key constraints
- Audit everything - User, timestamp, changes for all operations
- Role-based permissions for all endpoints
- Strict TypeScript with no any types

---

## Business Rules

| Rule | Value |
|------|-------|
| Cutting Operations | 10 min standard, 12 min for angles |
| Kerf Width | 2.4mm + 0.5mm tolerance |
| Remnant Management | Minimum 500mm for reuse |
| Pricing Updates | 7-day validity periods |
| Material Waste Target | Under 5 percent |
| Material Catalog | 602+ AS/NZS items |

### Performance Benchmarks
- API Response Time: Under 200ms for 95 percent of requests
- AI Processing Speed: 10-30 seconds for typical drawings
- Concurrent Users: 100+ simultaneous connections
- Annual Job Capacity: 10,000+ jobs with full audit trails
- Estimation Efficiency: 50 percent reduction in time-to-quote

---

## Recent Updates

| Date | Change |
|------|--------|
| 2025-11-28 | Fixed Express 5.x compatibility (downgraded to 4.21.2) |
| 2025-11-28 | Fixed wildcard route patterns for rate limiting |
| 2025-11-28 | Fixed login.tsx asset import path |
| 2025-10-21 | Wave 3 completion - Fortune 50 production readiness |

---

**END OF DOCUMENT**

This document is the authoritative reference for STEELIQ development. Any modifications require explicit user approval. ADD new content - NEVER delete existing instructions.
