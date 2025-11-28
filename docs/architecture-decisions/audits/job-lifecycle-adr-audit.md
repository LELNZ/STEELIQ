# ADR Compliance Audit: Job Lifecycle Module

**Module**: Job Lifecycle Management (Estimation → Job → Procurement)  
**Audit Date**: November 28, 2025  
**Wave**: 4 - Phase 2 ADR Compliance  
**Status**: Audit Complete - Remediation Required

---

## Executive Summary

The Job Lifecycle module manages the complete workflow from estimation approval to job creation, material allocation, and procurement requisition. It is the core integration point connecting AI estimation to production. The audit reveals gaps in audit trail logging, notification integration, and file storage patterns.

**Files Audited:**
- `server/services/jobLifecycleService.ts` - Core lifecycle management

---

## ADR-0001: Encryption Standard

### Applicability: N/A

**Rationale:** Job lifecycle data is operational (job numbers, material lists, costs). No PII or sensitive credentials requiring encryption at rest.

---

## ADR-0002: Audit Chain Standard

### Applicability: YES - Critical Gap

**Current State:**
- Uses `console.log` for operational logging only
- Job status transitions logged but not hash-chained
- No tamper-evident audit trail for job creation/updates

**Critical Audit Events Missing Hash Chain:**
| Event | Importance | Current State |
|-------|------------|---------------|
| Job Created from Estimation | High | console.log only |
| Job Status Change | Critical | Not tracked |
| Materials Added/Modified | High | Not tracked |
| Requisition Auto-Created | Medium | console.log only |

**Tables Requiring Hash Chain:**
| Table | Purpose | Priority |
|-------|---------|----------|
| `jobs` | Job lifecycle events | Critical |
| `job_materials` | Material assignments | High |
| `job_status_history` | Status transitions | Critical (new table) |

**Schema Changes Required:**
```sql
-- Add hash chain columns to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS current_hash VARCHAR(64);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS chain_valid BOOLEAN;

-- Create job status history table with hash chain
CREATE TABLE IF NOT EXISTS job_status_history (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  reason TEXT,
  previous_hash VARCHAR(64),
  current_hash VARCHAR(64),
  chain_valid BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ADR-0003: Notification Integration Standard

### Applicability: YES - Critical Gap

**Current State:**
- No integration with `NotificationService`
- No alerts for job creation, status changes, or deadline approaching
- Users must manually check job status

**Events Requiring Notification:**
| Event | Category | Channels | Priority |
|-------|----------|----------|----------|
| Job Created from Estimation | job_lifecycle | email, in_app | High |
| Job Status Changed | job_lifecycle | in_app | Medium |
| Job Assigned to User | job_lifecycle | email, in_app | High |
| Job Deadline Approaching | job_lifecycle | email, in_app, whatsapp | Critical |
| Job Completed | job_lifecycle | email | Medium |
| Requisition Auto-Created | procurement | in_app | Low |

**Gaps Identified:**
1. No `NotificationService` wiring for job events
2. No deadline monitoring for approaching due dates
3. No assignee notifications
4. No `job_lifecycle` notification category

**Remediation Required:**
- [ ] Add `job_lifecycle` notification category to schema
- [ ] Wire NotificationService for job lifecycle events
- [ ] Create notification policies for project_manager, fabrication_lead roles
- [ ] Add WhatsApp template: `steeliq_job_deadline`

---

## ADR-0004: Webhook Security Standard

### Applicability: N/A

**Rationale:** Job lifecycle is an internal service with no external webhook integrations.

---

## ADR-0005: File Storage Standard

### Applicability: PARTIAL

**Current State:**
- Jobs link to estimations which may have associated drawings
- No direct file storage in job lifecycle service
- Drawing associations inherited from estimation

**Potential Enhancement:**
- Job-specific documents (site photos, delivery receipts) could use `secure_files`
- Delivery photos should follow photo_evidence pattern

**Recommendation:** Consider adding `secure_file_id` references for:
1. Site photos on completion
2. Delivery confirmation photos
3. Client signature documents

---

## Remediation Plan

### Phase 1: Schema Updates (2 hours)
1. Add hash chain columns to `jobs` table
2. Create `job_status_history` table with hash chain
3. Consider `job_materials` hash chain for material integrity

### Phase 2: Service Integration (3 hours) - REQUIRES APPROVAL
Modify `server/services/jobLifecycleService.ts`:
1. Import hash chain utility
2. Compute hashes on job creation and updates
3. Create job_status_history records on status changes
4. Wire NotificationService for:
   - Job created
   - Job status changed
   - Job assigned

### Phase 3: Notification Setup (1 hour)
1. Add `job_lifecycle` category to notification categories
2. Create notification policies for:
   - project_manager
   - fabrication_lead
   - estimator
3. Add WhatsApp template: `steeliq_job_deadline`

### Phase 4: Testing & Validation (1 hour)
1. Verify hash chain integrity on job operations
2. Test notification delivery for job events
3. Confirm job dashboard reflects real-time status

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Schema changes | 2 hours |
| Service integration | 3 hours |
| Notification setup | 1 hour |
| Testing | 1 hour |
| **Total** | **7 hours** |

---

## Implementation Progress

### Phase 1: Schema Updates - COMPLETED ✅ (November 28, 2025)

**Tables Updated/Created:**
1. `jobs` - Added ADR-0002 columns:
   - `previous_hash VARCHAR(64)` - SHA-256 of previous record
   - `current_hash VARCHAR(64)` - SHA-256 of this record
   - `chain_valid BOOLEAN` - Validation status

2. `job_status_history` - Created new table with ADR-0002 columns:
   - `previous_hash VARCHAR(64)` - SHA-256 of previous record
   - `current_hash VARCHAR(64)` - SHA-256 of this record
   - `chain_valid BOOLEAN` - Validation status
   - Full status change tracking (old_status, new_status, changed_by, reason)

### Phase 2: Service Modifications - PENDING APPROVAL

**Requires explicit approval per replit.md protected directory policy:**
- File: `server/services/jobLifecycleService.ts`

---

## Sign-off

- [ ] Schema changes reviewed
- [ ] Service modifications approved
- [ ] Notification policies seeded
- [ ] Hash chain validation passing
- [ ] Job status history tracking working
