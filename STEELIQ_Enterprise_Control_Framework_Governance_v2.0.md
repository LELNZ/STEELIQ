STEELIQ Enterprise Control Framework Governance v2.0 

Document Classification: Internal Control Framework
Effective Date: November 28, 2025
Review Cycle: Quarterly
Owner: Architecture Review Board (ARB)
Compliance Standards & Reference Frameworks: SOX Sections 302/404, TOGAF 10, COBIT 2024, IT General Controls (ITGC), NIST CSF, ISO/IEC 27001 (reference alignment)

AI / AUTOMATION RULE:
This document is READ-ONLY for all AI agents and automated tools.
They may reference it, but may not edit, truncate, or regenerate it without explicit ARB-approved change and human instruction.

-------------------------------------------------------------------------------
1. Executive Summary
-------------------------------------------------------------------------------

This document establishes the mandatory governance framework for all STEELIQ development and operational activities. Every code change, feature deployment, infrastructure modification, and production operation MUST comply with the controls defined herein. Non-compliance results in automatic deployment blocking via the pre-flight checklist and governance APIs.

Core objectives:
- Achieve control rigor comparable to large global enterprises (Fortune 50 parity).
- Provide auditable evidence for SOX 302/404 and ITGC testing.
- Embed TOGAF, COBIT, and SDLC discipline directly into the platform.
- Make governance programmatic via manifests and automated checks.

Core principles:
1) No Mock Data Policy – Production paths contain only authentic, traceable data.
2) Immutable Audit Trails – SHA-256 hash chains for all financial and time records.
3) Dual Authorization – Critical operations require two-party approval.
4) Pre-Flight Validation – All deployments must pass automated control gates.
5) Defense in Depth – Multiple layers of preventative and detective controls.
6) Evidence by Design – Every control produces verifiable evidence.

-------------------------------------------------------------------------------
2. Scope & Applicability
-------------------------------------------------------------------------------

This framework applies to:
- All STEELIQ code repositories and services (client, server, jobs, integrations).
- All environments (dev, test, staging, UAT, production, DR).
- All data processing involving financial, payroll, time, procurement, GPS, or personally identifiable information.
- All external integrations: AI providers, email, payroll, messaging, storage, identity providers.

No feature may be deployed to staging, UAT, or production without:
- A governance-compliant manifest.
- A passing pre-flight check.
- Required approvals per the RACI and change management processes.

-------------------------------------------------------------------------------
3. TOGAF Architecture Governance
-------------------------------------------------------------------------------

3.1 Architecture Development Method (ADM) Phases

Every feature MUST declare its current ADM phase in its manifest:

- preliminary – Framework and principles; requires architecture vision document.
- vision – High-level scope and stakeholders; requires stakeholder approval.
- business – Business process mapping; requires process flows.
- information – Data and application design; requires schema definitions.
- technology – Infrastructure design; requires tech stack approval.
- opportunities – Implementation options; requires resource and benefit case.
- migration – Transition roadmap; requires rollback procedures.
- governance – Implementation governance; requires control validation.
- change – Architecture change management; requires approved change request.

Enforcement: Invalid or missing ADM phase = DEPLOYMENT BLOCKED.

3.2 Architecture Review Board (ARB)

The ARB provides oversight and approval for significant architectural decisions.

Example manifest block:

{
  "arbApproval": {
    "required": true,
    "approvalLevel": "major|minor|advisory",
    "quorum": 3,
    "votingMembers": ["Enterprise Architect", "Security Lead", "Operations Lead"]
  }
}

Approval levels:
- Major: new services, schema changes, security modifications (3 votes).
- Minor: component updates, non-breaking UI/UX changes (2 votes).
- Advisory: documentation, refactoring (1 vote).

3.3 Architecture Contracts

Each feature defines an architecture contract describing scope, dependencies, and minimum service levels:

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

-------------------------------------------------------------------------------
4. COBIT 2024 Control Objectives
-------------------------------------------------------------------------------

4.1 Governance Domains

All features must align with COBIT domains:

