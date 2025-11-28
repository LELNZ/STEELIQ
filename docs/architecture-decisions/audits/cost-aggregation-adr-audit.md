# ADR Compliance Audit: Cost Aggregation Module

**Module**: Cost Aggregation & Variance Analysis  
**Audit Date**: November 28, 2025  
**Wave**: 4 - Phase 2 ADR Compliance  
**Status**: Audit Complete - Remediation Required

---

## Executive Summary

The Cost Aggregation module provides comprehensive job cost tracking by aggregating material, labor, overhead, and indirect costs from multiple sources (POs, invoices, time entries). The audit reveals gaps primarily in audit chain logging and potential need for encryption of sensitive cost data.

**Files Audited:**
- `server/services/costAggregationService.ts` - Core cost calculation service

---

## ADR-0001: Encryption Standard

### Applicability: PARTIAL (Sensitive Financial Data)

**Current State:**
- Cost data (pricing, margins, overhead rates) stored in plaintext
- Organization settings including overhead rates not encrypted
- Labor rates and pricing visible without encryption layer

**Gap Analysis:**
While production monitoring data doesn't need encryption, cost aggregation deals with:
1. Profit margins (sensitive competitive information)
2. Overhead rates (internal financial data)
3. Supplier pricing (confidential business terms)

**Recommendation:**
- Consider encryption for summary reports containing profit margins
- Organization overhead rate settings may need encryption
- **Priority: Low** - Data is derived, not source of truth

---

## ADR-0002: Audit Chain Standard

### Applicability: YES - Gap Identified

**Current State:**
- Uses `console.log` for operational logging only
- Cost breakdowns are calculated on-demand, not persisted with audit trail
- No hash chain for cost variance records

**Tables Potentially Needing Hash Chain:**
| Table | Purpose | Priority |
|-------|---------|----------|
| `job_cost_snapshots` | Cost snapshot history | Medium |
| `cost_variance_alerts` | Variance threshold breaches | High |
| `imported_costs` | External cost imports | Medium |

**Gaps Identified:**
1. No persisted cost snapshots with hash chain
2. Cost variance calculations not audited
3. Changes to overhead rates not tracked

**Schema Changes Recommended:**
```sql
-- Create cost snapshot table with hash chain
CREATE TABLE IF NOT EXISTS job_cost_snapshots (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL,
  snapshot_date TIMESTAMP NOT NULL,
  material_cost DECIMAL(15,2),
  labor_cost DECIMAL(15,2),
  overhead_cost DECIMAL(15,2),
  indirect_cost DECIMAL(15,2),
  total_cost DECIMAL(15,2),
  variance_amount DECIMAL(15,2),
  variance_percent DECIMAL(5,2),
  previous_hash VARCHAR(64),
  current_hash VARCHAR(64),
  chain_valid BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ADR-0003: Notification Integration Standard

### Applicability: YES - Gap Identified

**Current State:**
- No integration with `NotificationService`
- Cost variance alerts not generated
- No budget overrun notifications

**Events Requiring Notification:**
| Event | Category | Channels | Priority |
|-------|----------|----------|----------|
| Cost Variance > 10% | financial | email, in_app | Medium |
| Cost Variance > 25% | financial | email, in_app, whatsapp | Critical |
| Budget Overrun Imminent | financial | email, in_app | High |
| Job Cost Finalized | financial | email | Low |

**Gaps Identified:**
1. No variance threshold alerts
2. No budget monitoring notifications
3. No finance team notification policies

**Remediation Required:**
- [ ] Add `financial` notification category
- [ ] Wire NotificationService for variance alerts
- [ ] Create notification policies for finance roles
- [ ] Add cost alert thresholds to organization settings

---

## ADR-0004: Webhook Security Standard

### Applicability: N/A

**Rationale:** Cost aggregation is an internal calculation service with no external webhook integrations.

---

## ADR-0005: File Storage Standard

### Applicability: N/A

**Rationale:** Cost aggregation deals with calculated metrics, not file uploads.

---

## Remediation Plan

### Phase 1: Schema Updates (1 hour)
1. Create `job_cost_snapshots` table with hash chain columns
2. Add hash chain columns to `imported_costs` table if it exists

### Phase 2: Service Integration (2 hours) - REQUIRES APPROVAL
Modify `server/services/costAggregationService.ts`:
1. Import hash chain utility
2. Create cost snapshots when calculating job costs
3. Add NotificationService calls for variance alerts

### Phase 3: Notification Setup (1 hour)
1. Add `financial` category to notification categories
2. Create notification policies for:
   - finance_manager
   - project_manager (for their jobs)
   - cfo role
3. Configure variance thresholds in organization settings

### Phase 4: Testing & Validation (1 hour)
1. Verify cost snapshot hash chains
2. Test variance alert notifications
3. Confirm financial dashboard integration

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Schema changes | 1 hour |
| Service integration | 2 hours |
| Notification setup | 1 hour |
| Testing | 1 hour |
| **Total** | **5 hours** |

---

## Implementation Progress

### Phase 1: Schema Updates - COMPLETED ✅ (November 28, 2025)

**Tables Created/Updated:**
1. `job_cost_snapshots` - Created new table with ADR-0002 columns:
   - `previous_hash VARCHAR(64)` - SHA-256 of previous record
   - `current_hash VARCHAR(64)` - SHA-256 of this record
   - `chain_valid BOOLEAN` - Validation status
   - Full cost breakdown columns (material, labor, overhead, indirect, total, variance)

### Phase 2: Service Modifications - PENDING APPROVAL

**Requires explicit approval per replit.md protected directory policy:**
- File: `server/services/costAggregationService.ts`

---

## Sign-off

- [ ] Schema changes reviewed
- [ ] Service modifications approved
- [ ] Notification policies seeded
- [ ] Cost snapshot hash chain working
