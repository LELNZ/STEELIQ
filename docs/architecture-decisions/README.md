# STEELIQ Architecture Decision Records (ADRs)

## Purpose

This directory contains Architecture Decision Records (ADRs) that document the key architectural decisions made for STEELIQ. These records serve as:

1. **Governance**: Mandatory patterns that all code must follow
2. **Documentation**: Historical record of why decisions were made
3. **Onboarding**: Help new team members understand the architecture
4. **Compliance**: Evidence for Fortune 50 audits

## ADR Index

| ADR | Title | Status | Summary |
|-----|-------|--------|---------|
| [0000](./0000-adr-template.md) | Template | N/A | MADR template for new ADRs |
| [0001](./0001-encryption-standard.md) | Encryption Standard | Accepted | AES-256-GCM with dedicated keys |
| [0002](./0002-audit-chain-standard.md) | Audit Chain Standard | Accepted | SHA-256 hash chains for tamper evidence |
| [0003](./0003-notification-integration-standard.md) | Notification Integration | Accepted | All events through NotificationService |
| [0004](./0004-webhook-security-standard.md) | Webhook Security | Accepted | HMAC + 5-min replay + deduplication |
| [0005](./0005-file-storage-standard.md) | File Storage Standard | Accepted | secure_files + photo_evidence with encryption |

## How to Use ADRs

### For Developers

Before implementing any feature, check:

1. **Which ADRs apply?** - Review the "Affected Modules" section of each ADR
2. **Am I compliant?** - Use the "Compliance Checklist" in each ADR
3. **Do I need a new ADR?** - If introducing a new pattern, create an ADR first

### For Code Reviews

Every PR should verify:

- [ ] No violations of existing ADRs
- [ ] New patterns documented as ADRs
- [ ] Compliance checklists completed for affected ADRs

### For Audits

ADRs provide:

- Evidence of security controls (ADR-0001, ADR-0004)
- Audit trail requirements (ADR-0002)
- Data protection measures (ADR-0005)

## Creating New ADRs

1. Copy `0000-adr-template.md` to `XXXX-descriptive-name.md`
2. Fill in all sections
3. Set status to "Proposed"
4. Get review from project owner
5. Update status to "Accepted" after approval
6. Update this README index

## Pattern Conformance Matrix

Track module compliance against all ADRs:

| Module | ADR-0001 | ADR-0002 | ADR-0003 | ADR-0004 | ADR-0005 |
|--------|----------|----------|----------|----------|----------|
| Time & GPS | ✅ | ✅ | ✅ | N/A | ✅ |
| Notifications | ✅ | ✅ | ✅ | N/A | N/A |
| Payroll Integration | ✅ | ✅ | ✅ | ✅ | N/A |
| AI Estimation | ? | ⚠️ | ❌ | N/A | ⚠️ |
| Procurement | ? | ⚠️ | ❌ | N/A | ⚠️ |
| Production | N/A | ⚠️ | ❌ | N/A | N/A |
| Cost Aggregation | ⚠️ | ⚠️ | ❌ | N/A | N/A |
| Job Lifecycle | N/A | ⚠️ | ❌ | N/A | N/A |

**Legend:**
- ✅ Compliant
- ⚠️ Partial (schema done, service integration pending)
- ❌ Non-compliant
- ? Needs audit
- N/A Not applicable

**Note:** Phase 2 ADR Audits completed Nov 28, 2025. Schema updates for ADR-0002 applied to all modules. Service integration pending approval per protected directory policy.

## Fortune 50 Review Process

Every feature/change must pass:

### Tier 1: Pattern Conformance
- Encryption applied per ADR-0001?
- Audit chains per ADR-0002?
- Notifications per ADR-0003?
- Webhook security per ADR-0004?
- File storage per ADR-0005?

### Tier 2: Cross-Wave Impact
- Does this introduce new patterns?
- Does this expose gaps in existing modules?

### Tier 3: Compliance Verification
- Data integrity verified?
- Security standards met?
- Regulatory requirements satisfied?

---

**Last Updated:** 2025-11-28  
**Maintained By:** STEELIQ Architecture Team

## Audit Reports

| Module | Audit Date | Status | Report |
|--------|------------|--------|--------|
| AI Estimation | 2025-11-28 | Schema Complete | [ai-estimation-adr-audit.md](./audits/ai-estimation-adr-audit.md) |
| Procurement/RFQ | 2025-11-28 | Schema Complete | [procurement-rfq-adr-audit.md](./audits/procurement-rfq-adr-audit.md) |
| Production Monitoring | 2025-11-28 | Schema Complete | [production-monitoring-adr-audit.md](./audits/production-monitoring-adr-audit.md) |
| Cost Aggregation | 2025-11-28 | Schema Complete | [cost-aggregation-adr-audit.md](./audits/cost-aggregation-adr-audit.md) |
| Job Lifecycle | 2025-11-28 | Schema Complete | [job-lifecycle-adr-audit.md](./audits/job-lifecycle-adr-audit.md) |
