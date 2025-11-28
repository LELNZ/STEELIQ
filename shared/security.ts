/**
 * Fortune 50 Compliant Security Module
 * Provides cryptographic audit trails, dual-authorization, and session signing
 */

import { createHash, randomBytes, createHmac } from 'crypto';
import { z } from 'zod';

/**
 * SHA-256 Hash Chain for Immutable Audit Trail
 */
export class HashChain {
  private previousHash: string;
  private chainId: string;

  constructor(chainId: string, genesisHash?: string) {
    this.chainId = chainId;
    this.previousHash = genesisHash || this.createGenesisHash();
  }

  private createGenesisHash(): string {
    const genesis = {
      chainId: this.chainId,
      timestamp: new Date().toISOString(),
      type: 'GENESIS',
      nonce: randomBytes(16).toString('hex')
    };
    return createHash('sha256').update(JSON.stringify(genesis)).digest('hex');
  }

  public addBlock(data: any): AuditBlock {
    const block: AuditBlock = {
      index: Date.now(),
      timestamp: new Date().toISOString(),
      data,
      previousHash: this.previousHash,
      hash: '',
      nonce: randomBytes(16).toString('hex')
    };

    // Calculate hash including previous hash for chain integrity
    const blockData = {
      ...block,
      hash: undefined
    };
    block.hash = createHash('sha256').update(JSON.stringify(blockData)).digest('hex');
    
    this.previousHash = block.hash;
    return block;
  }

  public verifyChain(blocks: AuditBlock[]): boolean {
    for (let i = 1; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      const previousBlock = blocks[i - 1];

      // Verify hash integrity
      const blockData = {
        ...currentBlock,
        hash: undefined
      };
      const calculatedHash = createHash('sha256').update(JSON.stringify(blockData)).digest('hex');
      
      if (currentBlock.hash !== calculatedHash) return false;
      if (currentBlock.previousHash !== previousBlock.hash) return false;
    }
    return true;
  }
}

/**
 * Audit Block Structure
 */
export interface AuditBlock {
  index: number;
  timestamp: string;
  data: any;
  previousHash: string;
  hash: string;
  nonce: string;
}

/**
 * Audit Context for All Critical Operations
 */
export const auditContextSchema = z.object({
  userId: z.number(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.union([z.string(), z.number()]),
  ipAddress: z.string(),
  userAgent: z.string(),
  sessionId: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.any()).optional(),
  hashChainId: z.string(),
  previousHash: z.string().optional(),
  complianceFlags: z.array(z.string()).optional()
});

export type AuditContext = z.infer<typeof auditContextSchema>;

/**
 * Dual Authorization Request
 */
export const dualAuthRequestSchema = z.object({
  requestId: z.string(),
  requestType: z.enum(['GPS_OVERRIDE', 'BULK_CORRECTION', 'PERMISSION_CHANGE', 'DATA_DELETION']),
  requesterId: z.number(),
  requesterName: z.string(),
  approverId: z.number().optional(),
  approverName: z.string().optional(),
  resourceType: z.string(),
  resourceId: z.union([z.string(), z.number()]),
  action: z.string(),
  reason: z.string(),
  metadata: z.record(z.any()),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']),
  createdAt: z.string(),
  expiresAt: z.string(),
  approvedAt: z.string().optional(),
  approvalHash: z.string().optional(),
  rejectionReason: z.string().optional()
});

export type DualAuthRequest = z.infer<typeof dualAuthRequestSchema>;

/**
 * Dual Authorization Manager
 */
export class DualAuthorizationManager {
  private pendingRequests: Map<string, DualAuthRequest> = new Map();
  private approvalSecret: string;
  private isHydrated: boolean = false;

  constructor(approvalSecret: string) {
    this.approvalSecret = approvalSecret;
  }