- EDM (Evaluate, Direct, Monitor) – Strategic alignment and governance.
- APO (Align, Plan, Organize) – Architecture, planning, and standards.
- BAI (Build, Acquire, Implement) – Development and delivery.
- DSS (Deliver, Service, Support) – Operations and support.
- MEA (Monitor, Evaluate, Assess) – Monitoring, compliance, and performance.

4.2 Maturity Model (0–5)

- 0 Incomplete – Process not implemented.
- 1 Initial – Ad-hoc, reactive.
- 2 Managed – Planned and tracked.
- 3 Defined – Standardized, documented.
- 4 Quantitative – Measured and analyzed.
- 5 Optimizing – Continuous improvement.

Enforcement:
- Maturity gap > 1 level vs target = DEPLOYMENT BLOCKED.
- Maturity gap ≤ 1 level = Warning.
- No gap = Pass.

4.3 Required COBIT Objectives (example)

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

4.4 KPI / KGI Tracking

{
  "kpis": [
    {"id": "KPI-001", "name": "Deployment Success Rate", "target": 99.5, "unit": "percent"},
    {"id": "KPI-002", "name": "Mean Time to Recovery", "target": 15, "unit": "minutes"},
    {"id": "KPI-003", "name": "Control Effectiveness", "target": 95, "unit": "percent"}
  ]
}

-------------------------------------------------------------------------------
5. SOX Compliance & IT General Controls (ITGC)
-------------------------------------------------------------------------------

5.1 ITGC Configuration

All features MUST enable these ITGC controls. Key names are canonical and must match exactly:

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

Any ITGC control set to false for a production-bound feature = DEPLOYMENT BLOCKED.

5.2 Segregation of Duties (SoD)

SoD rules prevent conflicts of interest and fraud.

{
  "sodRequirements": [
    "Developer cannot approve own code",
    "Requestor cannot be sole approver",
    "Admin cannot modify own permissions",
    "Payroll processor cannot approve own time"
  ]
}

5.3 Audit Trail Requirements

All financial, payroll, time, and procurement records must be auditable and tamper-evident.

{
  "auditTrailRequirements": [
    "SHA-256 hash chain integrity",
    "Previous hash linking",
    "Immutable record storage",
    "User action attribution",
    "Timestamp precision to millisecond"
  ]
}

Minimum audit fields include:
- audit_hash (current record hash)
- previous_audit_hash (previous record hash)
- created_by, modified_by
- created_at, updated_at (with timezone)

-------------------------------------------------------------------------------
6. Deployment Gates & Rollback
-------------------------------------------------------------------------------

6.1 Pre-Deployment Gates

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

6.2 Post-Deployment Gates

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

6.3 Rollback Validation

{
  "rollbackValidation": {
    "procedureDocumented": true,
    "previousVersionRetained": true,
    "maxRollbackTime": 300,
    "rollbackTested": true
  }
}

Any missing or false rollback flag = DEPLOYMENT BLOCKED.

-------------------------------------------------------------------------------
7. RACI Matrix
-------------------------------------------------------------------------------

Each feature must define RACI entries for key activities. Example structure:

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

Validation rules:
- Exactly one Accountable per activity.
- At least one Responsible per activity.
- Security-critical activities must include Security as Responsible or Consulted.

-------------------------------------------------------------------------------
8. Manifest File Governance
-------------------------------------------------------------------------------

Every feature MUST have a manifest file at:

server/manifests/{feature-name}.manifest.json

Example schema:

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

-------------------------------------------------------------------------------
9. Pre-Flight Check API
-------------------------------------------------------------------------------

9.1 Endpoints

- GET /api/system/pre-flight-check?feature={name} – Run checks for a specific feature.
- GET /api/system/pre-flight-check/all – Run checks for all features.
- GET /api/governance/adm-phase – Current ADM phases.
- GET /api/governance/maturity-assessment – COBIT maturity report.
- GET /api/governance/architecture-board/reviews – ARB review queue.
- GET /api/governance/deployment-gates/status – Gate status per feature.

9.2 Response Format

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

-------------------------------------------------------------------------------
10. Blocking & Warning Conditions
-------------------------------------------------------------------------------

10.1 Governance Blocking Conditions (examples)

