# STEELIQ - Enterprise Steel Fabrication & Procurement Platform

## Platform Purpose & Vision

STEELIQ is an enterprise platform built for **Lateral Engineering Limited** (New Zealand) to manage the complete steel fabrication lifecycle from initial client inquiry through to final delivery. The platform aims to achieve **Fortune 50 standards** in data integrity, operational efficiency, and enterprise control.

**Core Business Problems Solved:**
- Streamline steel estimation with AI-powered drawing analysis
- Automate procurement workflows (RFQs, POs, supplier management)
- Track production from quote to delivery with real-time monitoring
- Manage time, attendance, and payroll with GPS validation
- Ensure compliance with AS/NZS steel fabrication standards
- Provide complete audit trails for SOX compliance

---

## MANDATORY: Enterprise Control Framework Governance

**ALL development actions MUST comply with the Enterprise Control Framework defined in:**
`ENTERPRISE_CONTROL_FRAMEWORK_GOVERNANCE.md`

### Before ANY Code Change:
1. Verify feature has a manifest file at `server/manifests/{feature-name}.manifest.json`
2. Confirm manifest includes complete governance metadata (TOGAF, COBIT, SOX, Gates)
3. Run pre-flight check: `GET /api/system/pre-flight-check?feature={name}`
4. Deployment is BLOCKED if any control fails

### Governance Enforcement Rules:
| Control | Failure = BLOCKED |
|---------|-------------------|
| Invalid TOGAF ADM Phase | YES |
| ITGC Control Disabled | YES |
| COBIT Maturity Gap > 1 | YES |
| Rollback Not Validated | YES |
| Missing Audit Columns | YES |
| SoD Violation | YES |

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

---

## Complete Feature Inventory

### Core Modules
- **Dashboard** (`/dashboard`) - Central overview with KPIs, job stats, inventory alerts
- **Jobs & Production** (`/jobs`) - Job management, cutting operations, document management
- **Materials Library** (`/materials`) - Steel catalogue, consumables, coatings, connections
- **Inventory** (`/inventory`) - Stock tracking, low stock alerts, remnants, movements
- **Procurement** (`/procurement`) - Requisitions, RFQs, quotes, POs, receiving
- **Estimation** (`/estimation`) - AI-powered estimation with multi-tab workflow
- **Contacts** (`/contacts`) - Unified suppliers and clients management

### Advanced Modules
- **Production Floor** (`/production-floor`) - Real-time monitoring, work orders, quality control
- **Resource Planning** (`/resource-planning`) - Capacity planning, labor allocation, equipment scheduling
- **Financial Intelligence** (`/financial-intelligence`) - Revenue, costs, cash flow, profit margins
- **Time & Payroll** (`/time-payroll`) - Time clock, timesheets, GPS validation, payroll export
- **AI Control Center** (`/ai-control`) - AI operations monitoring, cache, feedback management
- **Drawing Intelligence** (`/drawing-intelligence`) - PDF/DXF analysis, material takeoff extraction
- **Audit Center** (`/audit-center`) - System logs, activity tracking, compliance reports

### Portals
- **Client Portal** (`/client-portal`) - Project viewing, quote approval, feedback submission
- **Supplier Portal** (`/supplier/po/:id`) - PO acknowledgment, delivery confirmation

### Role-Based Dashboards
- Executive Dashboard (`/dashboards/executive`)
- Supervisor Dashboard (`/dashboards/supervisor`)
- Planning Dashboard (`/dashboards/planning`)
- Accounting Dashboard (`/dashboards/accounting`)

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI Components | Tailwind CSS, Radix UI, shadcn/ui |
| State Management | TanStack Query v5 |
| Forms | React Hook Form + Zod validation |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (Neon) with Drizzle ORM |
| Authentication | bcrypt, session-based with 2FA support |
| Real-time | WebSocket for notifications |
| AI | Anthropic Claude Sonnet 4.0 API |

---

## Core Microservices (DO NOT MODIFY WITHOUT APPROVAL)

Located in `server/services/`:

| Service | File | Responsibility |
|---------|------|----------------|
| AI Estimation | `aiEstimationService.ts` | Drawing analysis, MTO extraction |
| AI Workflow | `aiWorkflowService.ts` | Job orchestration, processing queues |
| AI Scheduling | `aiSchedulingService.ts` | Constraint-based scheduling, shift management |
| DXF Parser | `dxfParserService.ts` | DXF file parsing, structural element identification |
| Job Lifecycle | `jobLifecycleService.ts` | Job state management, transitions |
| RFQ Automation | `rfqAutomationService.ts` | RFQ generation, supplier distribution |
| Production Monitoring | `productionMonitoringService.ts` | Real-time production tracking |
| Cost Aggregation | `costAggregationService.ts` | Cost rollup, margin calculations |
| Fraud Scoring | `fraudScoringService.ts` | Anomaly detection, risk scoring |
| GPS Archival | `gpsArchivalService.ts` | GPS data retention, compliance archiving |
| Time Analytics | `timeAnalyticsService.ts` | Time tracking analytics, reports |
| Payroll Export | `payrollExportService.ts` | ADP/QuickBooks/Xero integration |
| Notification | `notificationService.ts` | Multi-channel notifications |
| WebSocket | `webSocketService.ts` | Real-time event streaming |