  /**
   * Fortune 50 Compliance: Hydrate pending requests from database on startup
   * This ensures pending approvals survive server restarts
   * @param requests Array of pending DualAuthRequest records from database
   */
  public hydratePendingRequests(requests: DualAuthRequest[]): void {
    // Guard against duplicate hydration on hot reloads
    if (this.isHydrated) {
      console.warn('[DualAuthManager] Already hydrated, clearing stale entries before re-hydrating');
      this.pendingRequests.clear();
    }

    const now = new Date();
    let hydratedCount = 0;
    let expiredCount = 0;

    for (const request of requests) {
      // Only load non-expired pending requests
      if (request.status === 'PENDING' && new Date(request.expiresAt) > now) {
        this.pendingRequests.set(request.requestId, request);
        hydratedCount++;
      } else if (new Date(request.expiresAt) <= now) {
        expiredCount++;
      }
    }

    this.isHydrated = true;
    console.log(`[DualAuthManager] Hydration complete: ${hydratedCount} pending requests loaded, ${expiredCount} expired skipped`);
  }

  /**
   * Check if the manager has been hydrated from database
   */
  public getHydrationStatus(): { isHydrated: boolean; pendingCount: number } {
    return {
      isHydrated: this.isHydrated,
      pendingCount: this.pendingRequests.size
    };
  }

  /**
   * Get a specific request by ID (for database sync verification)
   */
  public getRequest(requestId: string): DualAuthRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  public createRequest(params: Omit<DualAuthRequest, 'requestId' | 'status' | 'createdAt' | 'expiresAt'>): DualAuthRequest {
    const request: DualAuthRequest = {
      ...params,
      requestId: randomBytes(16).toString('hex'),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minute expiry
    };

    this.pendingRequests.set(request.requestId, request);
    return request;
  }

  public approveRequest(requestId: string, approverId: number, approverName: string): DualAuthRequest | null {
    const request = this.pendingRequests.get(requestId);
    if (!request || request.status !== 'PENDING') return null;
    
    // Check if expired
    if (new Date(request.expiresAt) < new Date()) {
      request.status = 'EXPIRED';
      return request;
    }

    // Cannot self-approve
    if (request.requesterId === approverId) {
      throw new Error('Self-approval not permitted for dual authorization');
    }

    // Generate approval hash
    const approvalData = {
      requestId,
      approverId,
      approverName,
      timestamp: new Date().toISOString(),
      requestData: request
    };
    
    request.approverId = approverId;
    request.approverName = approverName;
    request.status = 'APPROVED';
    request.approvedAt = new Date().toISOString();
    request.approvalHash = createHmac('sha256', this.approvalSecret)
      .update(JSON.stringify(approvalData))
      .digest('hex');

    return request;
  }

  public rejectRequest(requestId: string, approverId: number, reason: string): DualAuthRequest | null {
    const request = this.pendingRequests.get(requestId);
    if (!request || request.status !== 'PENDING') return null;

    request.approverId = approverId;
    request.status = 'REJECTED';
    request.rejectionReason = reason;
    request.approvedAt = new Date().toISOString();

    return request;
  }

  public verifyApproval(request: DualAuthRequest): boolean {
    if (request.status !== 'APPROVED' || !request.approvalHash) return false;

    const approvalData = {
      requestId: request.requestId,
      approverId: request.approverId,
      approverName: request.approverName,
      timestamp: request.approvedAt,
      requestData: {
        ...request,
        approvalHash: undefined,
        approvedAt: undefined,
        approverId: undefined,
        approverName: undefined
      }
    };

    const calculatedHash = createHmac('sha256', this.approvalSecret)
      .update(JSON.stringify(approvalData))
      .digest('hex');

    return calculatedHash === request.approvalHash;
  }

  public getPendingRequests(): DualAuthRequest[] {
    return Array.from(this.pendingRequests.values())
      .filter(r => r.status === 'PENDING' && new Date(r.expiresAt) > new Date());
  }

  public cleanupExpired(): void {
    for (const [id, request] of this.pendingRequests) {
      if (new Date(request.expiresAt) < new Date()) {
        request.status = 'EXPIRED';
        this.pendingRequests.delete(id);
      }
    }
  }
}

