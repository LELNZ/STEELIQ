/**
 * Photo Evidence Migration Script
 * 
 * Purpose: Migrate existing time clock photos to Fortune 50 compliant storage
 * - Encrypts photos with AES-256-GCM (ADR-0001)
 * - Establishes SHA-256 hash chain for tamper detection (ADR-0002)
 * - Stores in secure_files + photo_evidence tables (ADR-0005)
 * 
 * Usage: npx tsx scripts/photoEvidenceMigration.ts [--dry-run] [--batch-size=100]
 * 
 * @see docs/architecture-decisions/0001-encryption-standard.md
 * @see docs/architecture-decisions/0002-audit-chain-standard.md
 * @see docs/architecture-decisions/0005-file-storage-standard.md
 */

import { db } from '../server/db';
import { timeClocks, photoEvidence, secureFiles, users } from '../shared/schema';
import { eq, isNotNull, sql, and, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// Configuration - ADR-0001: No fallback keys allowed
const CONFIG = {
  BATCH_SIZE: parseInt(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '100'),
  DRY_RUN: process.argv.includes('--dry-run'),
  ENCRYPTION_KEY_ENV: 'PHOTO_ENCRYPTION_KEY',
};

// Statistics tracking
interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  placeholders: number;
  missingFiles: number;
  alreadyMigrated: number;
}

const stats: MigrationStats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
  placeholders: 0,
  missingFiles: 0,
  alreadyMigrated: 0,
};

/**
 * Get encryption key - ADR-0001: MUST use dedicated PHOTO_ENCRYPTION_KEY, NO FALLBACKS
 */
function getEncryptionKey(): Buffer {
  const key = process.env[CONFIG.ENCRYPTION_KEY_ENV];
  
  if (!key) {
    // ADR-0001: No fallbacks allowed - dedicated key is mandatory
    throw new Error(
      `❌ CRITICAL: ${CONFIG.ENCRYPTION_KEY_ENV} environment variable is required.\n` +
      `   ADR-0001 mandates dedicated encryption keys - no fallbacks allowed.\n` +
      `   Generate a key: openssl rand -hex 32`
    );
  }
  
  return crypto.scryptSync(key, 'photo-evidence-salt', 32);
}

/**
 * Encrypt file content with AES-256-GCM per ADR-0001
 */
function encryptFile(buffer: Buffer, key: Buffer): { encrypted: Buffer; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12); // 12-byte IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Calculate SHA-256 hash of file content
 */
function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculate chain hash per ADR-0002
 */