- togaf_adm_phase – Invalid/missing TOGAF phase → BLOCKED.
- sox_itgc – Any ITGC control set to false → BLOCKED.
- cobit_maturity – Average maturity gap > 1 level → BLOCKED.
- rollback_validation – procedureDocumented, previousVersionRetained, or rollbackTested = false → BLOCKED.

10.2 Infrastructure Blocking Conditions (examples)

- table_exists_{name} – Required database table missing → BLOCKED.
- columns_{table} – Required columns missing → BLOCKED.
- audit_trail_{table} – Missing audit_hash or previous_audit_hash → BLOCKED.
- secret_exists_{name} – Required secret missing → BLOCKED.
- route_exists_{path} – Required API route not registered → BLOCKED.
- service_exists_{name} – Required service file missing → BLOCKED.

10.3 RBAC Blocking Conditions

- rbac_min_role – Invalid minimum role specified → BLOCKED.
- sod_violation – Segregation of Duties conflict detected → BLOCKED.

10.4 Warning Conditions (examples)

- togaf_architecture_contract – Missing stakeholders or deliverables → WARNING.
- togaf_arb_approval – ARB approval required → WARNING.
- cobit_maturity – Gap ≤ 1 level → WARNING.
- raci_matrix – Missing some consulted/informed parties → WARNING.

10.5 Enforcement Logic (example)

overallStatus =
  blockingIssues.length > 0 ? "fail" :
  warnings.length > 0 ? "warn" :
  "pass";

canDeploy = blockingIssues.length == 0;

-------------------------------------------------------------------------------
11. Compliance Attestation
-------------------------------------------------------------------------------

Before any production deployment, the system generates a control attestation:

STEELIQ Control Framework Attestation
=====================================
Feature: {feature_name}
Version: {version}
Date: {timestamp}
Environment: {environment}

Controls Validated:
- TOGAF ADM Phase: {phase}
- COBIT Objectives: {count} at target maturity
- SOX ITGC: All controls enabled
- Deployment Gates: {passed}/{total} passed
- Rollback Tested: {yes/no}
- Audit Trail: Hash chain integrity verified

Approvals:
- Code Review: {reviewer}
- Security Review: {security_lead}
- Architecture Review: {architect}

canDeploy: {true/false}

-------------------------------------------------------------------------------
12. Exception / Dispensation Process
-------------------------------------------------------------------------------

When a control cannot be fully met, a dispensation must be requested and approved.

Dispensation request format:

{
  "dispensationType": "temporary|permanent",
  "controlId": "control_identifier",
  "justification": "Business justification",
  "mitigatingControls": ["Alternative controls in place"],
  "expirationDate": "2025-12-31",
  "approvers": ["Security Lead", "Compliance Officer"]
}

Rules:
- Temporary dispensations: maximum 90 days, then re-evaluated.
- All dispensations require risk assessment and mitigating controls.
- Two-party approval minimum: Security + Compliance (or delegate).

-------------------------------------------------------------------------------
13. Security & Data Protection Standards
-------------------------------------------------------------------------------

13.1 Data Classification

Classes:
- Restricted – Payroll, GPS, bank data; AES-256 at rest, TLS in transit; 7-year retention.
- Confidential – Jobs, RFQs, POs, invoices; AES-256 at rest, TLS in transit; 5-year retention.
- Internal – Materials, suppliers, configs; TLS in transit; 2-year retention.
- Public – Non-sensitive information; TLS where applicable.

13.2 Data Handling Rules

- PII must be masked or tokenised in logs.
- No plaintext secrets in code or configuration files.
- Access to Restricted data requires MFA and role-based entitlements.
- Data exports must be logged with user, purpose, and timestamp.

13.3 Secure Coding Requirements

- All external inputs validated (Zod or equivalent).
- No dynamic SQL; use parameterised queries or ORM.
- No console logging of secrets or PII.
- Use approved cryptographic libraries and algorithms.
- Dependencies regularly scanned (e.g. npm audit --production).

-------------------------------------------------------------------------------
14. Business Continuity & Disaster Recovery (BCP/DRP)
-------------------------------------------------------------------------------

