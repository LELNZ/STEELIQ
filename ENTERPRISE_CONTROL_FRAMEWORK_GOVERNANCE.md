# STEELIQ Enterprise Control Framework Governance v2.0

**Document Classification:** Internal Control Framework  
**Effective Date:** November 28, 2025  
**Review Cycle:** Quarterly  
**Owner:** Architecture Review Board  
**Compliance Standards:** SOX Section 302/404, TOGAF 10, COBIT 2024

---

## 1. Executive Summary

This document establishes the mandatory governance framework for all STEELIQ development activities. Every code change, feature deployment, and system modification MUST comply with the controls defined herein. Non-compliance results in automatic deployment blocking.

### 1.1 Core Principles

1. **No Mock Data Policy** - Production paths contain only authentic, traceable data
2. **Immutable Audit Trails** - SHA-256 hash chains for all financial/time records
3. **Dual Authorization** - Critical operations require two-party approval
4. **Pre-Flight Validation** - All deployments must pass automated control gates
5. **Fortune 50 Parity** - Controls match Workday, ADP, SAP SuccessFactors standards

---

## 2. TOGAF Architecture Governance

### 2.1 Architecture Development Method (ADM) Phases

Every feature MUST declare its current ADM phase in the manifest file:

| Phase | ID | Description | Gate Requirements |
|-------|-----|-------------|-------------------|
| Preliminary | `preliminary` | Framework and principles | Architecture vision document |
| Architecture Vision | `vision` | High-level scope and stakeholders | Stakeholder approval |
| Business Architecture | `business` | Business process mapping | Process flows documented |
| Information Systems | `information` | Data and application design | Schema definitions |
| Technology Architecture | `technology` | Infrastructure planning | Tech stack approved |
| Opportunities & Solutions | `opportunities` | Implementation planning | Resource allocation |
| Migration Planning | `migration` | Transition roadmap | Rollback procedures |
| Implementation Governance | `governance` | Oversight and compliance | Control validation |
| Architecture Change Management | `change` | Ongoing modifications | Change request approved |

**Enforcement:** Invalid ADM phase = DEPLOYMENT BLOCKED

### 2.2 Architecture Review Board (ARB)

The ARB approves all significant architectural decisions:

```json
{
  "arbApproval": {
    "required": true,
    "approvalLevel": "major|minor|advisory",
    "quorum": 3,
    "votingMembers": ["Enterprise Architect", "Security Lead", "Operations Lead"]
  }
}
```

**Approval Levels:**
- **Major:** New services, schema changes, security modifications (requires 3 votes)
- **Minor:** Component updates, UI changes (requires 2 votes)
- **Advisory:** Documentation, refactoring (requires 1 vote)

### 2.3 Architecture Contracts

Every feature must define an Architecture Contract:

```json
{
  "architectureContract": {
    "contractType": "service|integration|data",
    "stakeholders": ["Product", "Engineering", "Security", "Compliance"],
    "deliverables": ["API specification", "Data model", "Security review"],
    "slaMetrics": {
      "availability": 99.9,
      "responseTime": 200,
      "errorRate": 0.1
    },
    "complianceCriteria": ["SOX", "GDPR", "SOC2"]
  }
}
```

---

## 3. COBIT 2024 Control Objectives

### 3.1 Governance Domains

All features must address these COBIT domains:

| Domain | ID | Focus Area |
|--------|-----|------------|
| Evaluate, Direct, Monitor | EDM | Strategic alignment |
| Align, Plan, Organize | APO | Architecture and standards |
| Build, Acquire, Implement | BAI | Development and deployment |
| Deliver, Service, Support | DSS | Operations and incidents |
| Monitor, Evaluate, Assess | MEA | Performance and compliance |

### 3.2 Maturity Model (0-5 Scale)

Each control objective must declare target and current maturity:

