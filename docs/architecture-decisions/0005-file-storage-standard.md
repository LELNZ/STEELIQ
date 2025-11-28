# [ADR-0005] File Storage Standard - Secure Files with Hash Chain

## Status
**Accepted**

**Date:** 2025-11-27  
**Author:** STEELIQ Architecture Team  
**Reviewers:** Project Owner

## Context and Problem Statement

STEELIQ stores sensitive files including employee time clock photos, document uploads, and evidence files. These files may be used as legal evidence (time clock disputes), contain PII (employee photos), or have compliance requirements (document retention). Current implementation stores photos directly in `time_clocks.photo_url` without encryption or tamper detection.

## Decision Drivers

- **Legal Evidence**: Time clock photos may be used in labor disputes
- **PII Protection**: Employee photos are personally identifiable information
- **Tamper Detection**: Must prove files haven't been modified
- **Fortune 50 Compliance**: Enterprise-grade file security requirements
- **Audit Trail**: Complete history of file access and modifications

## Considered Options

1. **secure_files + photo_evidence with encryption and hash chain**: Full security implementation
2. **Direct file storage with URL signing**: Simple but no encryption or tamper detection
3. **External secure file service**: Third-party (e.g., AWS S3 with encryption)
4. **Database BLOB storage**: Store files directly in database

## Decision Outcome

**Chosen option:** "secure_files + photo_evidence with encryption and hash chain", because it provides AES-256-GCM encryption, SHA-256 tamper detection, complete audit trail, and keeps data within our control for compliance purposes.

### Implementation Requirements

1. **Two-Table Architecture**:
   - `secure_files`: Stores encrypted file content with metadata
   - `photo_evidence`: Links files to business records with hash chain

2. **secure_files Table Structure**:
   ```sql
   id: SERIAL PRIMARY KEY
   file_name: VARCHAR(255)
   file_type: VARCHAR(100) -- MIME type
   file_size: INTEGER
   encrypted_content: BYTEA -- AES-256-GCM encrypted
   encryption_iv: VARCHAR(32) -- Initialization vector
   original_hash: VARCHAR(64) -- SHA-256 of original file
   storage_path: VARCHAR(500) -- Optional external path
   uploaded_by: INTEGER REFERENCES users(id)
   uploaded_at: TIMESTAMP
   metadata: JSONB
   ```

3. **photo_evidence Table Structure**:
   ```sql
   id: SERIAL PRIMARY KEY
   secure_file_id: INTEGER REFERENCES secure_files(id)
   record_type: VARCHAR(50) -- 'time_clock', 'job', 'ncr', etc.
   record_id: INTEGER -- ID of linked record
   evidence_type: VARCHAR(50) -- 'clock_in_photo', 'damage_photo', etc.
   captured_at: TIMESTAMP
   captured_by: INTEGER REFERENCES users(id)
   location_lat: DECIMAL(10,8)
   location_lng: DECIMAL(11,8)
   previous_hash: VARCHAR(64) -- Hash chain
   current_hash: VARCHAR(64) -- Hash chain
   chain_valid: BOOLEAN
   created_at: TIMESTAMP
   ```

4. **Encryption Requirements** (per ADR-0001):
   - Algorithm: AES-256-GCM
   - Key: `PHOTO_ENCRYPTION_KEY` environment secret
   - IV: Unique per file, stored in `encryption_iv`
   - No fallback to other keys

5. **Hash Chain Requirements** (per ADR-0002):
   - Chain per `record_type` (separate chains for time_clock photos, job photos, etc.)
   - First record: `previous_hash = 'GENESIS'`
   - `current_hash = SHA256(file_hash + metadata + previous_hash)`

6. **Migration Requirements**:
   - Existing `time_clocks.photo_url` records must be migrated
   - Original files encrypted and stored in `secure_files`
   - Links created in `photo_evidence`
   - Original URLs retained for backward compatibility during transition

### Compliance Checklist

- [ ] secure_files table created with all required columns
- [ ] photo_evidence table created with hash chain columns
- [ ] AES-256-GCM encryption implemented for file content
- [ ] SHA-256 hash chain implemented for photo_evidence
- [ ] Migration script created for existing photos
- [ ] PHOTO_ENCRYPTION_KEY configured as secret
- [ ] API endpoints updated to use secure_files

## Consequences

### Positive
- Files encrypted at rest with strong encryption
- Tamper detection via hash chain
- Complete audit trail of file access
- Legal defensibility for evidence files
- Fortune 50 compliance

### Negative
- Storage overhead for encrypted content
- Migration required for existing files
- Increased complexity for file operations
- Decryption required for each file access

### Neutral
- Requires dedicated encryption key management
- May impact file serving performance (minimal with proper caching)

## Affected Modules

| Module | Impact | Status |
|--------|--------|--------|
| Time & GPS | Clock photos | ❌ Non-compliant - 1,145 photos not migrated |
| Job Management | Job photos | ⚠️ Needs audit |
| NCR System | Evidence photos | ⚠️ Needs audit |
| Document Upload | General files | ⚠️ Needs audit |

## Related ADRs

- [ADR-0001: Encryption Standard](./0001-encryption-standard.md) - Encryption algorithm and key management
- [ADR-0002: Audit Chain Standard](./0002-audit-chain-standard.md) - Hash chain implementation

## References

- [NIST SP 800-38D: GCM Mode](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
