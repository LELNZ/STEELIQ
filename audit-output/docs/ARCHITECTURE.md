# STEELIQ System Architecture Documentation

## System Overview

STEELIQ is an enterprise-grade steel fabrication and procurement platform designed to Fortune 50 standards. The system manages the complete lifecycle from AI-powered estimation through procurement, production, and financial reconciliation.

## Architecture Principles

### Core Design Principles
1. **Zero Mock Data Policy** - All data must be traceable to real sources
2. **Immutable Audit Trail** - Every operation logged with user and timestamp
3. **Database-First Integrity** - Constraints enforced at database level
4. **Service Separation** - Distinct microservices for each domain
5. **Self-Learning AI** - Continuous improvement through feedback loops

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (React)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │   Jobs   │ │Estimation│ │   RFQ    │ │Production│       │
│  │   UI     │ │    UI    │ │    UI    │ │    UI    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────┴─────────────────────────────────────┐
│                  API Gateway (Express.js)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Authentication & Authorization (RBAC)        │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                   Service Layer (7 Core Services)            │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │AI Estimation│ │Job Lifecycle│ │RFQ Automation│           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │ Production  │ │    Cost     │ │ DXF Parser  │           │
│ │ Monitoring  │ │ Aggregation │ │   Service   │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
│ ┌─────────────────────────────────────────────┐           │
│ │           AI Workflow Service                │           │
│ └─────────────────────────────────────────────┘           │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                    Data Layer (PostgreSQL)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │  Jobs    │ │   MTO    │ │   RFQ    │ │Production│     │
│  │  Tables  │ │  Tables  │ │  Tables  │ │  Tables  │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│                    (223 Total Tables)                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                 External Services Layer                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │Anthropic │ │ SendGrid │ │  Gmail   │ │   Neon   │     │
│  │    AI    │ │  Email   │ │   API    │ │    DB    │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
└──────────────────────────────────────────────────────────────┘
```

## Core Services Architecture

### 1. AI Estimation Service (`aiEstimationService.ts`)
**Purpose:** Extract material take-offs from drawings using AI

**Key Components:**
- Claude 3.5 Sonnet integration
- PDF/DXF processing pipeline
- Pattern recognition (18 AS/NZS standards)
- Self-learning feedback loop

**Data Flow:**
```
PDF/DXF → Text Extraction → AI Analysis → MTO Generation → Database Storage
```

### 2. Job Lifecycle Service (`jobLifecycleService.ts`)
**Purpose:** Manage job creation and lifecycle transitions

**Key Components:**
- Estimation to job conversion
- Material requirements generation
- Purchase requisition creation
- Status tracking and validation

**Data Flow:**
```
Estimation → Validation → Job Creation → Material Assignment → Requisition
```

### 3. RFQ Automation Service (`rfqAutomationService.ts`)
**Purpose:** Automate supplier RFQ generation and distribution

**Key Components:**
- Supplier category matching
- Multi-supplier RFQ generation
- Email template system
- Quote comparison tools

**Data Flow:**
```
Job Materials → Supplier Selection → RFQ Creation → Email Distribution
```

### 4. Production Monitoring Service (`productionMonitoringService.ts`)
**Purpose:** Track real-time production metrics and OEE

**Key Components:**
- Machine status logging
- OEE calculation (Availability × Performance × Quality)
- Production event tracking
- Department efficiency metrics

**Data Flow:**
```
Machine Events → Status Logs → Metric Calculation → Dashboard Display
```

### 5. Cost Aggregation Service (`costAggregationService.ts`)
**Purpose:** Aggregate costs from multiple sources

**Key Components:**
- Multi-source cost collection
- Variance analysis
- Overhead allocation
- Real-time cost tracking

**Data Flow:**
```
POs + Invoices + Time Entries → Aggregation → Variance Analysis → Reports
```

### 6. DXF Parser Service (`dxfParserService.ts`)
**Purpose:** Parse CAD files with 0.01mm precision

**Key Components:**
- Geometry extraction
- Feature detection
- Dimension calculation
- AS/NZS validation

### 7. AI Workflow Service (`aiWorkflowService.ts`)
**Purpose:** Orchestrate AI processing pipeline

**Key Components:**
- File validation
- Processing queue management
- Result transformation
- Error recovery

## Database Architecture

### Schema Organization (223 Tables)

#### Core Business (45 tables)
- Jobs & Projects
- Clients & Contacts
- Suppliers & Categories
- Materials & Inventory

#### AI & Learning (12 tables)
- ai_mto_elements (hierarchical)
- ai_pattern_library
- ai_feedback
- ai_learning_metrics
- ai_mto_geometries
- ai_mto_features

#### Procurement (18 tables)
- purchase_requisitions
- rfq_requests
- purchase_orders
- invoices

#### Production (15 tables)
- machines
- work_orders
- production_events
- quality_control

#### Financial (10 tables)
- cost_variances
- payments
- budgets
- financial_periods

#### System (8 tables)
- numbering_sequences
- audit_events
- role_permissions
- system_configurations

### Key Design Patterns

#### Sequence-Based Numbering
```sql
-- All IDs use database sequences, no random generation
CREATE SEQUENCE job_number_seq;
SELECT CONCAT('JOB-2025-', LPAD(NEXTVAL('job_number_seq'), 5, '0'));
```

#### Immutable Audit Trail
```sql
-- Every change logged with user, timestamp, and delta
INSERT INTO audit_events (
  entity_type, entity_id, action, 
  user_id, timestamp, changes
)
```

#### Hierarchical Data (MTO)
```sql
-- Parent-child relationships for material breakdowns
ai_mto_elements (
  id, parent_id, hierarchy_level, 
  designation, type, specifications
)
```

## Security Architecture

### Authentication Flow
```
Login → Password Verification (bcrypt) → Session Creation → Token Generation
```

### Authorization Model
- **Role-Based Access Control (RBAC)**
- 6 Role Levels: basic, planning, accounting, supervisor, admin, full
- Granular permissions stored in JSON
- Department-based access control

### Security Layers
1. **Network Level** - HTTPS only (pending)
2. **Application Level** - Session management, CSRF protection
3. **Database Level** - Parameterized queries, constraint enforcement
4. **Audit Level** - Complete transaction logging

## API Architecture

### RESTful Endpoints
```
POST   /api/estimation/analyze     - AI drawing analysis
POST   /api/jobs                   - Create job from estimation
GET    /api/jobs/:id               - Get job details
POST   /api/rfq/create             - Generate RFQs
GET    /api/production/metrics     - Production dashboard
POST   /api/costs/aggregate        - Cost rollup
```

### Request/Response Pattern
```typescript
// Standard response format
{
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
  };
}
```

## Integration Points

### External Services

#### Anthropic Claude API
- **Purpose:** AI-powered MTO extraction
- **Integration:** REST API with retry logic
- **Rate Limits:** 1000 requests/minute
- **Fallback:** Queue for retry on failure

#### SendGrid Email
- **Purpose:** Transactional emails, RFQ distribution
- **Integration:** SDK with template system
- **Rate Limits:** 100 emails/second
- **Fallback:** SMTP direct send

#### Gmail API
- **Purpose:** Invoice import from emails
- **Integration:** OAuth 2.0 with refresh tokens
- **Rate Limits:** 250 quota units/user/second

#### Neon PostgreSQL
- **Purpose:** Primary data store
- **Integration:** Connection pooling via pg
- **Limits:** 100 concurrent connections
- **Backup:** Automated daily snapshots

## Performance Considerations

### Current Bottlenecks
1. Synchronous AI processing (30-60s per drawing)
2. No caching layer for repeated queries
3. Large PDF processing blocks event loop
4. Database queries not optimized (missing indexes)

### Optimization Strategies
1. Implement Redis caching
2. Add message queue for async processing
3. Database query optimization
4. CDN for static assets
5. Horizontal scaling preparation

## Deployment Architecture

### Current State (Monolithic)
```
Single Node.js Process → Single PostgreSQL Instance
```

### Target State (Microservices)
```
Load Balancer → Multiple Service Instances → 
Database Cluster → Cache Layer → Message Queue
```

## Monitoring & Observability

### Metrics to Track
- **Application:** Response time, error rate, throughput
- **Database:** Query performance, connection pool
- **AI Services:** Processing time, accuracy, costs
- **Business:** Jobs created, RFQs sent, costs tracked

### Logging Strategy
- **Structured Logging:** JSON format with correlation IDs
- **Log Levels:** ERROR, WARN, INFO, DEBUG
- **Retention:** 30 days hot, 1 year cold storage

## Disaster Recovery

### Backup Strategy
- **Database:** Daily automated backups, 30-day retention
- **Files:** Object storage with versioning
- **Code:** Git with tagged releases

### Recovery Procedures
- **RTO Target:** 4 hours
- **RPO Target:** 1 hour
- **Rollback:** Blue-green deployment ready

## Future Architecture (Wave 4)

### Physical Integration Layer
```
PLC/SCADA → OPC-UA → IoT Gateway → MQTT Broker → 
Time-Series DB → Real-Time Processing → Dashboards
```

### Machine Learning Pipeline
```
Historical Data → Feature Engineering → Model Training → 
Deployment → Inference API → Production Optimization
```

## Technology Stack

### Backend
- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL (Neon)
- **Authentication:** Passport.js + bcrypt

### Frontend
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS
- **Components:** Radix UI
- **State:** TanStack Query v5
- **Routing:** Wouter
- **Charts:** Chart.js, Recharts

### DevOps
- **Build:** Vite + ESBuild
- **Hosting:** Replit
- **Monitoring:** Pending (DataDog planned)
- **CI/CD:** Pending (GitHub Actions planned)

## Architecture Decision Records

### ADR-001: Zero Mock Data Policy
**Date:** October 2025  
**Decision:** No mock data in production paths  
**Rationale:** Fortune 50 data integrity requirements  

### ADR-002: Microservice Architecture
**Date:** September 2025  
**Decision:** 7 core services with clear boundaries  
**Rationale:** Scalability and maintainability  

### ADR-003: AI-First Estimation
**Date:** August 2025  
**Decision:** Use Claude 3.5 for MTO extraction  
**Rationale:** 50% time reduction, 15-20% accuracy improvement  

### ADR-004: Database Sequences
**Date:** October 2025  
**Decision:** Use DB sequences for all IDs  
**Rationale:** Eliminate random generation, ensure uniqueness  

---
*Architecture Documentation v1.0*  
*Last Updated: October 22, 2025*