| Level | Description | Characteristics |
|-------|-------------|-----------------|
| 0 | Incomplete | Process not implemented |
| 1 | Initial | Ad-hoc, reactive |
| 2 | Managed | Planned and tracked |
| 3 | Defined | Standardized, documented |
| 4 | Quantitative | Measured and analyzed |
| 5 | Optimizing | Continuous improvement |

**Enforcement Rules:**
- Maturity gap > 1 level = DEPLOYMENT BLOCKED
- Maturity gap ≤ 1 level = Warning issued
- No gap = Pass

### 3.3 Required Control Objectives

```json
{
  "cobit2024": {
    "objectives": [
      {"id": "EDM01", "name": "Governance Framework", "targetLevel": 4, "currentLevel": 4},
      {"id": "APO01", "name": "IT Management Framework", "targetLevel": 4, "currentLevel": 4},
      {"id": "APO12", "name": "Managed Risk", "targetLevel": 4, "currentLevel": 4},
      {"id": "BAI06", "name": "Managed IT Changes", "targetLevel": 4, "currentLevel": 4},
      {"id": "DSS05", "name": "Managed Security Services", "targetLevel": 4, "currentLevel": 4},
      {"id": "MEA02", "name": "Managed System of Internal Control", "targetLevel": 4, "currentLevel": 4}
    ]
  }
}
```

### 3.4 KPI/KGI Tracking

Define measurable indicators for each feature:

```json
{
  "kpis": [
    {"id": "KPI-001", "name": "Deployment Success Rate", "target": 99.5, "unit": "percent"},
    {"id": "KPI-002", "name": "Mean Time to Recovery", "target": 15, "unit": "minutes"},
    {"id": "KPI-003", "name": "Control Effectiveness", "target": 95, "unit": "percent"}
  ]
}
```

---

## 4. SOX Compliance Controls

### 4.1 IT General Controls (ITGC)

All features MUST enable these controls. The key names MUST match exactly as shown:

```json
{
  "soxControls": {
    "itgc": {
      "accessControls": true,
      "changeManagement": true,
      "computerOperations": true,
      "programDevelopment": true,
      "sdlc": true,
      "auditTrail": true,
      "encryption": true,
      "backupRecovery": true
    }
  }
}
```

**ITGC Control Definitions:**
| Key | Control Area | SOX Requirement |
|-----|--------------|-----------------|
| `accessControls` | User access management, authentication, authorization | Section 404 - Access to programs and data |
| `changeManagement` | Change request, approval, testing, deployment | Section 404 - Program changes |
| `computerOperations` | Job scheduling, monitoring, incident response | Section 404 - Computer operations |
| `programDevelopment` | SDLC, code review, testing standards | Section 404 - Program development |
| `sdlc` | Software development lifecycle compliance | Section 404 - System development |
| `auditTrail` | Logging, monitoring, evidence retention | Section 302/404 - Audit evidence |
| `encryption` | Data at rest, data in transit encryption | Section 404 - Data protection |
| `backupRecovery` | Backup, disaster recovery, business continuity | Section 404 - System availability |

**Enforcement:** ANY ITGC control set to `false` = DEPLOYMENT BLOCKED

### 4.2 Segregation of Duties (SoD)

Define incompatible role combinations:

```json
{
  "sodRequirements": [
    "Developer cannot approve own code",
    "Requestor cannot be sole approver",
    "Admin cannot modify own permissions",
    "Payroll processor cannot approve own time"
  ]
}
```

### 4.3 Audit Trail Requirements

All financial and time-sensitive records require:

```json
{
  "auditTrailRequirements": [
    "SHA-256 hash chain integrity",
    "Previous hash linking",
    "Immutable record storage",
    "User action attribution",
    "Timestamp precision to millisecond"
  ]
}
```

**Database Schema Requirements:**
- `audit_hash VARCHAR(64)` - Current record hash
- `previous_audit_hash VARCHAR(64)` - Link to previous record
- `created_by INTEGER` - User who created
- `modified_by INTEGER` - User who last modified
- `created_at TIMESTAMP` - Creation timestamp
- `updated_at TIMESTAMP` - Last modification timestamp

