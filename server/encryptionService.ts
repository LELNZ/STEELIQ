import crypto from 'crypto';

// Encryption service for sensitive data (Fortune 50 compliance)
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private secretKey: Buffer;
  private saltLength = 32;
  private ivLength = 16;
  private tagLength = 16;

  constructor() {
    // Fortune 50 Compliance: Enforce encryption key requirement
    if (!process.env.ENCRYPTION_KEY) {
      // Allow in development with strong warning
      if (process.env.NODE_ENV === 'development') {
        console.error('⚠️  CRITICAL SECURITY WARNING: ENCRYPTION_KEY not set!');
        console.error('⚠️  Using temporary key for development only.');
        console.error('⚠️  Generate production key: openssl rand -base64 32');
        
        // Use a development-only temporary key
        const tempKey = crypto.randomBytes(32).toString('base64');
        this.secretKey = crypto.pbkdf2Sync(tempKey, crypto.randomBytes(32), 100000, 32, 'sha256');
        return;
      }
      
      // Reject in production
      throw new Error(
        'SECURITY VIOLATION: ENCRYPTION_KEY environment variable is required in production. ' +
        'Set a secure 32+ character key. Generate with: openssl rand -base64 32'
      );
    }
    
    // Validate key strength
    if (process.env.ENCRYPTION_KEY.length < 32) {
      throw new Error(
        'SECURITY VIOLATION: ENCRYPTION_KEY must be at least 32 characters long. ' +
        'Current length: ' + process.env.ENCRYPTION_KEY.length
      );
    }
    
    // CRITICAL FIX: Use deterministic salt derived from the key itself
    // This ensures the same key always produces the same encryption result
    // across application restarts, preventing data loss
    const deterministicSalt = crypto
      .createHash('sha256')
      .update('steeliq-payroll-salt-v1:' + process.env.ENCRYPTION_KEY)
      .digest();
    
    // Derive the actual encryption key using PBKDF2 with deterministic salt
    // This provides key stretching while maintaining consistency across restarts
    this.secretKey = crypto.pbkdf2Sync(
      process.env.ENCRYPTION_KEY, 
      deterministicSalt, 
      100000,  // iterations for security
      32,      // key length (256 bits)
      'sha256' // hash algorithm
    );
  }

  /**
   * Encrypt sensitive data with AES-256-GCM
   */
  encrypt(text: string): string {
    if (!text) return '';

    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
      
      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV + authTag + encrypted data
      const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]);
      
      // Return base64 encoded
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data encrypted with encrypt()
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return '';

    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const iv = combined.slice(0, this.ivLength);
      const authTag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  hash(text: string): string {
    if (!text) return '';
    
    const salt = crypto.randomBytes(this.saltLength);
    const hash = crypto.pbkdf2Sync(text, salt, 100000, 64, 'sha512');
    
    return salt.toString('hex') + ':' + hash.toString('hex');
  }

  /**
   * Verify hashed data
   */
  verifyHash(text: string, hashedText: string): boolean {
    if (!text || !hashedText) return false;
    
    try {
      const [salt, originalHash] = hashedText.split(':');
      const hash = crypto.pbkdf2Sync(text, Buffer.from(salt, 'hex'), 100000, 64, 'sha512');
      
      return hash.toString('hex') === originalHash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate secure random tokens
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt object (JSON)
   */
  encryptObject(obj: any): string {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * Decrypt object (JSON)
   */
  decryptObject(encryptedData: string): any {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }

  /**
   * Rotate encryption key (for key rotation policies)
   */
  async rotateKey(oldKey: string, newKey: string, reencryptCallback: (decrypt: (data: string) => string, encrypt: (data: string) => string) => Promise<void>): Promise<void> {
    // Create temporary instance with old key
    const oldEncryption = new EncryptionService();
    oldEncryption.secretKey = crypto.pbkdf2Sync(oldKey, 'steeliq-payroll-salt', 100000, 32, 'sha256');
    
    // Update to new key
    this.secretKey = crypto.pbkdf2Sync(newKey, 'steeliq-payroll-salt', 100000, 32, 'sha256');
    
    // Call the callback to re-encrypt all data
    await reencryptCallback(
      (data) => oldEncryption.decrypt(data),
      (data) => this.encrypt(data)
    );
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();