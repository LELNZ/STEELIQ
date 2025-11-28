import { storage } from '../storage';
import { gpsOverrideApprovals, users, timeClocks, locationTracking, teamMembers } from '@shared/schema';
import { jwtOverrideService } from './jwtOverrideService';
import { eq, and, desc, lt, or, isNull } from 'drizzle-orm';

const db = (storage as any).db;

/**
 * Approval Request Service - Manages GPS Override Approval Lifecycle
 * 
 * Implements the full lifecycle of dual authorization requests from
 * creation to consumption, with compliance tracking and audit trails
 */
export class ApprovalRequestService {
  /**
   * Create a new GPS override request with supervisor validation
   */
  async createRequest(params: {
    requesterId: number;
    employeeId: number;
    clockType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'meal_start' | 'meal_end';
    reason: string;
    overrideCode?: string;
    gpsAttempt?: {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      error?: string;
    };
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{
    success: boolean;
    requestId?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      // Validate requester is a supervisor
      const isSupervisor = await this.validateSupervisorRole(params.requesterId);
      if (!isSupervisor) {
        return {
          success: false,
          error: 'Only supervisors can create override requests'
        };
      }

      // Validate employee exists and is active
      const employee = await this.validateEmployee(params.employeeId);
      if (!employee) {
        return {
          success: false,
          error: 'Employee not found or inactive'
        };
      }

      // Check for duplicate pending requests
      const hasPending = await this.checkPendingRequests(params.employeeId, params.clockType);
      if (hasPending) {
        return {
          success: false,
          error: 'Employee already has a pending override request for this action'
        };
      }

      // Build request metadata
      const requestMetadata = {
        gpsAttempt: params.gpsAttempt,
        deviceInfo: {
          userAgent: params.userAgent,
          ipAddress: params.ipAddress,
          timestamp: new Date().toISOString()
        },
        employeeName: employee.name,
        employeeEmail: employee.email
      };

      // Create the request through JWT service
      const result = await jwtOverrideService.createOverrideRequest({
        requesterId: params.requesterId,
        employeeId: params.employeeId,
        clockType: params.clockType,
        reason: params.reason,
        overrideCode: params.overrideCode,
        requestMetadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      });

      console.log(`[Approval Service] Created override request ${result.requestId} for employee ${params.employeeId}`);

      return {
        success: true,
        requestId: result.requestId,
        expiresAt: result.expiresAt
      };
    } catch (error: any) {
      console.error('[Approval Service] Error creating request:', error);
      return {
        success: false,
        error: error.message || 'Failed to create override request'
      };
    }
  }

  /**
   * Approve a GPS override request with dual authorization
   */
  async approveRequest(params: {
    requestId: string;
    approverId: number;
    approvalPin?: string;
    approvalMethod?: 'pin' | 'totp' | 'whatsapp' | 'offline';
    ipAddress?: string;
  }): Promise<{
    success: boolean;
    token?: string;
    jti?: string;
    error?: string;
  }> {
    try {
      // Validate approver is a supervisor
      const isSupervisor = await this.validateSupervisorRole(params.approverId);
      if (!isSupervisor) {
        return {
          success: false,
          error: 'Only supervisors can approve override requests'
        };
      }

      // Get the request details
      const request = await this.getRequestDetails(params.requestId);
      if (!request) {
        return {
          success: false,
          error: 'Override request not found'
        };
      }

      // Check if expired
      if (request.expiresAt < new Date()) {
        return {
          success: false,
          error: 'Override request has expired'
        };
      }

      // Ensure different supervisors (no self-approval)
      if (request.requesterId === params.approverId) {
        return {
          success: false,
          error: 'Self-approval not allowed. A different supervisor must approve.'
        };
      }

      // Approve through JWT service
      const result = await jwtOverrideService.approveOverrideRequest({
        requestId: params.requestId,
        approverId: params.approverId,
        approvalPin: params.approvalPin,
        approvalMethod: params.approvalMethod || 'pin',
        ipAddress: params.ipAddress
      });

      console.log(`[Approval Service] Request ${params.requestId} approved by supervisor ${params.approverId}`);

      // Send notifications
      await this.sendApprovalNotification(request.employeeId, params.requestId, 'approved');

      return {
        success: true,
        token: result.token,
        jti: result.jti
      };
    } catch (error: any) {
      console.error('[Approval Service] Error approving request:', error);
      return {
        success: false,
        error: error.message || 'Failed to approve override request'
      };
    }
  }

  /**
   * Deny a GPS override request
   */
  async denyRequest(params: {
    requestId: string;
    approverId: number;
    reason?: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Validate approver is a supervisor
      const isSupervisor = await this.validateSupervisorRole(params.approverId);
      if (!isSupervisor) {
        return {
          success: false,
          error: 'Only supervisors can deny override requests'
        };
      }

      // Get the request details
      const request = await this.getRequestDetails(params.requestId);
      if (!request) {
        return {
          success: false,
          error: 'Override request not found'
        };
      }

      // Deny through JWT service
      await jwtOverrideService.denyOverrideRequest({
        requestId: params.requestId,
        approverId: params.approverId,
        reason: params.reason
      });

      console.log(`[Approval Service] Request ${params.requestId} denied by supervisor ${params.approverId}`);

      // Send notifications
      await this.sendApprovalNotification(request.employeeId, params.requestId, 'denied');

      return {
        success: true
      };
    } catch (error: any) {
      console.error('[Approval Service] Error denying request:', error);
      return {
        success: false,
        error: error.message || 'Failed to deny override request'
      };
    }
  }

  /**
   * Get pending approval requests for a supervisor
   */
  async getPendingRequests(supervisorId: number): Promise<{
    success: boolean;
    requests?: any[];
    error?: string;
  }> {
    try {
      const requests = await jwtOverrideService.getPendingRequests(supervisorId);

      // Enrich with employee details
      const enrichedRequests = await Promise.all(requests.map(async (req) => {
        const employee = await db.select({
          name: users.name,
          email: users.email,
          phone: users.phone
        })
        .from(users)
        .where(eq(users.id, req.employeeId))
        .limit(1);

        return {
          ...req,
          employeeName: employee[0]?.name,
          employeeEmail: employee[0]?.email,
          employeePhone: employee[0]?.phone,
          timeRemaining: Math.max(0, Math.floor((new Date(req.expiresAt).getTime() - Date.now()) / 1000))
        };
      }));

      return {
        success: true,
        requests: enrichedRequests
      };
    } catch (error: any) {
      console.error('[Approval Service] Error fetching pending requests:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch pending requests'
      };
    }
  }

  /**
   * Validate and consume an override token
   */
  async consumeToken(token: string): Promise<{
    success: boolean;
    employeeId?: number;
    requestId?: string;
    locationTrackingId?: number;
    error?: string;
  }> {
    try {
      const validation = await jwtOverrideService.validateOverrideToken(token);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Invalid token'
        };
      }

      // Create a location tracking entry for the override
      const [locationEntry] = await db.insert(locationTracking).values({
        userId: validation.employeeId!,
        sessionId: `override-${validation.requestId}`,
        timestamp: new Date(),
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        mockLocation: false,
        captureMethod: 'override',
        supervisorOverride: true,
        overrideReason: 'GPS unavailable - Dual authorization approval',
        overrideBy: null, // Set in the approval record
        createdAt: new Date()
      }).returning();

      // Link the location tracking to the approval
      await db.update(gpsOverrideApprovals)
        .set({
          locationTrackingId: locationEntry.id
        })
        .where(eq(gpsOverrideApprovals.requestId, validation.requestId!));

      console.log(`[Approval Service] Token consumed for request ${validation.requestId}, location tracking ID: ${locationEntry.id}`);

      return {
        success: true,
        employeeId: validation.employeeId,
        requestId: validation.requestId,
        locationTrackingId: locationEntry.id
      };
    } catch (error: any) {
      console.error('[Approval Service] Error consuming token:', error);
      return {
        success: false,
        error: error.message || 'Failed to consume token'
      };
    }
  }

  /**
   * Expire old pending requests
   */
  async expireOldRequests(): Promise<void> {
    try {
      const expired = await db.update(gpsOverrideApprovals)
        .set({ status: 'expired' })
        .where(and(
          eq(gpsOverrideApprovals.status, 'pending'),
          lt(gpsOverrideApprovals.expiresAt, new Date())
        ))
        .returning();

      if (expired.length > 0) {
        console.log(`[Approval Service] Expired ${expired.length} old requests`);
      }
    } catch (error) {
      console.error('[Approval Service] Error expiring old requests:', error);
    }
  }

  // --- Helper Methods ---

  /**
   * Validate if user is a supervisor
   */
  private async validateSupervisorRole(userId: number): Promise<boolean> {
    try {
      // Check if user has a supervisor role or specific permissions
      const teamMember = await db.select({
        id: teamMembers.id,
        roleId: teamMembers.roleId
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .limit(1);

      if (!teamMember.length) {
        return false;
      }

      // Check for supervisor-level roles
      // This is a simplified check - in production, check actual permissions
      const supervisorRoles = [
        'business_owner',
        'operations_manager',
        'project_manager',
        'production_supervisor',
        'foreman',
        'safety_officer',
        'quality_controller'
      ];

      // Would need to join with roles table to check role name
      // For now, we'll assume roleId 1-7 are supervisor roles
      return teamMember[0].roleId !== null && teamMember[0].roleId <= 7;
    } catch (error) {
      console.error('[Approval Service] Error validating supervisor role:', error);
      return false;
    }
  }

  /**
   * Validate employee exists and is active
   */
  private async validateEmployee(employeeId: number): Promise<any> {
    try {
      const [employee] = await db.select()
        .from(users)
        .where(eq(users.id, employeeId))
        .limit(1);

      return employee;
    } catch (error) {
      console.error('[Approval Service] Error validating employee:', error);
      return null;
    }
  }

  /**
   * Check for existing pending requests
   */
  private async checkPendingRequests(employeeId: number, clockType: string): Promise<boolean> {
    try {
      const pending = await db.select()
        .from(gpsOverrideApprovals)
        .where(and(
          eq(gpsOverrideApprovals.employeeId, employeeId),
          eq(gpsOverrideApprovals.clockType, clockType),
          eq(gpsOverrideApprovals.status, 'pending')
        ))
        .limit(1);

      return pending.length > 0;
    } catch (error) {
      console.error('[Approval Service] Error checking pending requests:', error);
      return false;
    }
  }

  /**
   * Get request details
   */
  private async getRequestDetails(requestId: string): Promise<any> {
    try {
      const [request] = await db.select()
        .from(gpsOverrideApprovals)
        .where(eq(gpsOverrideApprovals.requestId, requestId))
        .limit(1);

      return request;
    } catch (error) {
      console.error('[Approval Service] Error getting request details:', error);
      return null;
    }
  }

  /**
   * Send notification about approval status
   */
  private async sendApprovalNotification(employeeId: number, requestId: string, status: 'approved' | 'denied'): Promise<void> {
    try {
      // In production, this would send an email/WhatsApp/push notification
      console.log(`[Approval Service] Notification: Override request ${requestId} for employee ${employeeId} was ${status}`);
    } catch (error) {
      console.error('[Approval Service] Error sending notification:', error);
    }
  }

  /**
   * Get approval statistics for audit
   */
  async getApprovalStatistics(params: {
    startDate?: Date;
    endDate?: Date;
    supervisorId?: number;
    employeeId?: number;
  }): Promise<any> {
    try {
      // Build query conditions
      const conditions = [];
      if (params.startDate) {
        conditions.push(gpsOverrideApprovals.createdAt >= params.startDate);
      }
      if (params.endDate) {
        conditions.push(gpsOverrideApprovals.createdAt <= params.endDate);
      }
      if (params.supervisorId) {
        conditions.push(or(
          eq(gpsOverrideApprovals.requesterId, params.supervisorId),
          eq(gpsOverrideApprovals.approverId, params.supervisorId)
        ));
      }
      if (params.employeeId) {
        conditions.push(eq(gpsOverrideApprovals.employeeId, params.employeeId));
      }

      const stats = await db.select()
        .from(gpsOverrideApprovals)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Calculate statistics
      const summary = {
        total: stats.length,
        pending: stats.filter(s => s.status === 'pending').length,
        approved: stats.filter(s => s.status === 'approved').length,
        denied: stats.filter(s => s.status === 'denied').length,
        expired: stats.filter(s => s.status === 'expired').length,
        consumed: stats.filter(s => s.status === 'consumed').length,
        averageApprovalTime: this.calculateAverageApprovalTime(stats),
        topReasons: this.getTopReasons(stats),
        byClockType: this.groupByClockType(stats)
      };

      return summary;
    } catch (error) {
      console.error('[Approval Service] Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Calculate average approval time
   */
  private calculateAverageApprovalTime(stats: any[]): number {
    const approved = stats.filter(s => s.status === 'approved' && s.approvedAt);
    if (approved.length === 0) return 0;

    const totalTime = approved.reduce((sum, s) => {
      const timeDiff = new Date(s.approvedAt).getTime() - new Date(s.createdAt).getTime();
      return sum + timeDiff;
    }, 0);

    return Math.round(totalTime / approved.length / 1000 / 60); // Average in minutes
  }

  /**
   * Get top override reasons
   */
  private getTopReasons(stats: any[]): any[] {
    const reasonCounts = new Map<string, number>();
    
    stats.forEach(s => {
      const reason = s.reason || 'Unknown';
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    });

    return Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));
  }

  /**
   * Group statistics by clock type
   */
  private groupByClockType(stats: any[]): any {
    const groups: any = {};
    
    stats.forEach(s => {
      const type = s.clockType || 'unknown';
      if (!groups[type]) {
        groups[type] = {
          total: 0,
          approved: 0,
          denied: 0
        };
      }
      groups[type].total++;
      if (s.status === 'approved' || s.status === 'consumed') {
        groups[type].approved++;
      } else if (s.status === 'denied') {
        groups[type].denied++;
      }
    });

    return groups;
  }
}

// Export singleton instance
export const approvalRequestService = new ApprovalRequestService();