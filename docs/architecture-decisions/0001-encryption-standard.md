# [ADR-0001] Encryption Standard - AES-256-GCM

## Status
**Accepted**

**Date:** 2025-11-27  
**Author:** STEELIQ Architecture Team  
**Reviewers:** Project Owner

## Context and Problem Statement

STEELIQ handles sensitive data across multiple modules including payroll credentials, employee photos, GPS location data, and financial information. Fortune 50 compliance requires consistent, strong encryption across all sensitive data storage. Currently, encryption is implemented inconsistently - some modules use proper AES-256-GCM while others rely on weaker patterns or shared keys.

## Decision Drivers

- **Fortune 50 Security Compliance**: Must meet enterprise security standards
- **Data Protection Regulations**: GDPR, Privacy Act requirements for PII
- **Key Segregation**: Prevent cross-system compromise if one key is exposed
- **Audit Requirements**: SOX compliance for financial data encryption

## Considered Options

1. **AES-256-GCM with dedicated keys per domain**: Strong encryption with key segregation
2. **AES-256-CBC with shared key**: Simpler but weaker (no authentication, shared key risk)
3. **Application-level encryption only**: Relies on TLS, no at-rest protection

## Decision Outcome

**Chosen option:** "AES-256-GCM with dedicated keys per domain", because it provides authenticated encryption (preventing tampering), strong confidentiality, and key segregation limits blast radius of any key compromise.

### Implementation Requirements

1. **Algorithm**: AES-256-GCM (Galois/Counter Mode) - provides both encryption and authentication
2. **Key Length**: 256-bit keys minimum
3. **IV/Nonce**: 12-byte random nonce, never reused for same key
4. **Key Storage**: Environment secrets only, never in code or config files
5. **Key Segregation**: Separate keys per domain:
   - `PAYROLL_ENCRYPTION_KEY` - Payroll credentials and sync data
   - `PHOTO_ENCRYPTION_KEY` - Employee photos and evidence files
   - `PII_ENCRYPTION_KEY` - Personal identifiable information
6. **No Fallbacks**: If dedicated key is missing, operation MUST fail (no fallback to SESSION_SECRET)
7. **Key Rotation**: Keys must be rotatable without data loss (re-encryption capability)

### Compliance Checklist

- [ ] AES-256-GCM implemented for all sensitive data
- [ ] Dedicated encryption keys configured per domain
- [ ] No fallback to shared keys (SESSION_SECRET)
- [ ] Keys stored as environment secrets only
- [ ] IV/nonce uniqueness verified
- [ ] Key rotation procedure documented
- [ ] Encryption verified in secure_files table

## Consequences

### Positive
- Strong encryption meets Fortune 50 standards
- Authenticated encryption prevents tampering
- Key segregation limits blast radius
- Compliance with SOX, GDPR, Privacy Act

### Negative
- Increased complexity managing multiple keys
- Must handle key rotation for long-lived data
- Performance overhead (minimal for GCM)

### Neutral
- Requires updating existing code that uses weaker patterns

## Affected Modules

| Module | Impact | Status |
|--------|--------|--------|
| Payroll Integration | Credential encryption | ⚠️ Partial - needs dedicated key enforcement |
| Time & GPS | Photo encryption in secure_files | ❌ Non-compliant - photos not migrated |
| User Management | PII encryption | ⚠️ Partial - needs audit |
| Notification System | N/A - no sensitive storage | ✅ N/A |

## Related ADRs

- [ADR-0005: File Storage Standard](./0005-file-storage-standard.md) - Uses this encryption standard

## References

- [NIST SP 800-38D: GCM Mode](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