Targets:
- RTO (Recovery Time Objective): 4 hours.
- RPO (Recovery Point Objective): 15 minutes.

Requirements:
- Hourly incremental and daily full backups for critical data.
- Backups stored in a separate fault domain or region.
- DR environment defined for production workloads.
- Annual DR test including failover and failback scenarios.
- BCP runbooks covering loss of primary region, key vendors, or critical services.

-------------------------------------------------------------------------------
15. Operational Monitoring, SLOs & Incident Response
-------------------------------------------------------------------------------

15.1 SLOs (Service Level Objectives)

Examples:
- API availability: 99.9% monthly.
- P95 latency: < 200ms.
- Error rate: < 0.1% of requests.
- Job queue delay: < 1 minute for high-priority jobs.

15.2 Incident Severity Levels

- SEV1 – Complete outage or financial impact; 15-min response target.
- SEV2 – Major degradation; 30-min response target.
- SEV3 – Moderate impact; 4-hour response target.
- SEV4 – Minor or cosmetic; 72-hour response target.

15.3 Incident Response Requirements

- On-call engineer and Security engaged for SEV1/SEV2.
- Incident tickets must record timeline, impact, root cause, and remediation.
- RCA (root cause analysis) required within 48 hours of SEV1 closure.
- Standard RCA format: incident summary, containment, mitigation, prevention, and lessons learned.

-------------------------------------------------------------------------------
16. CI/CD & Software Supply Chain Security
-------------------------------------------------------------------------------

Minimum CI/CD checks for production-bound changes:
- Static analysis (SAST) on application code.
- Dependency vulnerability scanning (SCA).
- Unit and integration test suites passing.
- Enforcement of code review by at least one peer (two for sensitive changes).
- Signed artifacts for production deployments where supported.

Any failure in mandatory CI/CD checks = deployment blocked until resolved or a formally approved dispensation exists.

-------------------------------------------------------------------------------
17. Observability & Telemetry Standards
-------------------------------------------------------------------------------

Logs:
- Use structured logging (JSON) with standard fields: timestamp, level, requestId, userId (if available), action, resource, outcome, latencyMs.
- Log levels: DEBUG, INFO, WARN, ERROR; DEBUG disabled in production by default.
- No logging of full secrets or full PII values.

Metrics:
- Use RED (Rate, Errors, Duration) for services.
- Use USE (Utilisation, Saturation, Errors) for infrastructure components.

Tracing:
- Use correlation IDs propagated through services (traceId, spanId).
- Capture traces for high-latency requests and error conditions.

Dashboards:
- Production dashboards must exist for each critical service showing availability, latency, error rates, and key domain metrics (e.g. jobs processed, POs issued).

-------------------------------------------------------------------------------
18. Document References, Versioning & Glossary
-------------------------------------------------------------------------------

18.1 Document References (examples)

- Manifest Files – server/manifests/*.manifest.json
- Pre-Flight Service – server/utils/preFlightChecklist.ts
- Governance Service – server/utils/enterpriseGovernance.ts
- Control Framework Routes – server/routes/controlFrameworkRoutes.ts
- Database Schema – shared/schema.ts
- Project Overview – replit.md

18.2 Version History (example)

- 2.0.1 – 2025-11-28 – Added BCP/DR, SLO, security and observability sections; aligned to Fortune 50-style controls.
- 2.0.0 – 2025-11-28 – Initial full TOGAF/COBIT/SOX integration with enforcement.
- 1.0.0 – 2025-11-01 – Initial control framework for STEELIQ.

18.3 Glossary (selected terms)

- ADM – Architecture Development Method (TOGAF).
- ARB – Architecture Review Board.
- COBIT – Control Objectives for Information and Related Technologies.
- ITGC – IT General Controls.
- RACI – Responsible, Accountable, Consulted, Informed.
- RTO – Recovery Time Objective.
- RPO – Recovery Point Objective.
- SLO – Service Level Objective.
- SoD – Segregation of Duties.
- SDLC – Software Development Life Cycle.

-------------------------------------------------------------------------------
END OF DOCUMENT
-------------------------------------------------------------------------------

