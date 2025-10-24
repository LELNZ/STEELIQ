# STEELIQ Architecture Notes

## System Overview

STEELIQ is a comprehensive enterprise steel fabrication management system built on modern web technologies with a focus on AI-powered estimation and production optimization.

## Architecture Layers

### 1. Frontend Layer (Client)
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS + Radix UI components
- **State Management**: TanStack Query v5
- **Routing**: Wouter
- **Build**: Vite with ESBuild

### 2. API Gateway Layer
- **Framework**: Express.js on Node.js 20
- **Security**: Multi-layer middleware stack
  - Helmet.js for security headers
  - CORS with environment-based origins
  - Rate limiting per endpoint type
  - Session-based authentication
- **RBAC**: Currently in shadow mode (logs but doesn't enforce)

### 3. Business Logic Layer
- **Services Architecture**: 7 core microservices
  1. **aiEstimationService**: Claude Sonnet 4.0 integration
  2. **aiWorkflowService**: PDF/DXF processing pipeline
  3. **dxfParserService**: CAD file parsing (0.01mm precision)
  4. **jobLifecycleService**: Job state management
  5. **rfqAutomationService**: Supplier matching
  6. **productionMonitoringService**: Real-time OEE metrics
  7. **costAggregationService**: Multi-source cost analysis

### 4. Data Access Layer
- **ORM**: Drizzle ORM with TypeScript
- **Database**: PostgreSQL (Neon cloud-hosted)
- **Schema**: 95+ tables with comprehensive relationships
- **Audit**: Immutable audit trail for all transactions

### 5. External Integrations
- **AI**: Anthropic Claude API
- **Email**: SendGrid for transactional emails
- **Auth**: Google OAuth support
- **Storage**: Local file system (needs cloud migration)

## Critical Data Flows

### 1. AI Estimation Flow
```
User Upload → PDF/DXF Parser → AI Analysis → Pattern Recognition → 
MTO Generation → Job Creation → Material Assignment → Cost Calculation
```

### 2. Procurement Flow
```
Job Materials → Requisition Creation → RFQ Generation → 
Supplier Distribution → Quote Collection → PO Generation → 
Invoice Processing → Cost Aggregation
```

### 3. Production Flow
```
Job Assignment → Work Order Creation → Machine Allocation → 
Production Events → Quality Checks → Completion Tracking → 
OEE Calculation → Performance Metrics
```

## Security Architecture

### Current Implementation
- Session-based authentication with bcrypt
- Role-based permissions (29 basic permissions)
- Input validation with Zod schemas
- Rate limiting on sensitive endpoints

### Critical Gaps
1. **RBAC not enforced** - Currently logs only
2. **No 2FA** - Single factor authentication
3. **Session tokens don't rotate** - Security risk
4. **No row-level security** - All users see all data

## Performance Characteristics

### Strengths
- Sub-200ms API response times
- 10-30 second AI processing
- Efficient database queries with proper indexing

### Bottlenecks
1. **Uncached permission checks** - Database hit per request
2. **No connection pooling** - Direct DB connections
3. **Synchronous job processing** - No queue system
4. **No CDN** - Static assets served from origin

## Scalability Considerations

### Current Capacity
- Handles 100+ concurrent users
- Supports 10,000+ jobs annually
- 95+ database tables with millions of records

### Scaling Limitations
1. **Single database** - No read replicas
2. **No caching layer** - Redis needed
3. **Monolithic deployment** - Needs containerization
4. **No load balancing** - Single server instance

## Integration Points

### Existing
- Anthropic Claude API
- SendGrid Email
- Google OAuth
- PostgreSQL (Neon)

### Missing (Fortune-50 Requirements)
- CAD/CAM systems (Tekla, SDS/2)
- Banking/payment gateways
- EDI for suppliers
- Machine PLCs (SCADA/OPC-UA)
- Mobile/offline support

## Deployment Architecture

### Current
- Single Node.js process
- Replit hosting with autoscale
- Environment-based configuration
- File-based session storage

### Required for Production
- Container orchestration (Kubernetes)
- Multi-region deployment
- Blue-green deployments
- Automated rollback capability
- Comprehensive monitoring

## Module Dependencies

### Core Dependencies
- Express → Routes → Services → Database
- Frontend → API → Middleware → Business Logic
- Services → External APIs → Response Processing

### Circular Dependencies
- None identified (clean architecture)

### High-Risk Dependencies
1. **Anthropic API** - Single point of failure for AI
2. **Neon Database** - All data operations
3. **SendGrid** - Email notifications

## Recommendations

### Immediate Actions
1. Switch RBAC to enforce mode
2. Implement Redis caching
3. Add connection pooling
4. Enable 2FA authentication

### Short-term Improvements
1. Containerize application
2. Implement queue system
3. Add read replicas
4. Deploy CDN

### Long-term Strategy
1. Microservices decomposition
2. Event-driven architecture
3. Multi-region deployment
4. Complete offline support

## Compliance Status

### Fortune-50 Requirements Met
- Comprehensive audit trails ✅
- Data validation ✅
- Type safety ✅
- Structured logging ✅

### Fortune-50 Requirements Missing
- Enforced RBAC ❌
- Data segregation ❌
- 2FA authentication ❌
- Mobile support ❌
- CAD integration ❌

## Risk Assessment

### High Risk
1. Shadow mode RBAC (security breach potential)
2. No data segregation (compliance violation)
3. Missing 2FA (authentication weakness)

### Medium Risk
1. Performance degradation at scale
2. Single points of failure
3. Manual deployment process

### Low Risk
1. Documentation gaps
2. Test coverage
3. Code duplication

---

**Last Updated**: 2024-10-24
**Architecture Readiness**: 72%
**Target**: ≥95% Fortune-50 compliance