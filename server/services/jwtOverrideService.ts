import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { storage } from '../storage';
import { gpsOverrideApprovals, users, teamMembers, locationTracking, gpsOverrideAuditLog } from '@shared/schema';
import { eq, and, or, lt, isNull, gt, sql } from 'drizzle-orm';

const db = (storage as any).db;

/**
 * JWT Override Service - Fortune 50 Compliant Dual Authorization
 * 
 * Implements secure token generation and validation for GPS override requests
 * with support for secret rotation, replay attack prevention, and 2FA
 */
export class JWTOverrideService {
  // Token configuration
  private readonly TOKEN_EXPIRY = '5m'; // 5 minutes for security
  private readonly REQUEST_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
  private readonly ALGORITHM = 'HS512'; // HMAC-SHA512
  private readonly PIN_SALT_ROUNDS = 10;

  // Secret management
  private currentSecretVersion: number = 1;
  private secrets: Map<number, string> = new Map();
  
  constructor() {
    this.initializeSecrets();
  }

  /**
   * Initialize JWT secrets from environment
   * Supports dual-secret rotation for in-flight tokens
   */
  private initializeSecrets(): void {
    // Current secret
    const currentSecret = process.env.JWT_SECRET || this.generateSecret();
    this.secrets.set(this.currentSecretVersion, currentSecret);

    // Previous secret for in-flight tokens (if exists)
    const previousSecret = process.env.JWT_SECRET_PREVIOUS;
    if (previousSecret) {
      this.secrets.set(this.currentSecretVersion - 1, previousSecret);
    }

    // Log initialization (without exposing secrets)
    console.log(`[JWT Service] Initialized with ${this.secrets.size} secret(s), current version: ${this.currentSecretVersion}`);
  }