---

## Database Schema (100+ tables)

**Core Entities:**
- `users` - System users with roles, permissions, 2FA
- `projects` - Three-phase estimation workflow
- `jobs` - Production jobs (legacy compatibility)
- `materials` - Steel catalogue with dimensions, pricing
- `suppliers` - Supplier management with ratings
- `clients` - Client management with credit terms
- `purchase_orders` - PO lifecycle with hash chain audit
- `invoices` - Supplier and client invoicing

**Time & Payroll:**
- `time_entries` - Clock in/out records with GPS
- `timesheets` - Weekly timesheet aggregation
- `payroll_periods` - Pay period definitions
- `gps_tracking_records` - Location verification

**Estimation:**
- `estimation_materials` - Project material lists
- `estimation_operations` - Fabrication operations
- `estimation_labor` - Labor hour calculations
- `drawing_projects` - Drawing intelligence projects

**Procurement:**
- `purchase_requisitions` - Material requisitions
- `rfq_requests` - Request for quote tracking
- `rfq_responses` - Supplier quote responses
- `po_distributions` - PO email distribution

---

## Security & Compliance

### SOX Compliance Controls
- **Audit Trail:** SHA-256 hash chains on financial records
- **Segregation of Duties:** Role-based access, approval workflows
- **Change Management:** Manifest-based pre-flight checks
- **Access Control:** RBAC with 8 permission levels
- **Data Encryption:** AES-256-GCM for sensitive data

### RBAC Roles (Hierarchy)
1. `owner` - Full system access
2. `admin` - Administrative functions
3. `super_admin` - Cross-department admin
4. `manager` - Department management
5. `supervisor` - Team supervision
6. `team_member` - Standard operations
7. `user` - Basic access
8. `basic` - Minimal access

### GPS Anti-Spoofing
- Mock location detection
- Velocity fraud checks (impossible travel)
- Geofence boundary validation
- Network consistency verification
- Device fingerprinting

---

## External Integrations

| Integration | Provider | Purpose | Secret |
|-------------|----------|---------|--------|
| AI | Anthropic Claude Sonnet 4.0 | Drawing analysis, estimation | `ANTHROPIC_API_KEY` |
| Email | SendGrid | Transactional emails, PO/RFQ | `SENDGRID_API_KEY` |
| Email Import | Gmail API | Cost import, inbox monitoring | OAuth tokens |
| Messaging | WhatsApp Business API v21.0 | Time clock notifications | `WHATSAPP_TOKEN` |
| Payroll | ADP Workforce Now | Payroll export | Encrypted credentials |
| Payroll | QuickBooks | Time data export | Encrypted credentials |
| Payroll | Xero | Payroll sync | Encrypted credentials |

---

## Development Guidelines

### Common Pitfalls to AVOID
1. **Never use mock data** - All data must come from real sources
2. **Never modify server/services without approval** - Core business logic
3. **Always use TanStack Query v5 object form** - `useQuery({ queryKey: [...] })`
4. **Import useToast from `@/hooks/use-toast`** - Not from shadcn directly
5. **Use `import.meta.env` for frontend env vars** - Not `process.env`
6. **Prefix frontend env vars with `VITE_`** - Required for Vite
7. **Always provide value prop to SelectItem** - Will throw error otherwise
8. **Use hierarchical query keys** - `['/api/resource', id]` not template strings

### API Patterns
```typescript
// Always validate with Zod
const validated = insertSchema.parse(req.body);
// Use storage interface for CRUD
const data = await storage.getResource(req.params.id);
```

### Frontend Patterns
```typescript
// TanStack Query v5 object form
const { data, isLoading } = useQuery({
  queryKey: ['/api/resource', id],
});
// Mutations with cache invalidation
onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/resource'] })
```

---

## File Structure

```
client/
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities (queryClient, utils)
│   ├── pages/          # Route pages
│   │   ├── dashboards/ # Role-based dashboards
│   │   └── settings/   # Settings pages
│   └── App.tsx         # Route definitions
server/
├── manifests/          # Feature governance manifests
├── routes/             # API route handlers
├── routes.ts           # Main route registration
├── services/           # Business logic (DO NOT MODIFY)
├── utils/              # Utilities (preFlightChecklist, etc.)
└── index.ts            # Server entry point
shared/
└── schema.ts           # Drizzle schema definitions
```

---

## Document References

| Document | Location | Purpose |
|----------|----------|---------|
| Governance Framework | `ENTERPRISE_CONTROL_FRAMEWORK_GOVERNANCE.md` | Control specifications |
| Feature Manifests | `server/manifests/*.manifest.json` | Per-feature governance |
| Database Schema | `shared/schema.ts` | All table definitions |
| Pre-Flight Service | `server/utils/preFlightChecklist.ts` | Deployment validation |

---

## Recent Changes Log

| Date | Change | Impact |
|------|--------|--------|
| 2025-11-28 | Enterprise Control Framework v2.0.1 | TOGAF/COBIT/SOX governance enforcement |
| 2025-11-28 | Comprehensive replit.md rebuild | Complete platform documentation |

---

**END OF DOCUMENT**

*This document is the authoritative reference for STEELIQ development. Any modifications require explicit user approval. ADD new content - NEVER delete existing instructions.*
