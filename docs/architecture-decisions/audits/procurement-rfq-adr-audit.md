# ADR Compliance Audit: Procurement/RFQ Module

**Module**: Procurement Automation (RFQ, Quotes, Purchase Orders)  
**Audit Date**: November 28, 2025  
**Wave**: 4 - Phase 2 ADR Compliance  
**Status**: Audit Complete - Remediation Required

---

## Executive Summary

The Procurement/RFQ module handles the complete procurement lifecycle from material requisitions to purchase orders. The audit reveals significant ADR compliance gaps, particularly in audit trail logging and notification integration.

**Files Audited:**
- `server/services/rfqAutomationService.ts` - RFQ creation and automation
- `server/services/rfqEmailService.ts` - Email distribution to suppliers
- `server/services/templateHierarchyService.ts` - Template management

---

## ADR-0001: Encryption Standard

### Applicability: PARTIAL

**Current State:**
- Access tokens generated for supplier portal links use `crypto.randomBytes()` - basic but not encrypted storage
- Supplier credentials (if stored) are in plaintext
- No encryption key management for sensitive procurement data

**Gaps Identified:**
1. Supplier portal access tokens not encrypted in database
2. No dedicated encryption key for procurement domain
3. Sensitive quote pricing visible without encryption layer

**Remediation Required:**
- [ ] Encrypt supplier portal tokens using AES-256-GCM
- [ ] Consider encryption for competitive quote pricing data
- [ ] Add `PROCUREMENT_ENCRYPTION_KEY` environment variable for production

---

## ADR-0002: Audit Chain Standard

### Applicability: YES - Critical Gap

**Current State:**
- Uses `console.log` for operational logging only
- No hash chain mechanism for RFQ/Quote/PO lifecycle events
- Database records lack `previous_hash`, `current_hash`, `chain_valid` columns

**Tables Requiring Hash Chain:**
| Table | Purpose | Priority |
|-------|---------|----------|
| `rfq_requests` | RFQ lifecycle events | High |
| `rfq_responses` | Supplier quote submissions | High |
| `purchase_orders` | PO creation/approval events | Critical |
| `po_audit_log` | PO change history | Medium |

**Gaps Identified:**
1. No tamper-evident audit trail for procurement decisions
2. No GENESIS record for RFQ chains
3. Cannot verify quote integrity after submission

**Schema Changes Required:**
```sql
-- Add hash chain columns to rfq_requests
ALTER TABLE rfq_requests ADD COLUMN previous_hash VARCHAR(64);
ALTER TABLE rfq_requests ADD COLUMN current_hash VARCHAR(64);
ALTER TABLE rfq_requests ADD COLUMN chain_valid BOOLEAN;

-- Add hash chain columns to rfq_responses
ALTER TABLE rfq_responses ADD COLUMN previous_hash VARCHAR(64);
ALTER TABLE rfq_responses ADD COLUMN current_hash VARCHAR(64);
ALTER TABLE rfq_responses ADD COLUMN chain_valid BOOLEAN;

-- Add hash chain columns to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN previous_hash VARCHAR(64);
ALTER TABLE purchase_orders ADD COLUMN current_hash VARCHAR(64);
ALTER TABLE purchase_orders ADD COLUMN chain_valid BOOLEAN;
```

---

## ADR-0003: Notification Integration Standard

### Applicability: YES - Critical Gap

**Current State:**
- Uses SendGrid directly via `rfqEmailService.ts`
- No integration with centralized `NotificationService`
- No internal notifications for RFQ status changes
- No RBAC-based notification policies for procurement events

**Events Requiring Notification:**
| Event | Category | Channels |
|-------|----------|----------|
| RFQ Created | procurement | email, in_app |
| RFQ Sent to Suppliers | procurement | email, in_app |
| Quote Received | procurement | email, in_app, whatsapp |
| Quote Comparison Ready | procurement | in_app |
| PO Approved | procurement | email, in_app |
| PO Rejected | procurement | email, in_app, whatsapp |