---

## 5. Deployment Gates

### 5.1 Pre-Deployment Gates

```json
{
  "preDeployment": {
    "gates": [
      {"name": "Unit Tests", "type": "automated", "blocking": true},
      {"name": "Integration Tests", "type": "automated", "blocking": true},
      {"name": "Security Scan", "type": "automated", "blocking": true},
      {"name": "Code Review", "type": "manual", "blocking": true},
      {"name": "Pre-Flight Check", "type": "automated", "blocking": true}
    ],
    "timeout": 300,
    "samplingInterval": 10
  }
}
```

### 5.2 Post-Deployment Gates

```json
{
  "postDeployment": {
    "gates": [
      {"name": "Health Check", "type": "automated", "blocking": true},
      {"name": "Error Rate Monitor", "type": "automated", "blocking": true},
      {"name": "Performance Baseline", "type": "automated", "blocking": false},
      {"name": "User Acceptance", "type": "manual", "blocking": false}
    ],
    "timeout": 600,
    "samplingInterval": 30
  }
}
```

### 5.3 Rollback Validation

**MANDATORY for all deployments:**

```json
{
  "rollbackValidation": {
    "procedureDocumented": true,
    "previousVersionRetained": true,
    "maxRollbackTime": 300,
    "rollbackTested": true
  }
}
```

**Enforcement:** Incomplete rollback validation = DEPLOYMENT BLOCKED

---

## 6. RACI Matrix

Every feature must define accountability for ALL mandatory activities:

### 6.1 Mandatory Activities

```json
{
  "raci": [
    {
      "activity": "Architecture Design",
      "responsible": ["Lead Developer"],
      "accountable": "Enterprise Architect",
      "consulted": ["Security", "Operations"],
      "informed": ["Product Manager"]
    },
    {
      "activity": "Code Implementation",
      "responsible": ["Development Team"],
      "accountable": "Tech Lead",
      "consulted": ["QA"],
      "informed": ["Product Manager"]
    },
    {
      "activity": "Security Review",
      "responsible": ["Security Team"],
      "accountable": "Security Lead",
      "consulted": ["Development"],
      "informed": ["Compliance"]
    },
    {
      "activity": "Security Operations",
      "responsible": ["Security Team", "DevOps"],
      "accountable": "Security Lead",
      "consulted": ["Development", "Operations"],
      "informed": ["Compliance", "Executive"]
    },
    {
      "activity": "Incident Response",
      "responsible": ["On-Call Engineer", "Security Team"],
      "accountable": "Operations Lead",
      "consulted": ["Development", "Security"],
      "informed": ["Executive", "Compliance", "Legal"]
    },
    {
      "activity": "Rollback Validation",
      "responsible": ["DevOps", "QA"],
      "accountable": "Operations Lead",
      "consulted": ["Development"],
      "informed": ["Product Manager", "Stakeholders"]
    },
    {
      "activity": "Deployment Approval",
      "responsible": ["DevOps"],
      "accountable": "Operations Lead",
      "consulted": ["Development", "QA"],
      "informed": ["Stakeholders"]
    },
    {
      "activity": "Audit Evidence Collection",
      "responsible": ["Compliance Team"],
      "accountable": "Compliance Officer",
      "consulted": ["Development", "Security"],
      "informed": ["Executive", "External Auditors"]
    },
    {
      "activity": "Data Retention Management",
      "responsible": ["Data Governance Team"],
      "accountable": "Data Protection Officer",
      "consulted": ["Legal", "Compliance"],
      "informed": ["Development", "Operations"]
    }
  ]
}
```

### 6.2 RACI Validation Rules

