/**
 * Secure Storage Service for Fortune 50 Enterprise Deployment
 * Provides abstraction for cloud storage with security and scalability
 * Supports S3-compatible storage and database-backed file system
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

interface StorageProvider {
  type: 'database' | 's3' | 'local';
  config?: any;
}

interface StoredFile {
  id: string;
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
  metadata?: Record<string, any>;
  url?: string;
  expiresAt?: Date;
  createdAt: Date;
}

interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  ttlSeconds?: number;
  publicAccess?: boolean;
  maxSizeMB?: number;
}

class SecureStorageService {
  private provider: StorageProvider;
  private encryptionKey: Buffer;
  
  constructor(provider: StorageProvider = { type: 'database' }) {
    this.provider = provider;
    // Generate or load encryption key (in production, use KMS or environment variable)
    this.encryptionKey = this.getEncryptionKey();
  }

  /**
   * Store a file securely
   */
  async storeFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    options: StorageOptions = {}
  ): Promise<StoredFile> {
    const {
      encrypt = true,
      compress = false,
      ttlSeconds = 86400, // 24 hours default
      publicAccess = false,
      maxSizeMB = 50
    } = options;

    // Validate file size
    const sizeMB = fileBuffer.length / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      throw new Error(`File size ${sizeMB.toFixed(2)}MB exceeds limit of ${maxSizeMB}MB`);
    }

    // Generate secure file key
    const fileId = this.generateFileId();
    const fileKey = this.generateSecureKey(fileName, fileId);

    // Process file (encrypt/compress if needed)
    let processedBuffer = fileBuffer;
    
    if (compress) {
      processedBuffer = await this.compressFile(processedBuffer);
    }
    
    if (encrypt) {
      processedBuffer = await this.encryptFile(processedBuffer);
    }

    // Store based on provider
    let storedFile: StoredFile;
    
    switch (this.provider.type) {
      case 'database':
        storedFile = await this.storeInDatabase(
          fileId,
          fileKey,
          fileName,
          mimeType,
          processedBuffer,
          ttlSeconds
        );
        break;
        
      case 's3':
        storedFile = await this.storeInS3(
          fileId,
          fileKey,
          fileName,
          mimeType,
          processedBuffer,
          ttlSeconds,
          publicAccess
        );
        break;
        
      case 'local':
        // Fallback for development only
        storedFile = await this.storeLocally(
          fileId,
          fileKey,
          fileName,
          mimeType,
          processedBuffer,
          ttlSeconds
        );
        break;
        
      default:
        throw new Error('Invalid storage provider');
    }

    // Log storage event for audit
    await this.logStorageEvent('STORE', fileId, fileName, sizeMB);

    return storedFile;
  }

  /**
   * Retrieve a file securely
   */
  async retrieveFile(fileId: string, decrypt: boolean = true): Promise<{
    buffer: Buffer;
    metadata: StoredFile;
  }> {
    let fileData: { buffer: Buffer; metadata: StoredFile };

    switch (this.provider.type) {
      case 'database':
        fileData = await this.retrieveFromDatabase(fileId);
        break;
        
      case 's3':
        fileData = await this.retrieveFromS3(fileId);
        break;
        
      case 'local':
        fileData = await this.retrieveLocally(fileId);
        break;
        
      default:
        throw new Error('Invalid storage provider');
    }

    // Decrypt if needed
    if (decrypt) {
      fileData.buffer = await this.decryptFile(fileData.buffer);
    }

    // Log retrieval event
    await this.logStorageEvent('RETRIEVE', fileId);

    return fileData;
  }

  /**
   * Generate a signed URL for temporary access
   */
  async generateSignedUrl(
    fileId: string,
    expirationSeconds: number = 3600
  ): Promise<string> {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + expirationSeconds * 1000);

    // Store token in database
    await db.execute(sql`
      INSERT INTO secure_file_tokens (
        file_id, token, expires_at, created_at
      ) VALUES (
        ${fileId}, ${token}, ${expiresAt}, ${new Date()}
      )
    `);

    // Generate URL based on environment
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    return `${baseUrl}/api/files/download/${fileId}?token=${token}`;
  }

  /**
   * Delete a file securely
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      switch (this.provider.type) {
        case 'database':
          await this.deleteFromDatabase(fileId);
          break;
          
        case 's3':
          await this.deleteFromS3(fileId);
          break;
          
        case 'local':
          await this.deleteLocally(fileId);
          break;
      }

      // Log deletion event
      await this.logStorageEvent('DELETE', fileId);

      return true;
    } catch (error) {
      console.error(`Failed to delete file ${fileId}:`, error);
      return false;
    }
  }

  /**
   * Database storage implementation
   */
  private async storeInDatabase(
    fileId: string,
    fileKey: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer,
    ttlSeconds: number
  ): Promise<StoredFile> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    // Store file metadata and data in database
    await db.execute(sql`
      INSERT INTO secure_files (
        id, key, file_name, mime_type, size, data, 
        expires_at, created_at
      ) VALUES (
        ${fileId}, ${fileKey}, ${fileName}, ${mimeType}, 
        ${buffer.length}, ${buffer}, ${expiresAt}, ${new Date()}
      )
    `);

    return {
      id: fileId,
      key: fileKey,
      fileName,
      mimeType,
      size: buffer.length,
      expiresAt,
      createdAt: new Date()
    };
  }

  private async retrieveFromDatabase(fileId: string): Promise<{
    buffer: Buffer;
    metadata: StoredFile;
  }> {
    const result = await db.execute(sql`
      SELECT * FROM secure_files 
      WHERE id = ${fileId} 
      AND (expires_at > NOW() OR expires_at IS NULL)
    `);

    if (!result.rows || result.rows.length === 0) {
      throw new Error('File not found or expired');
    }

    const file = result.rows[0];
    
    return {
      buffer: Buffer.from(file.data as any),
      metadata: {
        id: file.id as string,
        key: file.key as string,
        fileName: file.file_name as string,
        mimeType: file.mime_type as string,
        size: file.size as number,
        expiresAt: file.expires_at as Date,
        createdAt: file.created_at as Date
      }
    };
  }

  private async deleteFromDatabase(fileId: string): Promise<void> {
    await db.execute(sql`
      DELETE FROM secure_files WHERE id = ${fileId}
    `);
  }

  /**
   * S3-compatible storage implementation (stub)
   */
  private async storeInS3(
    fileId: string,
    fileKey: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer,
    ttlSeconds: number,
    publicAccess: boolean
  ): Promise<StoredFile> {
    // This would integrate with AWS S3, MinIO, or other S3-compatible storage
    console.log('[S3 Storage] Would store file:', fileKey);
    
    // For now, return mock response
    return {
      id: fileId,
      key: fileKey,
      fileName,
      mimeType,
      size: buffer.length,
      url: `https://s3.example.com/${fileKey}`,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      createdAt: new Date()
    };
  }

  private async retrieveFromS3(fileId: string): Promise<{
    buffer: Buffer;
    metadata: StoredFile;
  }> {
    throw new Error('S3 retrieval not implemented');
  }

  private async deleteFromS3(fileId: string): Promise<void> {
    console.log('[S3 Storage] Would delete file:', fileId);
  }

  /**
   * Local storage implementation (development only)
   */
  private async storeLocally(
    fileId: string,
    fileKey: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer,
    ttlSeconds: number
  ): Promise<StoredFile> {
    const storageDir = path.join(process.cwd(), 'secure_storage');
    await fs.mkdir(storageDir, { recursive: true });
    
    const filePath = path.join(storageDir, fileKey);
    await fs.writeFile(filePath, buffer);
    
    // Store metadata
    const metadataPath = path.join(storageDir, `${fileKey}.meta.json`);
    const metadata = {
      id: fileId,
      key: fileKey,
      fileName,
      mimeType,
      size: buffer.length,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      createdAt: new Date(),
      filePath
    };
    
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    return metadata;
  }

  private async retrieveLocally(fileId: string): Promise<{
    buffer: Buffer;
    metadata: StoredFile;
  }> {
    const storageDir = path.join(process.cwd(), 'secure_storage');
    
    // Find file by ID
    const files = await fs.readdir(storageDir);
    const metaFile = files.find(f => f.includes(fileId) && f.endsWith('.meta.json'));
    
    if (!metaFile) {
      throw new Error('File not found');
    }
    
    const metadataPath = path.join(storageDir, metaFile);
    const metadataStr = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataStr);
    
    const buffer = await fs.readFile(metadata.filePath);
    
    return { buffer, metadata };
  }

  private async deleteLocally(fileId: string): Promise<void> {
    const storageDir = path.join(process.cwd(), 'secure_storage');
    const files = await fs.readdir(storageDir);
    
    for (const file of files) {
      if (file.includes(fileId)) {
        await fs.unlink(path.join(storageDir, file));
      }
    }
  }

  /**
   * Encryption/Decryption
   */
  private async encryptFile(buffer: Buffer): Promise<Buffer> {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Prepend IV and auth tag to encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private async decryptFile(buffer: Buffer): Promise<Buffer> {
    const algorithm = 'aes-256-gcm';
    
    // Extract IV, auth tag, and encrypted data
    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const encrypted = buffer.slice(32);
    
    const decipher = crypto.createDecipheriv(algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Compression (using built-in zlib)
   */
  private async compressFile(buffer: Buffer): Promise<Buffer> {
    const zlib = await import('zlib');
    return new Promise((resolve, reject) => {
      zlib.gzip(buffer, (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  /**
   * Helper methods
   */
  private generateFileId(): string {
    return `file_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSecureKey(fileName: string, fileId: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(`${fileId}_${fileName}_${Date.now()}`);
    return hash.digest('hex');
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getEncryptionKey(): Buffer {
    // In production, use KMS or secure key management
    const key = process.env.ENCRYPTION_KEY || 'default-development-key-32-bytes!';
    return crypto.scryptSync(key, 'salt', 32);
  }

  private async logStorageEvent(
    action: 'STORE' | 'RETRIEVE' | 'DELETE',
    fileId: string,
    fileName?: string,
    sizeMB?: number
  ): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO storage_audit_log (
          action, file_id, file_name, size_mb, 
          timestamp, user_id
        ) VALUES (
          ${action}, ${fileId}, ${fileName}, ${sizeMB},
          ${new Date()}, ${0} -- Add actual user ID from context
        )
      `);
    } catch (error) {
      console.error('Failed to log storage event:', error);
    }
  }

  /**
   * Clean up expired files (run periodically)
   */
  async cleanupExpiredFiles(): Promise<number> {
    let deleted = 0;

    try {
      if (this.provider.type === 'database') {
        const result = await db.execute(sql`
          DELETE FROM secure_files 
          WHERE expires_at < NOW() 
          RETURNING id
        `);
        deleted = result.rows?.length || 0;
      }

      console.log(`[Storage Cleanup] Deleted ${deleted} expired files`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }

    return deleted;
  }
}

// ---- Back-compat exports (do NOT remove) ----
// Provide a pre-wired instance so both default and named imports work.

// Named instance export for code that does:
//   import { secureStorageService } from './secureStorageService'

// Default export for code that does:
//   import secureStorageService from './secureStorageService'

// ---- Back-compat exports (do NOT remove) ----
// Provide a pre-wired instance so both default and named imports work.

// Named instance export for code that does:
//   import { secureStorageService } from './secureStorageService'

// Default export for code that does:
//   import secureStorageService from './secureStorageService'
// ---- Back-compat exports (single source of truth) ----\n// Provide a pre-wired instance so both default and named imports work.\nconst __secureStorageInstance = new SecureStorageService({ type: 'database' });\n\n// Named instance export for code that does:\n//   import { secureStorageService } from './secureStorageService'\nexport const secureStorageService = __secureStorageInstance;\n\n// Default export for code that does:\n//   import secureStorageService from './secureStorageService'\nexport default __secureStorageInstance;

// ---- Back-compat exports (single source of truth) ----
// Provide a pre-wired instance so both default and named imports work.
const __secureStorageInstance = new SecureStorageService({ type: 'database' });

// Named instance export for code that does:
//   import { secureStorageService } from './secureStorageService'
export const secureStorageService = __secureStorageInstance;

// Default export for code that does:
//   import secureStorageService from './secureStorageService'
export default __secureStorageInstance;