**Gaps Identified:**
1. Email sent directly via SendGrid, bypassing NotificationService
2. No in-app notifications for procurement team
3. No WhatsApp alerts for urgent procurement decisions
4. No notification policies for procurement roles

**Remediation Required:**
- [ ] Add `procurement` notification category to schema
- [ ] Route all procurement emails through NotificationService
- [ ] Add notification policies for procurement roles
- [ ] Create notification templates for procurement events

---

## ADR-0004: Webhook Security Standard

### Applicability: YES - Potential Future Need

**Current State:**
- Supplier portal uses URL tokens for access (not webhook-based)
- No incoming webhooks from suppliers
- No HMAC signature validation on callbacks

**Future Considerations:**
1. If supplier portals send callbacks → implement HMAC-SHA256
2. If integrating with external procurement systems → replay protection needed
3. Event deduplication for duplicate quote submissions

**Current Assessment:** Low priority unless external integrations added.

---

## ADR-0005: File Storage Standard

### Applicability: PARTIAL

**Current State:**
- RFQ documents may include attachments (specifications, drawings)
- No reference to `secure_files` table for encrypted storage
- PDF quotes from suppliers stored without encryption

**Gaps Identified:**
1. Quote PDFs not stored in `secure_files` with encryption
2. No hash verification for uploaded documents
3. Sensitive pricing documents accessible without audit

**Remediation Required:**
- [ ] Add `secure_file_id` column to `rfq_responses` for quote documents
- [ ] Store all RFQ attachments in `secure_files` table
- [ ] Implement hash verification for uploaded quotes

---

## Remediation Plan

### Phase 1: Schema Updates (2 hours)
Add hash chain columns to procurement tables:
- `rfq_requests`
- `rfq_responses`
- `purchase_orders`

Add secure file reference:
- `rfq_responses.secure_file_id`

### Phase 2: Service Integration (4 hours) - REQUIRES APPROVAL
Modify `server/services/rfqAutomationService.ts`:
1. Import hash chain utility
2. Compute hashes before insert
3. Add NotificationService calls for RFQ events

Modify `server/services/rfqEmailService.ts`:
1. Route emails through NotificationService
2. Add audit logging for email send events

### Phase 3: Notification Setup (2 hours)
1. Add `procurement` category to notification categories
2. Create notification policies for:
   - procurement_manager
   - buyer
   - approver roles
3. Add WhatsApp templates for urgent quotes

### Phase 4: Testing & Validation (2 hours)
1. Verify hash chain integrity
2. Test notification delivery
3. Confirm audit trail captures all events

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Schema changes | 2 hours |
| Service integration | 4 hours |
| Notification setup | 2 hours |
| Testing | 2 hours |
| **Total** | **10 hours** |

---

## Implementation Progress

### Phase 1: Schema Updates - COMPLETED ✅ (November 28, 2025)

**Tables Updated:**
1. `rfq_requests` - Added ADR-0002 columns:
   - `previous_hash VARCHAR(64)` - SHA-256 of previous record
   - `current_hash VARCHAR(64)` - SHA-256 of this record
   - `chain_valid BOOLEAN` - Validation status

2. `rfq_responses` - Added ADR-0002 and ADR-0005 columns:
   - `previous_hash VARCHAR(64)` - SHA-256 of previous record
   - `current_hash VARCHAR(64)` - SHA-256 of this record
   - `chain_valid BOOLEAN` - Validation status
   - `secure_file_id INTEGER` - Reference to secure_files table for quote documents

3. `purchase_orders` - Added ADR-0002 columns:
   - `previous_hash VARCHAR(64)` - SHA-256 of previous record
   - `current_hash VARCHAR(64)` - SHA-256 of this record
   - `chain_valid BOOLEAN` - Validation status

### Phase 2: Service Modifications - PENDING APPROVAL

**Requires explicit approval per replit.md protected directory policy:**
- File: `server/services/rfqAutomationService.ts`
- File: `server/services/rfqEmailService.ts`

---

## Sign-off

- [ ] Schema changes reviewed
- [ ] Service modifications approved
- [ ] Notification policies seeded
- [ ] Hash chain validation passing
- [ ] Email routing through NotificationService confirmed
