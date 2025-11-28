# AI Estimation Module - ADR Compliance Audit Report

**Audit Date:** November 28, 2025  
**Module:** AI Estimation (aiEstimationService.ts)  
**Auditor:** STEELIQ Architecture Team  
**Status:** ⚠️ REMEDIATION REQUIRED

---

## Executive Summary

The AI Estimation module requires remediation across 4 ADRs to achieve Fortune 50 compliance. The module currently stores evidence records without encryption, lacks hash chain audit trails, and does not integrate with the centralized NotificationService.

---

## ADR Compliance Matrix

| ADR | Requirement | Current State | Status | Priority |
|-----|-------------|---------------|--------|----------|
| ADR-0001 | AES-256-GCM encryption for files | No encryption on evidence files | ⚠️ Partial | P1 |
| ADR-0002 | SHA-256 hash chains for audit | No hash chain on telemetry/evidence | ❌ Non-compliant | P1 |
| ADR-0003 | NotificationService integration | Not wired | ❌ Non-compliant | P2 |
| ADR-0005 | secure_files for file storage | Evidence tracks files but not encrypted | ⚠️ Partial | P2 |

---

## Detailed Findings

### ADR-0001: Encryption Standard

**Finding:** The `ai_mto_evidence` table stores file references without using the `secure_files` table for encrypted storage.

**Evidence:**
- Line 339: `file_id: item.evidence?.fileId || 'current.pdf'` - stores raw file path
- No reference to `PHOTO_ENCRYPTION_KEY` or encryption service
- PDF buffers processed in-memory but not encrypted for persistence

**Remediation:**
1. Store processed PDFs in `secure_files` table with AES-256-GCM encryption
2. Link evidence records via `secure_file_id` instead of raw file paths
3. Use `PHOTO_ENCRYPTION_KEY` for AI document encryption

---

### ADR-0002: Audit Chain Standard

**Finding:** Neither `ai_run_telemetry` nor `ai_mto_evidence` tables have hash chain columns.

**Evidence:**
- Schema review shows no `previous_hash`, `current_hash`, `chain_valid` columns
- Telemetry records can be modified without detection
- No GENESIS record pattern implemented

**Remediation:**
1. Add hash chain columns to `ai_run_telemetry`:
   - `previous_hash VARCHAR(64)`
   - `current_hash VARCHAR(64)`
   - `chain_valid BOOLEAN`
2. Add same columns to `ai_mto_evidence`
3. Implement GENESIS record for first entry in each chain
4. Create scheduled validation job

---

### ADR-0003: Notification Integration Standard

**Finding:** AI Estimation does not integrate with NotificationService for any business events.

**Evidence:**
- No import of NotificationService in aiEstimationService.ts
- Analysis completion/failure not notified
- Low confidence results (<70%) not flagged to users
- No "estimation" category in notification_policies table

**Remediation:**
1. Add new notification category: `estimation`
2. Seed notification policies for all 5 roles
3. Wire events to NotificationService:
   - `estimation_complete` - Analysis finished successfully
   - `estimation_failed` - Analysis failed
   - `estimation_low_confidence` - Confidence < 70%
   - `estimation_pattern_learned` - New pattern pack saved

---

### ADR-0005: File Storage Standard

**Finding:** Evidence records exist but do not use secure file storage pattern.

**Evidence:**
- `ai_mto_evidence` table exists with file references
- Records link to `fileId` string, not `secure_file_id` integer
- No encryption or hash chain for stored PDF content

**Remediation:**
1. Add `secure_file_id` column to `ai_mto_evidence`
2. Store analyzed PDFs through `secure_files` table
3. Implement hash chain in `photo_evidence` pattern for AI evidence

---

## Remediation Plan

### Phase 1: Schema Updates (No Service Changes)
1. Add hash chain columns to `ai_run_telemetry` table
2. Add hash chain columns to `ai_mto_evidence` table
3. Add `secure_file_id` reference column
4. Add `estimation` notification category with policies

### Phase 2: Service Integration (Requires Approval)
1. Modify aiEstimationService.ts to compute and store hash chains
2. Integrate with secure file storage for PDF encryption
3. Wire NotificationService for estimation events

### Phase 3: Migration & Testing
1. Create GENESIS records for existing data
2. Run hash chain validation
3. Test notification delivery for all event types

---

## Estimated Effort

| Phase | Task | Hours |
|-------|------|-------|
| Phase 1 | Schema migrations | 4 |
| Phase 2 | Service modifications | 8 |
| Phase 3 | Migration & testing | 4 |
| **Total** | | **16 hours** |

---

## Implementation Progress

### Phase 1: Schema Updates - COMPLETED ✅ (November 28, 2025)

**Tables Updated:**
1. `ai_run_telemetry` - Added ADR-0002 columns:
   - `previous_hash VARCHAR(64)` - SHA-256 of previous record
   - `current_hash VARCHAR(64)` - SHA-256 of this record
   - `chain_valid BOOLEAN` - Validation status

2. `ai_mto_evidence` - Added ADR-0002 and ADR-0005 columns:
   - `previous_hash VARCHAR(64)` - SHA-256 of previous record
   - `current_hash VARCHAR(64)` - SHA-256 of this record
   - `chain_valid BOOLEAN` - Validation status
   - `secure_file_id INTEGER` - Reference to secure_files table
   - `element_designation VARCHAR(255)` - Element designation (B1, C1)
   - `element_type VARCHAR(50)` - Element type (beam, column)

### Phase 2: Service Modifications - PENDING APPROVAL

**Requires explicit approval per replit.md protected directory policy:**
- File: `server/services/aiEstimationService.ts`
- Changes needed:
  1. Import hash chain utility and compute hashes before insert
  2. Wire NotificationService for estimation events
  3. Store processed PDFs in secure_files with encryption

---

## Sign-off

- [x] Schema changes reviewed
- [ ] Service modifications approved
- [x] Migrations tested in development
- [ ] Notification policies seeded
- [ ] Hash chain validation passing