- Every activity MUST have exactly ONE Accountable party
- Every activity MUST have at least ONE Responsible party
- Security-critical activities require Security Team in Consulted or Responsible
- Compliance-impacting activities require Compliance in Informed

---

## 7. Manifest File Structure

Every feature MUST have a manifest file at `server/manifests/{feature-name}.manifest.json`:

```json
{
  "feature": "Feature Name",
  "version": "1.0.0",
  "description": "Feature description",
  "dependencies": {
    "tables": ["required_tables"],
    "tableSchemas": {},
    "services": ["required_services"],
    "routes": ["/api/routes"],
    "secrets": ["REQUIRED_SECRETS"],
    "envVars": ["ENV_VARS"],
    "rbacRequirements": {
      "minRole": "user",
      "adminRoutes": ["/api/admin/*"]
    }
  },
  "auditFields": ["auditHash", "previousAuditHash"],
  "preFlightChecks": [
    "database",
    "schema",
    "columns",
    "services",
    "routes",
    "secrets",
    "audit",
    "governance"
  ],
  "governance": {
    "togaf": {},
    "cobit2024": {},
    "raci": [],
    "soxControls": {},
    "deploymentGates": {}
  }
}
```

---

## 8. Pre-Flight Check API

### 8.1 Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/system/pre-flight-check?feature={name}` | GET | Run checks for specific feature |
| `/api/system/pre-flight-check/all` | GET | Run checks for all features |
| `/api/governance/adm-phase` | GET | Get current ADM phases |
| `/api/governance/maturity-assessment` | GET | COBIT maturity report |
| `/api/governance/architecture-board/reviews` | GET | ARB review queue |
| `/api/governance/deployment-gates/status` | GET | Gate status |

### 8.2 Response Format

```json
{
  "feature": "wave-5.3",
  "version": "5.3.0",
  "timestamp": "2025-11-28T00:00:00Z",
  "overallStatus": "pass|warn|fail",
  "checks": [
    {
      "check": "check_name",
      "status": "pass|warn|fail",
      "message": "Human-readable message",
      "details": {}
    }
  ],
  "blockingIssues": [],
  "warnings": [],
  "canDeploy": true
}
```

---

## 9. Blocking Conditions Summary

### 9.1 Governance Blocking Conditions

| Check ID | Condition | Result | Remediation |
|----------|-----------|--------|-------------|
| `togaf_adm_phase` | Invalid/missing TOGAF ADM Phase | BLOCKED | Set valid phase: preliminary, vision, business, information, technology, opportunities, migration, governance, change |
| `sox_itgc` | ANY ITGC control set to `false` | BLOCKED | Enable all controls: accessControls, changeManagement, computerOperations, programDevelopment, sdlc, auditTrail, encryption, backupRecovery |
| `cobit_maturity` | Average maturity gap > 1 level | BLOCKED | Improve control maturity levels to within 1 of target |
| `rollback_validation` | procedureDocumented, previousVersionRetained, or rollbackTested = false | BLOCKED | Complete all rollback validation requirements |

### 9.2 Infrastructure Blocking Conditions

| Check ID | Condition | Result | Remediation |
|----------|-----------|--------|-------------|
| `table_exists_{name}` | Required database table missing | BLOCKED | Run database migration via Drizzle |
| `columns_{table}` | Required columns missing from table | BLOCKED | Update schema and run migration |
| `audit_trail_{table}` | Missing audit_hash or previous_audit_hash columns | BLOCKED | Add SOX-compliant audit columns |
| `secret_exists_{name}` | Required secret not in environment | BLOCKED | Configure secret via Replit Secrets |
| `route_exists_{path}` | Required API route not registered | BLOCKED | Register route in server/routes.ts |
| `service_exists_{name}` | Required service file missing | BLOCKED | Create service file in server/services/ |

### 9.3 RBAC Blocking Conditions

