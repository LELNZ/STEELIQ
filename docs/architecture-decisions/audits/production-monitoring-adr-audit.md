# ADR Compliance Audit: Production Monitoring Module

**Module**: Production Monitoring & OEE Analytics  
**Audit Date**: November 28, 2025  
**Wave**: 4 - Phase 2 ADR Compliance  
**Status**: Audit Complete - Remediation Required

---

## Executive Summary

The Production Monitoring module tracks real-time machine status, production events, and calculates OEE (Overall Equipment Effectiveness) metrics. The audit reveals gaps in audit trail logging and notification integration.

**Files Audited:**
- `server/services/productionMonitoringService.ts` - Core monitoring service

---

## ADR-0001: Encryption Standard

### Applicability: N/A

**Rationale:** Production monitoring data (machine status, OEE metrics) is operational data, not sensitive personal or financial data requiring encryption.

---

## ADR-0002: Audit Chain Standard

### Applicability: YES - Gap Identified

**Current State:**
- Uses internal `log` utility for operational logging
- Machine status logged to `machineStatusLogs` table
- Production events stored in `productionEvents` table
- Critical errors logged to `ai_monitoring_logs` via `aiMonitoringService.log`
- **No hash chain mechanism** for tamper-evident audit trail

**Tables Requiring Hash Chain:**
| Table | Purpose | Priority |
|-------|---------|----------|
| `machine_status_logs` | Machine state changes | Medium |
| `production_events` | Production data records | High |
| `production_metrics` | OEE calculations | Medium |

**Gaps Identified:**
1. No `previous_hash`, `current_hash`, `chain_valid` columns
2. No GENESIS record for production chains
3. Cannot verify production data integrity post-facto

**Schema Changes Required:**
```sql
-- Add hash chain columns to production_events
ALTER TABLE production_events ADD COLUMN previous_hash VARCHAR(64);
ALTER TABLE production_events ADD COLUMN current_hash VARCHAR(64);
ALTER TABLE production_events ADD COLUMN chain_valid BOOLEAN;

-- Add hash chain columns to production_metrics
ALTER TABLE production_metrics ADD COLUMN previous_hash VARCHAR(64);
ALTER TABLE production_metrics ADD COLUMN current_hash VARCHAR(64);
ALTER TABLE production_metrics ADD COLUMN chain_valid BOOLEAN;
```

---

## ADR-0003: Notification Integration Standard

### Applicability: YES - Gap Identified

**Current State:**
- Uses `log.info`, `log.debug`, `log.error` for internal logging
- No integration with centralized `NotificationService`
- No alerts for production anomalies or threshold breaches

**Events Requiring Notification:**
| Event | Category | Channels | Priority |
|-------|----------|----------|----------|
| Machine Status Change (Running → Down) | production | in_app, whatsapp | High |
| OEE Below Threshold | production | in_app, email | Medium |
| Quality Defect Threshold Exceeded | production | in_app, whatsapp | Critical |
| Shift Summary Complete | production | email | Low |
| Work Order Delayed | production | in_app, email | Medium |

**Gaps Identified:**
1. No `NotificationService` integration
2. No alerting when OEE drops below configurable threshold
3. No shift supervisor notifications
4. No production category in notification policies

**Remediation Required:**
- [ ] Add `production` notification category to schema
- [ ] Wire `NotificationService` for production alerts
- [ ] Create notification policies for production roles
- [ ] Add WhatsApp template for critical production alerts

---

## ADR-0004: Webhook Security Standard

### Applicability: N/A (No External Webhooks)

**Current State:** The production monitoring service does not receive or send external webhooks. It operates as an internal polling service.

**Future Consideration:** If PLC/SCADA integration uses webhooks, implement HMAC-SHA256 + replay protection.

---

## ADR-0005: File Storage Standard

### Applicability: N/A

**Rationale:** Production monitoring deals with metric data, not file uploads. No file storage requirements identified.

---

## Remediation Plan

### Phase 1: Schema Updates (1 hour)
Add hash chain columns to production tables:
- `production_events`
- `production_metrics`

### Phase 2: Service Integration (3 hours) - REQUIRES APPROVAL
Modify `server/services/productionMonitoringService.ts`:
1. Import hash chain utility
2. Compute hashes when inserting production events/metrics
3. Add NotificationService calls for:
   - Machine status changes (critical)
   - OEE threshold breaches
   - Quality defect alerts

### Phase 3: Notification Setup (1 hour)
1. Add `production` category to notification categories
2. Create notification policies for:
   - shift_supervisor
   - production_manager
   - maintenance_team
3. Add WhatsApp template: `steeliq_production_alert`

### Phase 4: Testing & Validation (1 hour)
1. Verify hash chain integrity on production data
2. Test notification delivery for threshold breaches
3. Confirm production dashboard reflects notifications

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Schema changes | 1 hour |
| Service integration | 3 hours |
| Notification setup | 1 hour |
| Testing | 1 hour |
| **Total** | **6 hours** |

---

## Implementation Progress

### Phase 1: Schema Updates - COMPLETED ✅ (November 28, 2025)

**Tables Updated:**
1. `production_events` - Added ADR-0002 columns:
   - `previous_hash VARCHAR(64)` - SHA-256 of previous record
   - `current_hash VARCHAR(64)` - SHA-256 of this record
   - `chain_valid BOOLEAN` - Validation status

2. `production_metrics` - Added ADR-0002 columns:
   - `previous_hash VARCHAR(64)` - SHA-256 of previous record
   - `current_hash VARCHAR(64)` - SHA-256 of this record
   - `chain_valid BOOLEAN` - Validation status

### Phase 2: Service Modifications - PENDING APPROVAL

**Requires explicit approval per replit.md protected directory policy:**
- File: `server/services/productionMonitoringService.ts`

---

## Sign-off

- [ ] Schema changes reviewed
- [ ] Service modifications approved
- [ ] Notification policies seeded
- [ ] Hash chain validation passing