function calculateChainHash(fileHash: string, metadata: object, previousHash: string): string {
  const data = JSON.stringify({ fileHash, metadata, previousHash });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get the last hash in the photo_evidence chain for a given record type
 */
async function getLastChainHash(recordType: string): Promise<string> {
  const lastRecord = await db
    .select({ currentHash: photoEvidence.currentHash })
    .from(photoEvidence)
    .where(eq(sql`${photoEvidence}.record_type`, recordType))
    .orderBy(sql`${photoEvidence.id} DESC`)
    .limit(1);
  
  if (lastRecord.length === 0 || !lastRecord[0].currentHash) {
    return 'GENESIS'; // First record in chain per ADR-0002
  }
  
  return lastRecord[0].currentHash;
}

/**
 * Resolve photo file path from URL
 */
function resolvePhotoPath(photoUrl: string): string | null {
  if (!photoUrl) return null;
  
  // Handle different URL patterns
  if (photoUrl.includes('placeholder')) {
    return null; // Placeholder, skip
  }
  
  // /api/photos/time-clock/{hash}.jpg -> uploads/photos/time-clock/{hash}.jpg
  if (photoUrl.startsWith('/api/photos/')) {
    return path.join(process.cwd(), 'uploads', photoUrl.replace('/api/', ''));
  }
  
  // /photos/{name} -> uploads/photos/{name}
  if (photoUrl.startsWith('/photos/')) {
    return path.join(process.cwd(), 'uploads', photoUrl);
  }
  
  // uploads/ or secure-uploads/ paths
  if (photoUrl.startsWith('uploads/') || photoUrl.startsWith('secure-uploads/')) {
    return path.join(process.cwd(), photoUrl);
  }
  
  // Absolute path
  if (photoUrl.startsWith('/')) {
    return photoUrl;
  }
  
  return null;
}

/**
 * Check if a time clock entry has already been migrated
 */
async function isAlreadyMigrated(clockId: number): Promise<boolean> {
  const existing = await db
    .select({ id: photoEvidence.id })
    .from(photoEvidence)
    .where(eq(photoEvidence.clockId, clockId))
    .limit(1);
  
  return existing.length > 0;
}

/**
 * Migrate a single photo to secure storage
 */
async function migratePhoto(
  clockEntry: {
    id: number;
    userId: number;
    photoUrl: string;
    timestamp: Date;
    clockType: string;
  },
  encryptionKey: Buffer,
  previousHash: string
): Promise<{ success: boolean; newHash: string | null; error?: string }> {
  try {
    // Check if already migrated
    if (await isAlreadyMigrated(clockEntry.id)) {
      stats.alreadyMigrated++;
      return { success: true, newHash: null };
    }
    
    // Check for placeholder
    if (clockEntry.photoUrl.includes('placeholder')) {
      stats.placeholders++;
      return { success: true, newHash: null };
    }
    
    // Resolve file path
    const filePath = resolvePhotoPath(clockEntry.photoUrl);
    if (!filePath) {
      stats.skipped++;
      return { success: true, newHash: null };
    }
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      stats.missingFiles++;
      console.log(`  📁 File not found: ${filePath}`);
      return { success: true, newHash: null };
    }
    
    // Read file
    const fileBuffer = await fs.readFile(filePath);
    const fileHash = calculateFileHash(fileBuffer);
    const fileName = path.basename(filePath);
    const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    // Encrypt file per ADR-0001
    const { encrypted, iv, authTag } = encryptFile(fileBuffer, encryptionKey);
    
    if (CONFIG.DRY_RUN) {
      console.log(`  🔐 [DRY RUN] Would encrypt and store: ${fileName} (${fileBuffer.length} bytes)`);
      const chainHash = calculateChainHash(fileHash, { clockId: clockEntry.id }, previousHash);
      return { success: true, newHash: chainHash };
    }
    
    // Store encrypted file in secure_files
    const fileId = `photo_${clockEntry.id}_${Date.now()}`;
    
    await db.insert(secureFiles).values({
      fileId,
      fileName,
      mimeType,
      fileSize: fileBuffer.length,
      encryptedData: encrypted,
      encryptionIv: iv,
      encryptionAuthTag: authTag,
      storagePath: `secure-photos/time-clock/${clockEntry.userId}/${fileName}`,
      storageType: 'database',
      metadata: {
        originalPath: clockEntry.photoUrl,
        originalHash: fileHash,
        migratedAt: new Date().toISOString(),
        migrationVersion: '1.0'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Get the inserted secure_file ID
    const [insertedFile] = await db
      .select({ id: secureFiles.id })
      .from(secureFiles)
      .where(eq(secureFiles.fileId, fileId))
      .limit(1);
    
    // Calculate chain hash per ADR-0002
    const metadata = {
      clockId: clockEntry.id,
      userId: clockEntry.userId,
      clockType: clockEntry.clockType,
      captureTimestamp: clockEntry.timestamp
    };
    const currentHash = calculateChainHash(fileHash, metadata, previousHash);
    
    // Create photo_evidence record with hash chain
    await db.insert(photoEvidence).values({
      clockId: clockEntry.id,
      userId: clockEntry.userId,
      filename: fileName,
      filepath: `secure-photos/time-clock/${clockEntry.userId}/${fileName}`,
      mimeType,
      fileSize: fileBuffer.length,
      fileHash,
      encryptionMethod: 'AES-256-GCM',
      encryptionKeyId: CONFIG.ENCRYPTION_KEY_ENV,
      captureMethod: 'migration',
      captureTimestamp: clockEntry.timestamp,
      previousHash,
      currentHash,
      chainValid: true,
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      verificationMethod: 'migration_hash',
      secureFileId: insertedFile.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    stats.migrated++;
    console.log(`  ✅ Migrated: ${fileName} -> secure_files (chain hash: ${currentHash.substring(0, 16)}...)`);
    
    return { success: true, newHash: currentHash };
    
  } catch (error) {
    stats.errors++;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Error migrating clock ${clockEntry.id}: ${errorMessage}`);
    return { success: false, newHash: null, error: errorMessage };
  }
}

/**
 * Main migration function
 */
async function runMigration(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     STEELIQ Photo Evidence Migration - Fortune 50 Compliance  ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Mode: ${CONFIG.DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}                              ║`);
  console.log(`║  Batch Size: ${CONFIG.BATCH_SIZE}                                              ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Verify encryption key per ADR-0001
  let encryptionKey: Buffer;
  try {
    encryptionKey = getEncryptionKey();
    console.log('✅ Encryption key loaded');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  
  // Get total count of photos to migrate
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(timeClocks)
    .where(isNotNull(timeClocks.photoUrl));
  
  stats.total = Number(countResult.count);
  console.log(`📊 Total time clocks with photos: ${stats.total}`);
  console.log('');
  
  // Process in batches
  let offset = 0;
  let previousHash = await getLastChainHash('time_clock');
  console.log(`🔗 Starting chain from: ${previousHash === 'GENESIS' ? 'GENESIS (new chain)' : previousHash.substring(0, 16) + '...'}`);
  console.log('');
  
  while (offset < stats.total) {
    const batch = await db
      .select({
        id: timeClocks.id,
        userId: timeClocks.userId,
        photoUrl: timeClocks.photoUrl,
        timestamp: timeClocks.timestamp,
        clockType: timeClocks.clockType
      })
      .from(timeClocks)
      .where(isNotNull(timeClocks.photoUrl))
      .orderBy(timeClocks.id)
      .limit(CONFIG.BATCH_SIZE)
      .offset(offset);
    
    if (batch.length === 0) break;
    
    console.log(`📦 Processing batch ${Math.floor(offset / CONFIG.BATCH_SIZE) + 1} (${batch.length} records)...`);
    
    for (const entry of batch) {
      const result = await migratePhoto(
        {
          id: entry.id,
          userId: entry.userId,
          photoUrl: entry.photoUrl!,
          timestamp: entry.timestamp,
          clockType: entry.clockType
        },
        encryptionKey,
        previousHash
      );
      
      if (result.newHash) {
        previousHash = result.newHash;
      }
    }
    
    offset += CONFIG.BATCH_SIZE;
  }
  
  // Print summary
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    MIGRATION SUMMARY                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Records:        ${stats.total.toString().padStart(6)}                              ║`);
  console.log(`║  Migrated:             ${stats.migrated.toString().padStart(6)}                              ║`);
  console.log(`║  Already Migrated:     ${stats.alreadyMigrated.toString().padStart(6)}                              ║`);
  console.log(`║  Placeholders (skip):  ${stats.placeholders.toString().padStart(6)}                              ║`);
  console.log(`║  Missing Files:        ${stats.missingFiles.toString().padStart(6)}                              ║`);
  console.log(`║  Skipped (other):      ${stats.skipped.toString().padStart(6)}                              ║`);
  console.log(`║  Errors:               ${stats.errors.toString().padStart(6)}                              ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  if (stats.missingFiles > 0) {
    console.log('');
    console.log('⚠️  NOTE: Missing files are likely test/placeholder data.');
    console.log('   Real photos uploaded going forward will use secure storage.');
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('');
    console.log('✅ Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
