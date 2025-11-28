# [ADR-0004] Webhook Security Standard - HMAC + Replay Protection

## Status
**Accepted**

**Date:** 2025-11-27  
**Author:** STEELIQ Architecture Team  
**Reviewers:** Project Owner

## Context and Problem Statement

STEELIQ integrates with external services (QuickBooks, Xero, ADP, WhatsApp) that send webhooks to notify of events. Without proper security, these endpoints are vulnerable to:
- **Spoofing**: Attackers sending fake webhook payloads
- **Replay Attacks**: Attackers capturing and re-sending legitimate webhooks
- **Tampering**: Modifying webhook content in transit

## Decision Drivers

- **Fortune 50 Security**: Zero-trust approach to external integrations
- **Financial Data Protection**: Payroll webhooks contain sensitive data
- **Fraud Prevention**: Prevent unauthorized actions via fake webhooks
- **Compliance**: SOX requires audit trails for all financial data changes

## Considered Options

1. **HMAC + Timestamp + Deduplication**: Full zero-trust webhook security
2. **HMAC Only**: Signature verification without replay protection
3. **IP Whitelisting**: Allow only known provider IPs
4. **Shared Secret in Header**: Simple secret validation

## Decision Outcome

**Chosen option:** "HMAC + Timestamp + Deduplication", because it provides complete protection against spoofing, replay attacks, and duplicate processing. This matches Fortune 50 security requirements.

### Implementation Requirements

1. **HMAC Signature Verification**:
   - Algorithm: HMAC-SHA256
   - Signature location: Provider-specific header (e.g., `x-qbo-signature`, `x-xero-signature`)
   - Verification: Compare computed HMAC against provided signature
   - Raw body: MUST use raw request body (Buffer), not parsed JSON
   - Encoding: Base64 for QuickBooks/Xero, Hex for ADP

2. **Replay Protection (5-minute window)**:
   ```typescript
   const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
   
   const timestamp = req.headers['x-webhook-timestamp'];
   const eventTime = parseInt(timestamp, 10);
   const now = Date.now();
   
   if (Math.abs(now - eventTime) > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
     // Reject - potential replay attack
     return res.status(401).json({ error: 'Timestamp outside tolerance' });
   }
   ```

3. **Event Deduplication**:
   - Track processed event IDs in `payroll_sync_log.providerTransactionId`
   - Reject duplicates with 200 OK (idempotent) or 409 Conflict
   - Event ID sources: `realmId` (QuickBooks), `eventId` (Xero), `eventID` (ADP)

4. **Security Logging**:
   - Log all webhook attempts (success and failure)
   - Log signature mismatches as security alerts
   - Log replay attempts with source IP
   - Trigger NotificationService for security events

5. **Provider-Specific Implementation**:
   | Provider | Signature Header | Algorithm | Timestamp Header | Event ID Field |
   |----------|-----------------|-----------|------------------|----------------|
   | QuickBooks | `intuit-signature` | HMAC-SHA256 Base64 | `intuit-t` | `realmId` + `eventType` |
   | Xero | `x-xero-signature` | HMAC-SHA256 Base64 | `x-xero-timestamp` | `eventId` |
   | ADP | `x-adp-signature` | HMAC-SHA256 Hex | `x-adp-timestamp` | `eventID` |
   | WhatsApp | `x-hub-signature-256` | HMAC-SHA256 Hex | N/A | `message_id` |

### Compliance Checklist

- [ ] HMAC signature verification implemented
- [ ] Raw body (Buffer) used for signature computation
- [ ] 5-minute timestamp tolerance enforced
- [ ] Event deduplication via providerTransactionId
- [ ] Security alerts logged for failures
- [ ] NotificationService triggered for security events

## Consequences

### Positive
- Complete protection against webhook spoofing
- Replay attack prevention
- Duplicate processing prevention
- Full audit trail of webhook activity
- Fortune 50 security compliance

### Negative
- Increased complexity per webhook endpoint
- Clock synchronization important for timestamp validation
- Must handle provider-specific signature formats

### Neutral
- Requires storing webhook secrets securely
- May need to coordinate with providers on timestamp format

## Affected Modules

| Module | Impact | Status |
|--------|--------|--------|
| ADP Webhook | All 3 protections | ✅ Compliant |
| QuickBooks Webhook | HMAC only, needs replay | ⚠️ Partial - missing replay protection |
| Xero Webhook | HMAC only, needs replay | ⚠️ Partial - missing replay protection |
| WhatsApp Webhook | HMAC verification | ✅ Compliant |

## Related ADRs

- [ADR-0001: Encryption Standard](./0001-encryption-standard.md) - Webhook secrets use same key management

## References

- [OWASP Webhook Security](https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html)
- [RFC 2104: HMAC](https://tools.ietf.org/html/rfc2104)
