# [ADR-0002] Audit Chain Standard - SHA-256 Hash Chains

## Status
**Accepted**

**Date:** 2025-11-27  
**Author:** STEELIQ Architecture Team  
**Reviewers:** Project Owner

## Context and Problem Statement

Fortune 50 compliance requires immutable audit trails that can prove data has not been tampered with. Traditional database logs can be modified, deleted, or corrupted. We need a cryptographic mechanism to detect any unauthorized modifications to audit-critical data such as GPS tracking, time clock entries, notifications, and financial transactions.

## Decision Drivers

- **SOX Compliance**: Financial data must have tamper-evident audit trails
- **Legal Defensibility**: Time clock and GPS data may be used in disputes
- **Fortune 50 Standards**: Enterprise-grade data integrity requirements
- **Fraud Prevention**: Detect unauthorized modifications to sensitive records

## Considered Options

1. **SHA-256 Hash Chains**: Each record includes hash of previous record, creating tamper-evident chain
2. **Database Triggers Only**: Rely on database-level audit triggers
3. **Blockchain**: External blockchain for audit immutability
4. **Append-Only Tables**: Database-enforced append-only with no hash verification

## Decision Outcome

**Chosen option:** "SHA-256 Hash Chains", because it provides cryptographic proof of data integrity, can be verified independently, doesn't require external dependencies, and integrates naturally with existing database schema.

### Implementation Requirements

1. **Hash Algorithm**: SHA-256 (256-bit output)
2. **Chain Structure**:
   - First record in chain: `previous_hash = 'GENESIS'`
   - Subsequent records: `previous_hash = SHA256(previous_record_data)`
   - Each record stores: `current_hash = SHA256(this_record_data + previous_hash)`
3. **Chain Validation Fields**:
   - `previous_hash`: VARCHAR(64) - Hash of previous record
   - `current_hash`: VARCHAR(64) - Hash of this record including previous_hash
   - `chain_valid`: BOOLEAN - Result of last validation check
4. **Hash Input Data**: Include all business-critical fields, timestamp, and user ID
5. **Validation Jobs**: Scheduled jobs to verify chain integrity
6. **GENESIS Records**: First record in each chain must have `previous_hash = 'GENESIS'`
7. **Immutability**: Records with hash chain fields must never be updated (append-only)

### Compliance Checklist

- [ ] SHA-256 hash chain implemented for audit tables
- [ ] GENESIS records properly initialized
- [ ] chain_valid field populated by validation jobs
- [ ] Scheduled integrity verification running
- [ ] Alert on chain break detection
- [ ] Hash includes all critical fields

## Consequences

### Positive
- Cryptographic proof of data integrity
- Tamper detection capability
- Legal defensibility for time/GPS records
- SOX compliance for financial audit trails
- Can be verified independently of database

### Negative
- Cannot modify historical records (by design)
- Chain breaks require investigation
- Slight storage overhead for hash fields

### Neutral
- Requires scheduled validation jobs
- Must handle chain initialization correctly

## Affected Modules

| Module | Impact | Status |
|--------|--------|--------|
| GPS Tracking (location_tracking) | Hash chain for breadcrumbs | ✅ Compliant - 121 records verified |
| Notification Audit (notification_audit_log) | Hash chain for events | ✅ Compliant - 48 records verified |
| Photo Evidence (photo_evidence) | Hash chain for photos | ❌ Non-compliant - table empty |
| Time Clocks | Needs hash chain | ⚠️ Partial - no chain implemented |
| Permission Audit | Needs verification | ⚠️ Needs audit |

## Related ADRs

- [ADR-0005: File Storage Standard](./0005-file-storage-standard.md) - Photo evidence uses hash chains

## References

- [RFC 6234: SHA-256](https://tools.ietf.org/html/rfc6234)
- [NIST FIPS 180-4: Secure Hash Standard](https://csrc.nist.gov/publications/detail/fips/180/4/final)
