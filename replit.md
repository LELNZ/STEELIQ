<!--
CRITICAL: STEELIQ PROJECT ROOT DOCUMENT

FOR ANY AI / AUTOMATED TOOL (INCLUDING REPLIT AGENT):

1. THIS FILE IS PRIMARILY READ-ONLY.
2. YOU MUST NOT:
   - DELETE, TRUNCATE, OR OVERWRITE ANY TEXT ABOVE THE SECTION
     "15. Agent Working Notes (ONLY SECTION AGENTS MAY EDIT)"
   - RENAME HEADINGS OR REFORMAT THIS DOCUMENT
3. YOU MAY ONLY APPEND SHORT BULLET POINTS UNDER THAT SECTION,
   AND ONLY WHEN THE HUMAN USER EXPLICITLY ASKS YOU TO UPDATE replit.md.
4. IF YOU BELIEVE THIS FILE SHOULD BE UPDATED, YOU MUST:
   - DESCRIBE THE PROPOSED CHANGE IN CHAT
   - WAIT FOR EXPLICIT HUMAN APPROVAL
   - LET THE HUMAN APPLY THE CHANGE OR EXPLICITLY INSTRUCT YOU TO DO SO
5. YOU MUST TREAT THE GOVERNANCE FRAMEWORK DOCUMENT AS AUTHORITATIVE:
   "STEELIQ_Enterprise_Control_Framework_Governance_v2.0.md"
   DO NOT GUESS OR INVENT GOVERNANCE RULES. READ THEM THERE.

FAILURE TO FOLLOW THESE RULES IS A GOVERNANCE VIOLATION.
-->

# STEELIQ – Enterprise Steel Fabrication & Procurement Platform

## 0. Document Purpose

This file is the **human-owned, authoritative overview** for the STEELIQ application.

- It describes **what the system is**, **how it is governed**, and **how to work on it**.
- Detailed governance, control requirements, and deployment rules live in:  
  **`STEELIQ_Enterprise_Control_Framework_Governance_v2.0.md`**

> **AI agents:** This document is **not your scratchpad**.  
> You may read it for context, but you must not change anything except the final “Agent Working Notes” section, and only when the user explicitly asks.

---

## 1. Platform Purpose & Vision

STEELIQ is an enterprise platform built for **Lateral Engineering Limited (New Zealand)** to manage the complete steel fabrication lifecycle from initial client inquiry through to final delivery, with **Fortune‑50‑grade governance and controls**.

**Core business problems solved:**

- AI-powered estimation from drawings (PDF/DXF)
- End‑to‑end procurement (RFQs, quotes, POs, receiving)
- Production tracking from quote → job → delivery
- Time, attendance, GPS‑validated payroll
- Compliance with AS/NZS steel fabrication standards
- Full auditability for SOX 302/404 and ITGC

---

## 2. Governance Anchor (READ THIS FIRST)

**Authoritative governance document:**

- **File:** `STEELIQ_Enterprise_Control_Framework_Governance_v2.0.md`
- **Standards:** SOX 302/404, TOGAF 10, COBIT 2024, ITGC, NIST‑aligned

### 2.1 Mandatory Rules Before Any Code Change

Before making ANY non‑trivial change (feature, schema, service, or integration):

1. **Check the governance framework** section relevant to your change:
   - TOGAF (ADM) phase
   - COBIT maturity requirements
   - SOX / ITGC controls
   - Deployment gates and rollback validation
2. Ensure a **feature manifest** exists:  
   `server/manifests/{feature-name}.manifest.json`