| Check ID | Condition | Result | Remediation |
|----------|-----------|--------|-------------|
| `rbac_min_role` | Invalid minimum role specified | BLOCKED | Use valid role: user, team_member, supervisor, manager, admin, super_admin, owner |
| `sod_violation` | Segregation of Duties conflict detected | BLOCKED | Reassign conflicting roles per SoD requirements |

### 9.4 Warning Conditions (Non-Blocking)

| Check ID | Condition | Result | Action |
|----------|-----------|--------|--------|
| `togaf_architecture_contract` | Contract missing stakeholders/deliverables | WARNING | Complete Architecture Contract |
| `togaf_arb_approval` | ARB approval required | WARNING | Submit for ARB review |
| `cobit_maturity` | Maturity gap ≤ 1 level | WARNING | Plan improvement roadmap |
| `raci_matrix` | Missing Accountable/Responsible parties | WARNING | Complete RACI assignments |
| `deployment_gates_pre` | No blocking pre-deployment gates | WARNING | Add blocking gates |
| `deployment_gates_post` | No blocking post-deployment gates | WARNING | Add blocking gates |

### 9.5 Enforcement Logic

```typescript
// From preFlightChecklist.ts - checkGovernanceRequirements()
const overallStatus = 
  blockingIssues.length > 0 ? 'fail' : 
  warnings.length > 0 ? 'warn' : 'pass';

const canDeploy = blockingIssues.length === 0;
```

**Deployment Decision Matrix:**
| Overall Status | Blocking Issues | Warnings | canDeploy |
|----------------|-----------------|----------|-----------|
| PASS | 0 | 0 | true |
| WARN | 0 | >0 | true |
| FAIL | >0 | any | false |

---

## 10. Compliance Attestation

Before any deployment, the following attestation is automatically generated:

```
STEELIQ Control Framework Attestation
=====================================
Feature: {feature_name}
Version: {version}
Date: {timestamp}
Environment: {environment}

Controls Validated:
- [ ] TOGAF ADM Phase: {phase}
- [ ] COBIT Objectives: {count} at target maturity
- [ ] SOX ITGC: All controls enabled
- [ ] Deployment Gates: {passed}/{total} passed
- [ ] Rollback Tested: {yes/no}
- [ ] Audit Trail: Hash chain integrity verified

Approvals:
- Code Review: {reviewer}
- Security Review: {security_lead}
- Architecture Review: {architect}

canDeploy: {true/false}
```

---

## 11. Exception Process

### 11.1 Dispensation Request

When a control cannot be met, request a dispensation:

```json
{
  "dispensationType": "temporary|permanent",
  "controlId": "control_identifier",
  "justification": "Business justification",
  "mitigatingControls": ["Alternative controls in place"],
  "expirationDate": "2025-12-31",
  "approvers": ["Security Lead", "Compliance Officer"]
}
```

### 11.2 Dispensation Approval

Dispensations require:
- Business justification
- Risk assessment
- Mitigating controls
- Expiration date (max 90 days for temporary)
- Two-party approval

---

## 12. Document References

| Document | Location |
|----------|----------|
| Manifest Files | `server/manifests/*.manifest.json` |
| Pre-Flight Service | `server/utils/preFlightChecklist.ts` |
| Governance Service | `server/utils/enterpriseGovernance.ts` |
| Control Framework Routes | `server/routes/controlFrameworkRoutes.ts` |
| Database Schema | `shared/schema.ts` |
| Project Overview | `replit.md` |

---

## 13. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0.1 | 2025-11-28 | Corrected ITGC key names to match implementation (accessControls), added RACI activities for security/incident/rollback, expanded blocking conditions table | STEELIQ Team |
| 2.0.0 | 2025-11-28 | Full TOGAF/COBIT/SOX integration with enforcement | STEELIQ Team |
| 1.0.0 | 2025-11-01 | Initial control framework | STEELIQ Team |

---

**END OF DOCUMENT**

*This document is automatically validated against the pre-flight checklist. Any modifications require Architecture Review Board approval.*
