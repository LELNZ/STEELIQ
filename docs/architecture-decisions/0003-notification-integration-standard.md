# [ADR-0003] Notification Integration Standard - Centralized NotificationService

## Status
**Accepted**

**Date:** 2025-11-27  
**Author:** STEELIQ Architecture Team  
**Reviewers:** Project Owner

## Context and Problem Statement

STEELIQ has multiple modules that generate business events requiring user notification: time clock submissions, payroll syncs, job status changes, procurement approvals, etc. Without a centralized notification system, each module implements its own notification logic, leading to inconsistent delivery, missed RBAC enforcement, and incomplete audit trails.

## Decision Drivers

- **RBAC Compliance**: Notifications must respect role-based policies (mandatory/default channels)
- **Audit Requirements**: All notification attempts must be logged
- **Multi-Channel Delivery**: Email, In-App (WebSocket), WhatsApp support
- **Consistency**: Same notification behavior across all modules
- **Escalation**: Critical notifications must escalate if unacknowledged

## Considered Options

1. **Centralized NotificationService**: Single service handling all notification routing
2. **Per-Module Notification Logic**: Each module handles its own notifications
3. **External Notification Platform**: Third-party service (e.g., Twilio Notify)
4. **Event Bus with Notification Consumer**: Pub/sub pattern with dedicated consumer

## Decision Outcome

**Chosen option:** "Centralized NotificationService", because it provides single point of RBAC enforcement, consistent audit logging, centralized channel configuration, and simpler maintenance. The existing NotificationService singleton already implements this pattern.

### Implementation Requirements

1. **Single Entry Point**: All business events MUST route through `NotificationService.getInstance().createNotification()`
2. **Required Parameters**:
   ```typescript
   {
     userId: number,           // Target user
     type: string,            // Event type identifier
     category: 'time_clock' | 'payroll' | 'compliance' | 'approvals',
     title: string,
     message: string,
     priority: 'low' | 'medium' | 'high' | 'critical',
     metadata?: object        // Event-specific data
   }
   ```
3. **Category Mapping**: Events must use correct category for RBAC policy lookup:
   - `time_clock`: Clock in/out, breaks, GPS alerts
   - `payroll`: Sync events, export completion, credential updates
   - `compliance`: Security alerts, audit findings, regulatory notices
   - `approvals`: Leave requests, PO approvals, job approvals
4. **RBAC Enforcement**: NotificationService checks `notification_policies` table for mandatory/default channels
5. **Audit Logging**: All notification attempts logged to `notification_audit_log` with SHA-256 hash chain
6. **Delivery Tracking**: All channel delivery attempts logged to `notification_deliveries`
7. **Escalation Setup**: Critical priority notifications must have escalation configured

### Compliance Checklist

- [ ] Event routes through NotificationService.createNotification()
- [ ] Correct category assigned for RBAC lookup
- [ ] Priority level appropriate for event severity
- [ ] Metadata includes event-specific context
- [ ] Notification appears in notification_audit_log
- [ ] Delivery attempts appear in notification_deliveries

## Consequences

### Positive
- Consistent RBAC enforcement across all modules
- Complete audit trail for all notifications
- Centralized channel configuration
- Escalation handling in one place
- Easier to add new channels

### Negative
- Single point of failure (mitigated by robust error handling)
- All modules depend on NotificationService
- Requires refactoring existing direct-send code

### Neutral
- Slight latency added for routing logic
- Notification policies must be seeded for new roles

## Affected Modules

| Module | Impact | Status |
|--------|--------|--------|
| Payroll Integration | Sync lifecycle events | ✅ Compliant - all 5 events wired |
| Time & GPS | Clock events, GPS alerts | ⚠️ Partial - security alerts only |
| Job Lifecycle | Create/update/status events | ❌ Non-compliant - not wired |
| Procurement | RFQ/Quote/PO events | ❌ Non-compliant - not wired |
| Production Monitoring | Alerts and updates | ❌ Non-compliant - not wired |

## Related ADRs

- [ADR-0002: Audit Chain Standard](./0002-audit-chain-standard.md) - Notification audit uses hash chains

## References

- [STEELIQ Notification Architecture](../notification-system-architecture.md)