3. Run the **pre‑flight check**:

   ```http
   GET /api/system/pre-flight-check?feature={featureName}
If canDeploy is false or overallStatus is fail, deployment is BLOCKED until governance issues are fixed.
AI agents: For any governance question, you must prioritize reading
STEELIQ_Enterprise_Control_Framework_Governance_v2.0.md over guessing.
3. User Preferences (DO NOT CHANGE)
Standing preferences from the system owner:
Use simple language and clear explanations.
Work iteratively with small, reviewable changes.
Ask before making major changes or architectural decisions.
All metrics must be traceable to real data – no fake/mock/demo data in production.
Production = zero mock data – test/staging only for test fixtures.
Prioritize security and compliance (Fortune‑50 parity).
Do not modify server/services without explicit approval.
Do not modify replit.md without explicit approval.
When updating with user permission, ADD content – never delete or rewrite existing instructions.
Keep code explanations brief unless explicitly asked for deeper detail.
4. Core Feature Inventory
4.1 Core Modules
Dashboard (/dashboard) – KPIs, job stats, inventory alerts
Jobs & Production (/jobs) – Jobs, cutting operations, document management
Materials Library (/materials) – Steel catalogue, consumables, coatings, connections
Inventory (/inventory) – Stock levels, low stock alerts, remnants, movements
Procurement (/procurement) – Requisitions, RFQs, quotes, POs, receiving
Estimation (/estimation) – Multi‑tab AI‑assisted estimation workflow
Contacts (/contacts) – Unified supplier and client contact management
4.2 Advanced Modules
Production Floor (/production-floor) – Real‑time shop floor monitoring, work orders, QA
Resource Planning (/resource-planning) – Capacity, labour, equipment scheduling
Financial Intelligence (/financial-intelligence) – Revenue, cost, margin analytics
Time & Payroll (/time-payroll) – Time clock, timesheets, GPS validation, payroll export
AI Control Center (/ai-control) – AI jobs, caching, feedback/control
Drawing Intelligence (/drawing-intelligence) – Drawing ingestion, material takeoff
Audit Center (/audit-center) – Logs, activities, compliance reports
4.3 Portals & Dashboards
Client Portal (/client-portal) – Project/quote viewing and approval
Supplier Portal (/supplier/po/:id) – PO acknowledgement, delivery confirmation
Role‑based dashboards:
Executive (/dashboards/executive)
Supervisor (/dashboards/supervisor)
Planning (/dashboards/planning)
Accounting (/dashboards/accounting)
5. Technology Stack
Layer	Technology
Frontend	React 18, TypeScript, Vite
UI	Tailwind CSS, Radix UI, shadcn/ui
State	TanStack Query v5
Forms	React Hook Form + Zod
Backend	Node.js, Express.js, TypeScript
Database	PostgreSQL (Neon) + Drizzle ORM
Auth	Sessions with bcrypt, 2FA‑ready
Real‑time	WebSockets
AI	Anthropic Claude Sonnet 4.0 API

6. Core Microservices (DO NOT MODIFY WITHOUT APPROVAL)
Location: server/services/
Service	File	Responsibility
AI Estimation	aiEstimationService.ts	Drawing analysis, MTO extraction
AI Workflow	aiWorkflowService.ts	Job orchestration, processing queues
AI Scheduling	aiSchedulingService.ts	Constraint‑based scheduling, shifts
DXF Parser	dxfParserService.ts	DXF parsing, element extraction
Job Lifecycle	jobLifecycleService.ts	Job state transitions
RFQ Automation	rfqAutomationService.ts	RFQ generation & distribution
Production Monitoring	productionMonitoringService.ts	Real‑time production tracking
Cost Aggregation	costAggregationService.ts	Cost roll‑ups, margin calculations
Fraud Scoring	fraudScoringService.ts	Anomaly detection, risk scoring
GPS Archival	gpsArchivalService.ts	GPS data retention & compliance archiving
Time Analytics	timeAnalyticsService.ts	Time tracking analytics & reports
Payroll Export	payrollExportService.ts	ADP / QuickBooks / Xero integrations
Notification	notificationService.ts	Multi‑channel notifications
WebSocket	webSocketService.ts	Real‑time event streaming

AI agents: Do not edit these services unless the user explicitly says:
“You are allowed to modify server/services/<service>.ts for this change.”
7. Database Schema (High‑Level)
Drizzle schema: shared/schema.ts
7.1 Core Entities
users – Roles, permissions, 2FA
projects – Estimation projects (multi‑phase)
jobs – Production jobs (legacy + current)
materials – Steel & consumables catalogue
suppliers – Supplier records and ratings
clients – Client records and credit terms
purchase_orders – PO lifecycle with hash‑chain audit
invoices – Invoices to and from suppliers/clients
7.2 Time & Payroll
time_entries – GPS‑verified clock in/out
timesheets – Weekly aggregation
payroll_periods – Pay period definition
gps_tracking_records – GPS evidence
7.3 Estimation & Procurement
estimation_materials, estimation_operations, estimation_labor
drawing_projects
purchase_requisitions
rfq_requests, rfq_responses
po_distributions
For audit/hash chain requirements, see the governance framework’s SOX/Audit sections.
8. Security & Compliance Overview
High‑level; see governance file for full detail.
SOX Controls:
ITGC, audit trails, change management, access control.
RBAC:
Strict roles: basic, user, team_member, supervisor, manager, admin, super_admin, owner.
SoD:
No single user can request & approve their own critical operations (payroll, POs, job release).
GPS Anti‑Spoofing:
Location sanity checks, impossible travel, device fingerprints.
For full definitions and enforcement logic, see:
STEELIQ_Enterprise_Control_Framework_Governance_v2.0.md
9. External Integrations (Secrets Not in Code)
Integration	Provider	Purpose	Secret Name / Mechanism
AI	Anthropic Claude Sonnet 4.0	Drawing analysis, estimation	ANTHROPIC_API_KEY
Email	SendGrid	Transactional emails, RFQ/PO	SENDGRID_API_KEY
Email Import	Gmail API	Cost import, inbox monitoring	OAuth tokens / secrets
Messaging	WhatsApp Business API v21	Time clock notifications	WHATSAPP_TOKEN
Payroll	ADP Workforce Now	Payroll export	Encrypted credentials
Payroll	QuickBooks	Time data export	Encrypted credentials
Payroll	Xero	Payroll sync	Encrypted credentials

Rule: No secrets in Git or replit.md. Use Replit Secrets / env vars.
10. Development Guidelines (Quick Reference)
10.1 Pitfalls to Avoid
No mock data in production – ever.
Do not modify server/services without explicit approval.
Always use TanStack Query v5 object form:
ts
Copy code
useQuery({ queryKey: ['/api/resource', id] })
Import useToast from @/hooks/use-toast, not directly from shadcn.
Use import.meta.env for frontend env vars, all prefixed with VITE_.
Always provide a value prop to SelectItem.
Use hierarchical query keys (arrays), not string concatenation.
10.2 Backend Pattern
ts
Copy code
// Validate with Zod
const data = insertSchema.parse(req.body);

// Use typed storage layer
const record = await storage.getResource(req.params.id);
10.3 Frontend Pattern
ts
Copy code
const { data, isLoading } = useQuery({
  queryKey: ['/api/resource', id],
  queryFn: fetcher,
});
Mutations should always invalidate relevant query keys.
11. File Structure
txt
Copy code
client/
  src/
    components/      # Reusable UI components
    hooks/           # Custom React hooks
    lib/             # Utilities (queryClient, helpers)
    pages/           # Route pages
      dashboards/    # Role-based dashboards
      settings/      # Settings pages
    App.tsx          # Route definitions

server/
  manifests/         # Feature governance manifests
  routes/            # API route handlers
  routes.ts          # Route registration
  services/          # Business logic (sensitive)
  utils/             # Shared utilities (e.g. preFlightChecklist)
  index.ts           # Server entry point

shared/
  schema.ts          # Drizzle schema definitions
12. Governance Integration Points
When building or changing features, you must ensure:
A manifest exists in server/manifests/ for the feature.
The manifest includes:
governance.togaf
governance.cobit2024
governance.soxControls
governance.raci
governance.deploymentGates
Pre‑flight checks pass:
DB tables & columns exist
Required services/routes exist
Audit fields exist where required
ITGC controls are not disabled
See sections 5–15 of STEELIQ_Enterprise_Control_Framework_Governance_v2.0.md for full rules.
13. Document References
Document	Location	Purpose
Project Overview	replit.md	High‑level architecture & constraints
Governance Framework	STEELIQ_Enterprise_Control_Framework_Governance_v2.0.md	Detailed control requirements
Feature Manifests	server/manifests/*.manifest.json	Per‑feature governance + dependencies
Pre‑Flight Checklist	server/utils/preFlightChecklist.ts	Deployment & governance validation
Governance Utilities	server/utils/enterpriseGovernance.ts	Governance logic and helpers
Control Framework Routes	server/routes/controlFrameworkRoutes.ts	Governance API endpoints
Database Schema	shared/schema.ts	All tables and audit fields

14. Recent Changes Log
Date	Change	Impact
2025‑11‑28	Governance framework v2.0 integrated across STEELIQ	Fortune‑50 parity controls enforced
2025‑11‑28	replit.md hardened for AI / agent interactions	Prevents truncation & unauthorized modifications

15. Agent Working Notes (ONLY SECTION AGENTS MAY EDIT)
FOR AI / AUTOMATED TOOLS:
This is the ONLY section where you may write anything, and only when the user explicitly asks you to “update replit.md” or “save this preference to replit.md”.
You must:
Append short bullets only (no long essays, no rewrites)
Never delete existing bullets
Never reorder or rename sections
(reserved)
yaml
Copy code

---
