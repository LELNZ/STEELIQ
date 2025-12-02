# Time & Payroll COBIT Maturity Roadmap

**Document Version:** 1.0  
**Date:** December 2, 2025  
**Owner:** Adam Green, Lateral Engineering Limited  
**Status:** Approved

---

## Executive Summary

Time & Payroll is currently at **COBIT Level 3 (Defined)** across all four key governance objectives:
- APO12 (Managed Risk)
- BAI06 (Managed IT Changes)
- DSS05 (Managed Security Services)
- MEA02 (Managed System of Internal Control)

**Target:** Level 4 (Measured & Managed) will be achieved once metrics, dashboards, automated alerting, and regular review cycles are fully operational.

Level 3 is acceptable for initial deployment. The roadmap below details what is currently in place and what additional capabilities are required to reach Level 4.

---

## Current State: Level 3 (Defined)

At Level 3, processes are:
- Documented and standardized
- Consistently applied across the organization
- Formally approved and communicated

### What We Have Today

| Control Area | Level 3 Implementation |
|--------------|------------------------|
| Hash-Chain Audit Trails | SHA-256 hash chains on time_entries, timesheets, payroll_periods |
| Separation of Duties (SoD) | Dual-auth for payroll period locking, GPS overrides, payroll export |
| RBAC | Role-based access (manager+ for critical operations) |
| Change Management | Pre-flight checks, feature manifests, ARB approval process |
| Security Services | Session-based auth, bcrypt passwords, 2FA-ready architecture |

---

## Target State: Level 4 (Measured & Managed)

At Level 4, processes are:
- Monitored and measured against defined KPIs
- Subject to automated alerting and escalation
- Reviewed periodically with documented outcomes
- Continuously improved based on metrics

---

## Objective-by-Objective Roadmap

### APO12 – Managed Risk

**Current Level 3 Controls:**
- Risk assessment documented in governance framework
- SoD controls prevent single-user abuse
- GPS anti-spoofing with fraud scoring
- Hash-chain tamper detection

**Level 4 Requirements:**
- [ ] Real-time risk dashboard showing:
  - Dual-auth request volume and approval/rejection rates
  - Fraud score distribution and trends
  - GPS validation failure rates
- [ ] Automated alerts when risk thresholds exceeded
- [ ] Monthly risk review meetings with documented minutes
- [ ] Trend analysis comparing risk metrics quarter-over-quarter

**Concrete Tasks:**
1. Add dashboard widget for dual-auth request failure rate
2. Configure alerting when fraud score exceeds threshold (e.g., >70)
3. Create monthly risk report template
4. Schedule quarterly risk review calendar events

---

### BAI06 – Managed IT Changes

**Current Level 3 Controls:**
- Feature manifests define dependencies and governance requirements
- Pre-flight checklist validates deployment readiness
- ARB approval required for significant changes
- Database schema changes tracked via Drizzle ORM

**Level 4 Requirements:**
- [ ] Change success rate KPI (target: 99%)
- [ ] Mean time to deploy (MTTD) tracking
- [ ] Rollback frequency monitoring
- [ ] Change advisory board (CAB) meeting metrics

**Concrete Tasks:**
1. Add change success rate calculation to pre-flight report
2. Track deployment timestamps and calculate MTTD
3. Log rollback events with reasons
4. Dashboard for CAB approval turnaround time

---

### DSS05 – Managed Security Services

**Current Level 3 Controls:**
- Session-based authentication with secure cookies
- Password hashing with bcrypt
- RBAC enforcement on all critical routes
- Audit logging of security-relevant events

**Level 4 Requirements:**
- [ ] Security event monitoring dashboard
- [ ] Failed login attempt tracking and alerting
- [ ] Session anomaly detection (unusual locations, devices)
- [ ] Periodic access review reports

**Concrete Tasks:**
1. Add failed login counter with threshold alerting
2. Create security events dashboard (login patterns, session durations)
3. Implement access review report generator
4. Configure alerting for brute-force patterns

---

### MEA02 – Managed System of Internal Control

**Current Level 3 Controls:**
- SOX Section 404 control documentation
- ITGC controls enabled (access, change, operations, SDLC)
- Audit trail requirements defined and enforced
- SoD matrix documented in manifest

**Level 4 Requirements:**
- [ ] Control effectiveness testing results dashboard
- [ ] Exception tracking with remediation timelines
- [ ] Control self-assessment (CSA) reports
- [ ] External audit readiness reports

**Concrete Tasks:**
1. Create control testing schedule and results tracker
2. Add exception log with remediation status tracking
3. Generate CSA report template for Time & Payroll
4. Pre-audit checklist for external SOX audits

---

## KPIs for Level 4 Monitoring

| KPI ID | Name | Target | Unit | Status |
|--------|------|--------|------|--------|
| kpi-timesheet-accuracy | Timesheet Submission Accuracy | 98 | percent | Defined |
| kpi-approval-time | Timesheet Approval Time | 24 | hours | Defined |
| kpi-payroll-sync | Payroll Sync Success Rate | 99.9 | percent | Defined |
| kpi-gps-compliance | GPS Validation Compliance | 100 | percent | Defined |
| kpi-dual-auth-success | Dual-Auth Approval Rate | 95 | percent | Planned |
| kpi-fraud-score-avg | Average Fraud Score | <30 | score | Planned |
| kpi-change-success | Change Success Rate | 99 | percent | Planned |

---

## Implementation Timeline

| Phase | Timeline | Focus Areas |
|-------|----------|-------------|
| Phase 1 | Q1 2026 | Dashboards for APO12 (risk) and DSS05 (security) |
| Phase 2 | Q2 2026 | BAI06 change metrics and MEA02 control testing |
| Phase 3 | Q3 2026 | Full Level 4 assessment and certification |

---

## References

- **Governance Framework:** `STEELIQ_Enterprise_Control_Framework_Governance_v2.0.md`
- **Feature Manifest:** `server/manifests/time-payroll-core.manifest.json`
- **Pre-Flight Checklist:** `server/utils/preFlightChecklist.ts`

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Platform Owner | Adam Green | 2025-12-02 | Approved |
| ARB Representative | - | Pending | - |