/**
 * Kiosk Session Signing
 */
export const kioskSessionSchema = z.object({
  sessionId: z.string(),
  deviceId: z.string(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number()
  }),
  startTime: z.string(),
  endTime: z.string().optional(),
  activeUserId: z.number().optional(),
  signature: z.string(),
  certificateChain: z.array(z.string()),
  metadata: z.object({
    deviceModel: z.string(),
    osVersion: z.string(),
    appVersion: z.string(),
    networkType: z.string()
  })
});

export type KioskSession = z.infer<typeof kioskSessionSchema>;

/**
 * Kiosk Session Manager with Cryptographic Signing
 */
export class KioskSessionManager {
  private signingKey: string;
  private activeSessions: Map<string, KioskSession> = new Map();

  constructor(signingKey: string) {
    this.signingKey = signingKey;
  }

  public createSession(deviceId: string, location: KioskSession['location'], metadata: KioskSession['metadata']): KioskSession {
    const sessionId = randomBytes(32).toString('hex');
    
    const session: KioskSession = {
      sessionId,
      deviceId,
      location,
      startTime: new Date().toISOString(),
      signature: '',
      certificateChain: [],
      metadata
    };

    // Sign the session
    const sessionData = {
      ...session,
      signature: undefined,
      certificateChain: undefined
    };
    
    session.signature = createHmac('sha256', this.signingKey)
      .update(JSON.stringify(sessionData))
      .digest('hex');
    
    // Generate certificate chain (simplified for example)
    session.certificateChain = [
      this.generateCertificate('ROOT', this.signingKey),
      this.generateCertificate('INTERMEDIATE', session.sessionId),
      this.generateCertificate('SESSION', session.signature)
    ];

    this.activeSessions.set(sessionId, session);
    return session;
  }

  private generateCertificate(type: string, data: string): string {
    const cert = {
      type,
      data: createHash('sha256').update(data).digest('hex'),
      timestamp: new Date().toISOString(),
      issuer: 'STEELIQ_KIOSK_CA'
    };
    return Buffer.from(JSON.stringify(cert)).toString('base64');
  }

  public verifySession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    const sessionData = {
      ...session,
      signature: undefined,
      certificateChain: undefined
    };

    const calculatedSignature = createHmac('sha256', this.signingKey)
      .update(JSON.stringify(sessionData))
      .digest('hex');

    return calculatedSignature === session.signature;
  }

  public endSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.endTime = new Date().toISOString();
      // Archive session for audit
      this.archiveSession(session);
      this.activeSessions.delete(sessionId);
    }
  }

  private archiveSession(session: KioskSession): void {
    // In production, this would persist to database
    console.log('Archiving kiosk session:', session.sessionId);
  }

  public getActiveSession(sessionId: string): KioskSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  public getAllActiveSessions(): KioskSession[] {
    return Array.from(this.activeSessions.values());
  }
}

/**
 * GPS Breadcrumb Analytics
 */
export const gpsBreadcrumbSchema = z.object({
  userId: z.number(),
  timestamp: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number(),
  altitude: z.number().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  batteryLevel: z.number().min(0).max(100),
  isCharging: z.boolean(),
  networkType: z.string(),
  signalStrength: z.number().optional(),
  sessionHash: z.string(),
  previousBreadcrumbHash: z.string().optional()
});

export type GPSBreadcrumb = z.infer<typeof gpsBreadcrumbSchema>;

/**
 * 30-Second GPS Breadcrumb Analyzer
 */
export class BreadcrumbAnalyzer {
  private readonly INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_SPEED_KMH = 200; // Maximum realistic speed
  private readonly STATIONARY_THRESHOLD_M = 10; // Movement threshold