  /**
   * Generate a cryptographically secure secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Create a GPS override request
   */
  async createOverrideRequest(params: {
    requesterId: number;
    employeeId: number;
    clockType: string;
    reason: string;
    overrideCode?: string;
    requestMetadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ requestId: string; expiresAt: Date }> {
    try {
      // Check rate limiting (5 per hour)
      const isAllowed = await this.checkRateLimit(params.requesterId);
      if (!isAllowed) {
        throw new Error('Rate limit exceeded. Maximum 5 override requests per hour.');
      }

      // CRITICAL: Validate requester has supervisor permissions
      const requester = await db.select()
        .from(users)
        .where(eq(users.id, params.requesterId))
        .limit(1);

      if (!requester.length) {
        throw new Error('Invalid requester');
      }

      // Enforce supervisor role validation - Fortune 50 requirement
      const requesterRole = requester[0].role;
      const allowedRoles = ['admin', 'super_admin', 'supervisor', 'manager'];
      
      if (!allowedRoles.includes(requesterRole)) {
        console.error(`[JWT Service] Non-supervisor user ${params.requesterId} (role: ${requesterRole}) attempted override request`);
        throw new Error('Unauthorized: Only supervisors can create GPS override requests');
      }

      // Create the override request
      const expiresAt = new Date(Date.now() + this.REQUEST_EXPIRY_MS);
      
      const [request] = await db.insert(gpsOverrideApprovals).values({
        requesterId: params.requesterId,
        employeeId: params.employeeId,
        clockType: params.clockType,
        reason: params.reason,
        overrideCode: params.overrideCode,
        requestMetadata: params.requestMetadata || {},
        requestIpAddress: params.ipAddress,
        userAgent: params.userAgent,
        status: 'pending',
        expiresAt: expiresAt
      }).returning();

      console.log(`[JWT Service] Created override request ${request.requestId} for employee ${params.employeeId}`);

      // Write to audit log for request creation
      await this.writeAuditLog({
        eventType: 'GPS_OVERRIDE_CREATED',
        approvalId: request.id,
        requestId: request.requestId,
        actorId: params.requesterId,
        actorRole: requesterRole,
        actorName: requester[0].username,
        eventData: {
          employeeId: params.employeeId,
          clockType: params.clockType,
          reason: params.reason,
          metadata: params.requestMetadata
        },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      });

      return {
        requestId: request.requestId,
        expiresAt: request.expiresAt
      };
    } catch (error) {
      console.error('[JWT Service] Error creating override request:', error);
      throw error;
    }
  }

  /**
   * Approve an override request with 2FA verification
   */
  async approveOverrideRequest(params: {
    requestId: string;
    approverId: number;
    approvalPin?: string;
    approvalMethod: 'pin' | 'totp' | 'whatsapp' | 'offline';
    ipAddress?: string;
  }): Promise<{ token: string; jti: string }> {
    try {
      // Get the pending request
      const [request] = await db.select()
        .from(gpsOverrideApprovals)
        .where(and(
          eq(gpsOverrideApprovals.requestId, params.requestId),
          eq(gpsOverrideApprovals.status, 'pending')
        ))
        .limit(1);

      if (!request) {
        throw new Error('Override request not found or already processed');
      }

      // Check if expired
      if (request.expiresAt < new Date()) {
        await db.update(gpsOverrideApprovals)
          .set({ status: 'expired' })
          .where(eq(gpsOverrideApprovals.id, request.id));
        throw new Error('Override request has expired');
      }

      // Verify different supervisors (no self-approval)
      if (request.requesterId === params.approverId) {
        throw new Error('Self-approval not allowed. Another supervisor must approve.');
      }

      // Get approver's user record
      const approver = await db.select()
        .from(users)
        .where(eq(users.id, params.approverId))
        .limit(1);

      if (!approver.length) {
        throw new Error('Invalid approver');
      }

      // Get approver's team member record with PIN info
      const [approverTeamMember] = await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, params.approverId))
        .limit(1);

      if (!approverTeamMember) {
        throw new Error('Approver not found in team members');
      }

      // Check if account is locked due to failed attempts
      if (approverTeamMember.supervisorPinLockedUntil && 
          approverTeamMember.supervisorPinLockedUntil > new Date()) {
        const minutesRemaining = Math.ceil(
          (approverTeamMember.supervisorPinLockedUntil.getTime() - Date.now()) / 60000
        );
        throw new Error(`Account locked due to failed PIN attempts. Try again in ${minutesRemaining} minutes.`);
      }

      // CRITICAL: Validate 2FA PIN
      if (params.approvalMethod === 'pin') {
        if (!params.approvalPin) {
          throw new Error('PIN required for approval');
        }

        if (!approverTeamMember.supervisorPinHash) {
          throw new Error('Supervisor PIN not configured. Please set up your PIN first.');
        }

        // Validate PIN against stored hash
        const isPinValid = await bcrypt.compare(params.approvalPin, approverTeamMember.supervisorPinHash);
        
        if (!isPinValid) {
          // Increment failed attempts
          const failedAttempts = (approverTeamMember.supervisorPinFailedAttempts || 0) + 1;
          const maxAttempts = 5;
          
          let updates: any = {
            supervisorPinFailedAttempts: failedAttempts
          };

          // Lock account after max attempts
          if (failedAttempts >= maxAttempts) {
            updates.supervisorPinLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minute lockout
            console.error(`[JWT Service] Supervisor ${params.approverId} locked after ${maxAttempts} failed PIN attempts`);
          }

          await db.update(teamMembers)
            .set(updates)
            .where(eq(teamMembers.id, approverTeamMember.id));

          throw new Error(`Invalid PIN. ${maxAttempts - failedAttempts} attempts remaining before lockout.`);
        }

        // Reset failed attempts on successful PIN validation
        if (approverTeamMember.supervisorPinFailedAttempts && approverTeamMember.supervisorPinFailedAttempts > 0) {
          await db.update(teamMembers)
            .set({
              supervisorPinFailedAttempts: 0,
              supervisorPinLockedUntil: null
            })
            .where(eq(teamMembers.id, approverTeamMember.id));
        }

        console.log(`[JWT Service] PIN successfully validated for supervisor ${params.approverId}`);
      } else if (params.approvalMethod === 'offline') {
        // For offline approval, verify the offline code
        if (!params.approvalPin) {
          throw new Error('Offline approval code required');
        }
        
        if (!request.offlineApprovalCode || request.offlineApprovalCode !== params.approvalPin) {
          throw new Error('Invalid offline approval code');
        }

        console.log(`[JWT Service] Offline approval code validated for supervisor ${params.approverId}`);
      } else {
        // Other methods (TOTP, WhatsApp) would be implemented here in production
        throw new Error(`Approval method ${params.approvalMethod} not yet implemented`);
      }

      // Store the hashed PIN for audit (do not store plaintext)
      let pinHash: string | null = null;
      if (params.approvalPin && params.approvalMethod === 'pin') {
        pinHash = await bcrypt.hash(params.approvalPin, this.PIN_SALT_ROUNDS);
      }

      // Generate unique JTI for replay prevention
      const jti = crypto.randomUUID();

      // Create JWT token
      const tokenPayload = {
        jti: jti,
        requestId: request.requestId,
        requesterId: request.requesterId,
        approverId: params.approverId,
        employeeId: request.employeeId,
        clockType: request.clockType,
        purpose: 'gps_override',
        approvalMethod: params.approvalMethod
      };

      const token = jwt.sign(tokenPayload, this.secrets.get(this.currentSecretVersion)!, {
        algorithm: this.ALGORITHM as any,
        expiresIn: this.TOKEN_EXPIRY,
        notBefore: 0 // Immediate use
      });

      // Update the request with approval
      await db.update(gpsOverrideApprovals)
        .set({
          approverId: params.approverId,
          approvalPinHash: pinHash,
          approvalMethod: params.approvalMethod,
          status: 'approved',
          approvedAt: new Date(),
          jwtToken: token, // In production, encrypt this
          jti: jti,
          jwtSecretVersion: this.currentSecretVersion,
          approvalIpAddress: params.ipAddress,
          approvalMetadata: {
            approverName: approver[0].username,
            approvalTime: new Date().toISOString()
          }
        })
        .where(eq(gpsOverrideApprovals.id, request.id));

      console.log(`[JWT Service] Override request ${request.requestId} approved by ${params.approverId}`);

      // Write to immutable audit chain for Fortune 50 compliance
      await this.writeAuditLog({
        eventType: 'GPS_OVERRIDE_APPROVED',
        approvalId: request.id,
        requestId: request.requestId,
        actorId: params.approverId,
        actorRole: approver[0].role,
        actorName: approver[0].username,
        eventData: {
          employeeId: request.employeeId,
          requesterId: request.requesterId,
          clockType: request.clockType,
          reason: request.reason,
          jti: jti,
          approvalMethod: params.approvalMethod
        },
        ipAddress: params.ipAddress
      });

      return {
        token: token,
        jti: jti
      };
    } catch (error) {
      console.error('[JWT Service] Error approving override request:', error);
      throw error;
    }
  }

  /**
   * Validate a JWT override token
   */
  async validateOverrideToken(token: string): Promise<{
    valid: boolean;
    requestId?: string;
    employeeId?: number;
    error?: string;
  }> {
    try {
      // Try to verify with current secret first, then previous
      let decoded: any;
      let secretVersion: number | null = null;

      for (const [version, secret] of this.secrets.entries()) {
        try {
          decoded = jwt.verify(token, secret, {
            algorithms: [this.ALGORITHM as any]
          });
          secretVersion = version;
          break;
        } catch (err) {
          // Try next secret
          continue;
        }
      }

      if (!decoded || !secretVersion) {
        return { valid: false, error: 'Invalid token signature' };
      }

      // Check JTI to prevent replay attacks
      const [approval] = await db.select()
        .from(gpsOverrideApprovals)
        .where(and(
          eq(gpsOverrideApprovals.jti, decoded.jti),
          eq(gpsOverrideApprovals.requestId, decoded.requestId)
        ))
        .limit(1);

      if (!approval) {
        return { valid: false, error: 'Token not found or invalid JTI' };
      }

      // Check if already consumed
      if (approval.status === 'consumed') {
        return { valid: false, error: 'Token already used' };
      }

      // Check if approved
      if (approval.status !== 'approved') {
        return { valid: false, error: 'Request not approved' };
      }

      // Mark as consumed using secure method (throws on failure)
      try {
        const consumptionResult = await this.markTokenConsumed(decoded.jti, decoded.requestId, approval.employeeId);
        console.log(`[JWT Service] Token validated and consumed for request ${approval.requestId}, locationId: ${consumptionResult.locationTrackingId}`);
        
        return {
          valid: true,
          requestId: approval.requestId,
          employeeId: approval.employeeId,
          locationTrackingId: consumptionResult.locationTrackingId,
          payrollAdjustmentId: consumptionResult.payrollAdjustmentId
        };
      } catch (error) {
        console.error('[JWT Service] Failed to mark token consumed, denying access for security:', error);
        return { valid: false, error: 'Failed to process token consumption' };
      }
    } catch (error: any) {
      console.error('[JWT Service] Token validation error:', error);
      
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token expired' };
      } else if (error.name === 'JsonWebTokenError') {
        return { valid: false, error: 'Invalid token format' };
      }
      
      return { valid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Deny an override request
   */
  async denyOverrideRequest(params: {
    requestId: string;
    approverId: number;
    reason?: string;
  }): Promise<void> {
    try {
      const [request] = await db.select()
        .from(gpsOverrideApprovals)
        .where(and(
          eq(gpsOverrideApprovals.requestId, params.requestId),
          eq(gpsOverrideApprovals.status, 'pending')
        ))
        .limit(1);

      if (!request) {
        throw new Error('Override request not found or already processed');
      }

      // Update status to denied
      await db.update(gpsOverrideApprovals)
        .set({
          approverId: params.approverId,
          status: 'denied',
          deniedAt: new Date(),
          approvalMetadata: {
            denialReason: params.reason || 'No reason provided',
            deniedBy: params.approverId
          }
        })
        .where(eq(gpsOverrideApprovals.id, request.id));

      console.log(`[JWT Service] Override request ${request.requestId} denied by ${params.approverId}`);
    } catch (error) {
      console.error('[JWT Service] Error denying override request:', error);
      throw error;
    }
  }

  /**
   * Get pending override requests (excluding own requests)
   */
  async getPendingRequests(supervisorId: number): Promise<any[]> {
    try {
      // Expire old requests first
      await db.update(gpsOverrideApprovals)
        .set({ status: 'expired' })
        .where(and(
          eq(gpsOverrideApprovals.status, 'pending'),
          lt(gpsOverrideApprovals.expiresAt, new Date())
        ));

      // Get pending requests excluding supervisor's own
      const requests = await db.select({
        id: gpsOverrideApprovals.id,
        requestId: gpsOverrideApprovals.requestId,
        requesterId: gpsOverrideApprovals.requesterId,
        employeeId: gpsOverrideApprovals.employeeId,
        clockType: gpsOverrideApprovals.clockType,
        reason: gpsOverrideApprovals.reason,
        createdAt: gpsOverrideApprovals.createdAt,
        expiresAt: gpsOverrideApprovals.expiresAt,
        requesterName: users.username,
        requesterEmail: users.email
      })
      .from(gpsOverrideApprovals)
      .leftJoin(users, eq(gpsOverrideApprovals.requesterId, users.id))
      .where(eq(gpsOverrideApprovals.status, 'pending'));

      // Filter out supervisor's own requests in application logic to avoid SQL injection
      return requests.filter(r => r.requesterId !== supervisorId);
    } catch (error) {
      console.error('[JWT Service] Error fetching pending requests:', error);
      throw error;
    }
  }

  /**
   * Check rate limiting for override requests
   */
  private async checkRateLimit(userId: number): Promise<boolean> {
    try {
      // Implement in-memory fallback rate limiting
      // Count requests in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const recentRequests = await db.select({
        count: sql<string>`count(*)::text`
      })
      .from(gpsOverrideApprovals)
      .where(and(
        eq(gpsOverrideApprovals.requesterId, userId),
        gt(gpsOverrideApprovals.createdAt, oneHourAgo)
      ));

      // Properly cast the count result to number
      const requestCount = Number(recentRequests[0]?.count) || 0;
      const maxRequestsPerHour = 5;
      
      if (requestCount >= maxRequestsPerHour) {
        console.warn(`[JWT Service] Rate limit exceeded for user ${userId}: ${requestCount} requests in last hour`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[JWT Service] Rate limit check error:', error);
      // Strict security: deny on error to prevent bypassing rate limits
      return false;
    }
  }

  /**
   * Write to immutable audit log with SHA-256 hash chain - Fortune 50 Compliance
   */
  private async writeAuditLog(params: {
    eventType: string;
    approvalId: number;
    requestId: string;
    actorId: number;
    actorRole?: string;
    actorName?: string;
    eventData: any;
    ipAddress?: string;
    userAgent?: string;
    locationTrackingId?: number;
    payrollAdjustmentId?: number;
  }): Promise<void> {
    try {
      const crypto = require('crypto');
      
      // Begin transaction for atomic audit log write
      await db.transaction(async (tx: any) => {
        // Get the last audit entry for hash chaining (with lock to prevent race conditions)
        const lastAudit = await tx.select()
          .from(gpsOverrideAuditLog)
          .orderBy(sql`${gpsOverrideAuditLog.sequenceNumber} DESC`)
          .limit(1)
          .for('UPDATE'); // Lock to prevent concurrent writes breaking chain

        const previousHash = lastAudit[0]?.currentHash || '0'.repeat(64);
        const sequenceNumber = lastAudit[0]?.sequenceNumber ? BigInt(lastAudit[0].sequenceNumber) + 1n : 1n;

        // Create deterministic audit data for hashing
        const auditData = {
          sequenceNumber: sequenceNumber.toString(),
          eventType: params.eventType,
          approvalId: params.approvalId,
          requestId: params.requestId,
          actorId: params.actorId,
          eventData: params.eventData,
          previousHash: previousHash,
          timestamp: new Date().toISOString()
        };

        // Calculate SHA-256 hash
        const currentHash = crypto.createHash('sha256')
          .update(JSON.stringify(auditData))
          .digest('hex');

        // Insert immutable audit log entry
        await tx.insert(gpsOverrideAuditLog).values({
          eventType: params.eventType,
          approvalId: params.approvalId,
          requestId: params.requestId,
          actorId: params.actorId,
          actorRole: params.actorRole,
          actorName: params.actorName,
          eventData: params.eventData,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          previousHash: previousHash,
          currentHash: currentHash,
          hashAlgorithm: 'SHA-256',
          sequenceNumber: sequenceNumber,
          complianceFlags: {
            fortune50: true,
            sox: true,
            tamperEvident: true
          },
          locationTrackingId: params.locationTrackingId,
          payrollAdjustmentId: params.payrollAdjustmentId
        });

        console.log(`[JWT Service] Immutable audit log entry created: seq=${sequenceNumber}, hash=${currentHash.substring(0, 8)}...`);
      });
    } catch (error) {
      console.error('[JWT Service] Critical: Failed to write immutable audit log:', error);
      // In production, this should alert security team
      throw new Error('Audit logging failed - operation cannot proceed for compliance');
    }
  }

  /**
   * Ensure single-use token consumption with transactional locks
   */
  private async markTokenConsumed(jti: string, requestId: string, employeeId: number): Promise<{ locationTrackingId?: number; payrollAdjustmentId?: number }> {
    try {
      // Use transaction with row-level lock to prevent race conditions
      const result = await db.transaction(async (tx: any) => {
        // Lock the approval row to prevent concurrent consumption
        const [approval] = await tx.select()
          .from(gpsOverrideApprovals)
          .where(and(
            eq(gpsOverrideApprovals.jti, jti),
            eq(gpsOverrideApprovals.requestId, requestId),
            eq(gpsOverrideApprovals.status, 'approved')
          ))
          .for('UPDATE NOWAIT'); // Fail fast if already locked

        if (!approval) {
          throw new Error('Token not found or already consumed');
        }

        // Double-check status in transaction
        if (approval.status === 'consumed') {
          throw new Error('Token already consumed');
        }

        // Create location tracking entry for payroll linkage
        const [locationEntry] = await tx.insert(locationTracking).values({
          userId: employeeId,
          latitude: 0, // Override location
          longitude: 0,
          accuracy: 0,
          timestamp: new Date(),
          source: 'override',
          metadata: {
            overrideRequestId: requestId,
            jti: jti,
            reason: approval.reason
          }
        }).returning();

        // Create payroll adjustment if applicable
        let payrollAdjustmentId = null;
        if (approval.clockType === 'clock_in' || approval.clockType === 'clock_out') {
          const [adjustment] = await tx.insert('payroll_adjustments').values({
            employeeId: employeeId,
            adjustmentType: 'gps_override',
            adjustmentDate: new Date(),
            amount: 0, // To be calculated by payroll service
            reason: `GPS Override: ${approval.reason}`,
            approvedBy: approval.approverId,
            locationTrackingId: locationEntry.id,
            metadata: {
              overrideRequestId: requestId,
              clockType: approval.clockType
            }
          }).returning();
          payrollAdjustmentId = adjustment.id;
        }

        // Mark token as consumed
        await tx.update(gpsOverrideApprovals)
          .set({
            status: 'consumed',
            consumedAt: new Date(),
            tokenUsedAt: new Date(),
            locationTrackingId: locationEntry.id
          })
          .where(eq(gpsOverrideApprovals.id, approval.id));

        // Write audit log for consumption
        await this.writeAuditLog({
          eventType: 'GPS_OVERRIDE_CONSUMED',
          approvalId: approval.id,
          requestId: requestId,
          actorId: employeeId,
          eventData: {
            jti: jti,
            clockType: approval.clockType,
            locationTrackingId: locationEntry.id,
            payrollAdjustmentId: payrollAdjustmentId
          },
          locationTrackingId: locationEntry.id,
          payrollAdjustmentId: payrollAdjustmentId
        });

        return {
          locationTrackingId: locationEntry.id,
          payrollAdjustmentId: payrollAdjustmentId
        };
      });

      console.log(`[JWT Service] Token consumed and linked to payroll: ${result.locationTrackingId}`);
      return result;
    } catch (error: any) {
      console.error('[JWT Service] Failed to mark token consumed:', error);
      
      // Specific error handling for lock contention
      if (error.message.includes('NOWAIT')) {
        throw new Error('Token is being processed by another request');
      }
      
      throw error;
    }
  }

  /**
   * Rotate JWT secrets (for maintenance)
   */
  async rotateSecrets(): Promise<void> {
    try {
      // Move current to previous
      const currentSecret = this.secrets.get(this.currentSecretVersion);
      if (currentSecret) {
        this.secrets.set(this.currentSecretVersion - 1, currentSecret);
      }

      // Generate new current secret
      const newSecret = this.generateSecret();
      this.currentSecretVersion++;
      this.secrets.set(this.currentSecretVersion, newSecret);

      // Keep only last 2 secrets
      for (const [version] of this.secrets.entries()) {
        if (version < this.currentSecretVersion - 1) {
          this.secrets.delete(version);
        }
      }

      console.log(`[JWT Service] Secrets rotated. New version: ${this.currentSecretVersion}`);
    } catch (error) {
      console.error('[JWT Service] Error rotating secrets:', error);
      throw error;
    }
  }

  /**
   * Generate offline approval code for backup scenarios
   */
  async generateOfflineApprovalCode(requestId: string): Promise<string> {
    try {
      // Generate a secure offline code
      const code = crypto.randomBytes(16).toString('hex').toUpperCase();
      
      // Store the code with the request
      await db.update(gpsOverrideApprovals)
        .set({
          offlineApprovalCode: code
        })
        .where(eq(gpsOverrideApprovals.requestId, requestId));

      return code;
    } catch (error) {
      console.error('[JWT Service] Error generating offline code:', error);
      throw error;
    }
  }

  /**
   * Set or update supervisor PIN for 2FA
   */
  async setSupervisorPin(params: {
    userId: number;
    newPin: string;
    currentPin?: string; // Required if updating existing PIN
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate PIN format (6 digits)
      if (!/^\d{6}$/.test(params.newPin)) {
        return {
          success: false,
          error: 'PIN must be exactly 6 digits'
        };
      }

      // Get team member record
      const [teamMember] = await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, params.userId))
        .limit(1);

      if (!teamMember) {
        return {
          success: false,
          error: 'Team member record not found'
        };
      }

      // If updating existing PIN, verify current PIN first
      if (teamMember.supervisorPinHash) {
        if (!params.currentPin) {
          return {
            success: false,
            error: 'Current PIN required to update existing PIN'
          };
        }

        const isCurrentPinValid = await bcrypt.compare(params.currentPin, teamMember.supervisorPinHash);
        if (!isCurrentPinValid) {
          return {
            success: false,
            error: 'Current PIN is incorrect'
          };
        }
      }

      // Hash the new PIN
      const newPinHash = await bcrypt.hash(params.newPin, this.PIN_SALT_ROUNDS);

      // Update the PIN
      await db.update(teamMembers)
        .set({
          supervisorPinHash: newPinHash,
          supervisorPinSetAt: new Date(),
          supervisorPinFailedAttempts: 0, // Reset failed attempts
          supervisorPinLockedUntil: null // Clear any lockout
        })
        .where(eq(teamMembers.id, teamMember.id));

      console.log(`[JWT Service] PIN successfully ${teamMember.supervisorPinHash ? 'updated' : 'set'} for user ${params.userId}`);

      return {
        success: true
      };
    } catch (error: any) {
      console.error('[JWT Service] Error setting supervisor PIN:', error);
      return {
        success: false,
        error: error.message || 'Failed to set PIN'
      };
    }
  }

  /**
   * Validate supervisor has proper permissions and PIN configured
   */
  async validateSupervisorReadiness(userId: number): Promise<{
    isReady: boolean;
    hasRole: boolean;
    hasPinConfigured: boolean;
    error?: string;
  }> {
    try {
      const [teamMember] = await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId))
        .limit(1);

      if (!teamMember) {
        return {
          isReady: false,
          hasRole: false,
          hasPinConfigured: false,
          error: 'Not a team member'
        };
      }

      // Check for supervisor role (simplified check)
      const isSupervisor = teamMember.roleId !== null && teamMember.roleId <= 7;
      const hasPinConfigured = !!teamMember.supervisorPinHash;

      return {
        isReady: isSupervisor && hasPinConfigured,
        hasRole: isSupervisor,
        hasPinConfigured: hasPinConfigured,
        error: !isSupervisor ? 'Not a supervisor' : 
               !hasPinConfigured ? 'PIN not configured' : undefined
      };
    } catch (error: any) {
      console.error('[JWT Service] Error validating supervisor readiness:', error);
      return {
        isReady: false,
        hasRole: false,
        hasPinConfigured: false,
        error: error.message || 'Validation failed'
      };
    }
  }
}

// Export singleton instance
export const jwtOverrideService = new JWTOverrideService();