  public analyzeBreadcrumbs(breadcrumbs: GPSBreadcrumb[]): BreadcrumbAnalytics {
    if (breadcrumbs.length < 2) {
      return {
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        stationaryTime: 0,
        movingTime: 0,
        anomalies: [],
        batteryDrain: 0,
        gpsGaps: []
      };
    }

    const sorted = breadcrumbs.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let totalDistance = 0;
    let maxSpeed = 0;
    let stationaryTime = 0;
    let movingTime = 0;
    const anomalies: string[] = [];
    const gpsGaps: Array<{ start: string; end: string; duration: number }> = [];
    
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      
      const distance = this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
      
      const timeDiff = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
      
      // Check for GPS gaps (> 60 seconds)
      if (timeDiff > 60) {
        gpsGaps.push({
          start: prev.timestamp,
          end: curr.timestamp,
          duration: timeDiff
        });
      }
      
      const speed = (distance / timeDiff) * 3.6; // Convert to km/h
      
      // Detect anomalies
      if (speed > this.MAX_SPEED_KMH) {
        anomalies.push(`Impossible speed detected: ${speed.toFixed(2)} km/h at ${curr.timestamp}`);
      }
      
      if (curr.accuracy > 50) {
        anomalies.push(`Poor GPS accuracy: ${curr.accuracy}m at ${curr.timestamp}`);
      }
      
      // Track movement
      if (distance < this.STATIONARY_THRESHOLD_M) {
        stationaryTime += timeDiff;
      } else {
        movingTime += timeDiff;
        totalDistance += distance;
      }
      
      maxSpeed = Math.max(maxSpeed, speed);
    }

    const batteryDrain = sorted[0].batteryLevel - sorted[sorted.length - 1].batteryLevel;
    const averageSpeed = totalDistance / (movingTime || 1) * 3.6;

    return {
      totalDistance,
      averageSpeed,
      maxSpeed,
      stationaryTime,
      movingTime,
      anomalies,
      batteryDrain,
      gpsGaps
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  public detectMockLocation(breadcrumbs: GPSBreadcrumb[]): boolean {
    // Check for perfectly consistent accuracy (sign of mocking)
    const accuracies = breadcrumbs.map(b => b.accuracy);
    const uniqueAccuracies = new Set(accuracies);
    
    if (uniqueAccuracies.size === 1 && breadcrumbs.length > 10) {
      return true; // Suspicious: exact same accuracy for all points
    }

    // Check for impossible jumps
    for (let i = 1; i < breadcrumbs.length; i++) {
      const prev = breadcrumbs[i - 1];
      const curr = breadcrumbs[i];
      
      const distance = this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
      
      const timeDiff = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
      const speed = (distance / timeDiff) * 3.6;
      
      if (speed > 500) { // Impossibly fast (> 500 km/h)
        return true;
      }
    }

    return false;
  }
}

export interface BreadcrumbAnalytics {
  totalDistance: number; // meters
  averageSpeed: number; // km/h
  maxSpeed: number; // km/h
  stationaryTime: number; // seconds
  movingTime: number; // seconds
  anomalies: string[];
  batteryDrain: number; // percentage
  gpsGaps: Array<{
    start: string;
    end: string;
    duration: number; // seconds
  }>;
}

/**
 * Security Utilities
 */
export class SecurityUtils {
  public static generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  public static hashPassword(password: string, salt: string): string {
    return createHash('sha256')
      .update(password + salt)
      .digest('hex');
  }

  public static generateAuditId(): string {
    return `AUDIT_${Date.now()}_${randomBytes(8).toString('hex').toUpperCase()}`;
  }

  public static sanitizeInput(input: string): string {
    // Remove potential SQL injection and XSS vectors
    return input
      .replace(/[<>'"]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .trim();
  }

  public static validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}

// Export singleton instances for use across the application
export const hashChain = new HashChain('STEELIQ_MAIN_CHAIN');
export const dualAuthManager = new DualAuthorizationManager(process.env.DUAL_AUTH_SECRET || 'default-secret');
export const kioskManager = new KioskSessionManager(process.env.KIOSK_SIGNING_KEY || 'default-key');
export const breadcrumbAnalyzer = new BreadcrumbAnalyzer();