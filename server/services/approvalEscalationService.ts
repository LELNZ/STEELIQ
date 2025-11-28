import { db } from '../db';
import {
  timesheets,
  teamMembers,
  departments,
  users,
  roles,
  notificationEscalations,
  notifications
} from '@shared/schema';
import { eq, and, or, gte, lte, lt, isNull, isNotNull, sql, desc, asc } from 'drizzle-orm';
import { addHours, differenceInHours, differenceInMinutes, format, subHours } from 'date-fns';
import NotificationService from './notificationService';

interface EscalationRule {
  level: number;
  roleName: string;
  roleType: 'manager' | 'director' | 'vp' | 'cfo';
  slaHours: number;
  notificationChannels: string[];
  reminderIntervalMinutes: number;
}

interface ApprovalSLAConfig {
  name: string;
  departmentId?: number;
  rules: EscalationRule[];
  businessHoursOnly: boolean;
  businessHoursStart: number;
  businessHoursEnd: number;
  weekendsExcluded: boolean;
}

interface PendingApproval {
  timesheetId: number;
  userId: number;
  employeeName: string;
  departmentId: number;
  departmentName: string;
  submittedAt: Date;
  hoursWorked: number;
  currentSLALevel: number;
  slaDeadline: Date;
  hoursOverdue: number;
  escalationStatus: 'on_track' | 'warning' | 'breached' | 'critical';
  currentApproverRole: string;
  nextEscalationAt?: Date;
}

interface EscalationEvent {
  timesheetId: number;
  employeeId: number;
  employeeName: string;
  escalatedFrom: string;
  escalatedTo: string;
  escalationLevel: number;
  reason: string;
  slaBreachDuration: number;
  timestamp: Date;
}

interface EscalationDashboard {
  pendingApprovals: PendingApproval[];
  recentEscalations: EscalationEvent[];
  slaMetrics: {
    totalPending: number;
    onTrack: number;
    warning: number;
    breached: number;
    critical: number;
    avgApprovalTimeHours: number;
    slaComplianceRate: number;
  };
  departmentBreakdown: Array<{
    departmentId: number;
    departmentName: string;
    pendingCount: number;
    breachedCount: number;
    avgTimeToApproval: number;
  }>;
}

class ApprovalEscalationService {
  private notificationService: NotificationService;
  
  private readonly DEFAULT_SLA_CONFIG: ApprovalSLAConfig = {
    name: 'Default Timesheet Approval SLA',
    rules: [
      {
        level: 1,
        roleName: 'Manager',
        roleType: 'manager',
        slaHours: 24,
        notificationChannels: ['email', 'inApp'],
        reminderIntervalMinutes: 120
      },
      {
        level: 2,
        roleName: 'Director',
        roleType: 'director',
        slaHours: 48,
        notificationChannels: ['email', 'inApp', 'whatsapp'],
        reminderIntervalMinutes: 60
      },
      {
        level: 3,
        roleName: 'VP',
        roleType: 'vp',
        slaHours: 72,
        notificationChannels: ['email', 'inApp', 'whatsapp'],
        reminderIntervalMinutes: 30
      }
    ],
    businessHoursOnly: true,
    businessHoursStart: 8,
    businessHoursEnd: 17,
    weekendsExcluded: true
  };

  constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  async getEscalationDashboard(departmentId?: number): Promise<EscalationDashboard> {
    console.log('[EscalationService] Getting dashboard', { departmentId });

    try {
      const pendingApprovals = await this.getPendingApprovals(departmentId);
      const recentEscalations = await this.getRecentEscalations(departmentId, 7);
      const slaMetrics = await this.calculateSLAMetrics(pendingApprovals);
      const departmentBreakdown = await this.getDepartmentBreakdown();

      return {
        pendingApprovals,
        recentEscalations,
        slaMetrics,
        departmentBreakdown
      };
    } catch (error) {
      console.error('[EscalationService] Error getting dashboard:', error);
      throw error;
    }
  }

  async getPendingApprovals(departmentId?: number): Promise<PendingApproval[]> {
    const now = new Date();

    let query = db
      .select({
        timesheetId: timesheets.id,
        userId: timesheets.userId,
        hoursWorked: timesheets.hoursWorked,
        submittedAt: timesheets.submittedAt,
        status: timesheets.status,
        firstName: teamMembers.firstName,
        lastName: teamMembers.lastName,
        departmentId: teamMembers.departmentId,
        departmentName: departments.name
      })
      .from(timesheets)
      .innerJoin(teamMembers, eq(timesheets.userId, teamMembers.userId))
      .leftJoin(departments, eq(teamMembers.departmentId, departments.id))
      .where(
        and(
          eq(timesheets.status, 'submitted'),
          eq(timesheets.approved, false)
        )
      )
      .orderBy(asc(timesheets.submittedAt));

    if (departmentId) {
      query = query.where(
        and(
          eq(timesheets.status, 'submitted'),
          eq(timesheets.approved, false),
          eq(teamMembers.departmentId, departmentId)
        )
      ) as typeof query;
    }

    const results = await query;

    return results.map(row => {
      const submittedAt = row.submittedAt ? new Date(row.submittedAt) : new Date();
      const hoursWaiting = differenceInHours(now, submittedAt);
      
      const { level, status, deadline, nextEscalation } = this.calculateSLAStatus(submittedAt, now);

      return {
        timesheetId: row.timesheetId,
        userId: row.userId,
        employeeName: `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unknown',
        departmentId: row.departmentId || 0,
        departmentName: row.departmentName || 'Unassigned',
        submittedAt,
        hoursWorked: Number(row.hoursWorked) || 0,
        currentSLALevel: level,
        slaDeadline: deadline,
        hoursOverdue: Math.max(0, hoursWaiting - (level * 24)),
        escalationStatus: status,
        currentApproverRole: this.DEFAULT_SLA_CONFIG.rules[level - 1]?.roleName || 'Manager',
        nextEscalationAt: nextEscalation
      };
    });
  }

  private calculateSLAStatus(
    submittedAt: Date,
    now: Date
  ): {
    level: number;
    status: 'on_track' | 'warning' | 'breached' | 'critical';
    deadline: Date;
    nextEscalation?: Date;
  } {
    const hoursElapsed = differenceInHours(now, submittedAt);
    const rules = this.DEFAULT_SLA_CONFIG.rules;

    let currentLevel = 1;
    let status: 'on_track' | 'warning' | 'breached' | 'critical' = 'on_track';

    for (let i = 0; i < rules.length; i++) {
      if (hoursElapsed >= rules[i].slaHours) {
        currentLevel = i + 2;
        status = 'breached';
      }
    }

    if (currentLevel > rules.length) {
      currentLevel = rules.length;
      status = 'critical';
    }

    const currentRule = rules[currentLevel - 1];
    const deadline = addHours(submittedAt, currentRule.slaHours);
    
    const hoursToDeadline = differenceInHours(deadline, now);
    if (status === 'on_track' && hoursToDeadline <= 4) {
      status = 'warning';
    }

    const nextRule = rules[currentLevel];
    const nextEscalation = nextRule ? addHours(submittedAt, nextRule.slaHours) : undefined;

    return { level: currentLevel, status, deadline, nextEscalation };
  }

  async processEscalations(): Promise<{
    processed: number;
    escalated: number;
    notificationsSent: number;
    errors: string[];
  }> {
    console.log('[EscalationService] Processing pending escalations');
    
    const results = {
      processed: 0,
      escalated: 0,
      notificationsSent: 0,
      errors: [] as string[]
    };

    try {
      const pendingApprovals = await this.getPendingApprovals();
      
      for (const approval of pendingApprovals) {
        results.processed++;

        if (approval.escalationStatus === 'breached' || approval.escalationStatus === 'critical') {
          try {
            await this.escalateApproval(approval);
            results.escalated++;
            results.notificationsSent++;
          } catch (error: any) {
            results.errors.push(`Failed to escalate timesheet ${approval.timesheetId}: ${error.message}`);
          }
        } else if (approval.escalationStatus === 'warning') {
          try {
            await this.sendReminderNotification(approval);
            results.notificationsSent++;
          } catch (error: any) {
            results.errors.push(`Failed to send reminder for timesheet ${approval.timesheetId}: ${error.message}`);
          }
        }
      }

      console.log('[EscalationService] Processing complete:', results);
      return results;
    } catch (error: any) {
      console.error('[EscalationService] Error processing escalations:', error);
      results.errors.push(`General processing error: ${error.message}`);
      return results;
    }
  }

  private async escalateApproval(approval: PendingApproval): Promise<void> {
    const rules = this.DEFAULT_SLA_CONFIG.rules;
    const currentRule = rules[approval.currentSLALevel - 1];
    const nextRule = rules[approval.currentSLALevel];

    if (!nextRule) {
      await this.sendCriticalEscalationNotification(approval);
      return;
    }

    const escalationEvent: EscalationEvent = {
      timesheetId: approval.timesheetId,
      employeeId: approval.userId,
      employeeName: approval.employeeName,
      escalatedFrom: currentRule.roleName,
      escalatedTo: nextRule.roleName,
      escalationLevel: approval.currentSLALevel + 1,
      reason: `SLA breach: Timesheet pending for ${approval.hoursOverdue + approval.currentSLALevel * 24} hours`,
      slaBreachDuration: approval.hoursOverdue,
      timestamp: new Date()
    };

    await this.recordEscalation(escalationEvent);
    await this.sendEscalationNotification(approval, currentRule, nextRule);

    console.log(`[EscalationService] Escalated timesheet ${approval.timesheetId} from ${currentRule.roleName} to ${nextRule.roleName}`);
  }

  private async sendEscalationNotification(
    approval: PendingApproval,
    fromRole: EscalationRule,
    toRole: EscalationRule
  ): Promise<void> {
    const subject = `[ESCALATION] Timesheet Approval Required - ${approval.employeeName}`;
    const body = `
      A timesheet requiring your approval has been escalated due to SLA breach.

      Employee: ${approval.employeeName}
      Department: ${approval.departmentName}
      Hours Worked: ${approval.hoursWorked}
      Submitted: ${format(approval.submittedAt, 'dd/MM/yyyy HH:mm')}
      
      This approval was escalated from ${fromRole.roleName} level after exceeding the ${fromRole.slaHours}-hour SLA.
      
      Current Escalation Level: ${toRole.roleName}
      New SLA Deadline: ${format(approval.slaDeadline, 'dd/MM/yyyy HH:mm')}
      
      Please review and approve or reject this timesheet as soon as possible.
    `;

    await this.notificationService.sendNotification({
      type: 'timesheet_escalation',
      category: 'approvals',
      priority: approval.escalationStatus === 'critical' ? 'critical' : 'high',
      subject,
      body,
      channels: toRole.notificationChannels,
      roleId: await this.getRoleIdByType(toRole.roleType),
      departmentId: approval.departmentId,
      acknowledgmentRequired: true,
      relatedEntityType: 'timesheet',
      relatedEntityId: approval.timesheetId,
      actionUrl: `/time-payroll/timesheets/${approval.timesheetId}/approve`,
      jsonData: {
        escalationLevel: toRole.level,
        previousApprover: fromRole.roleName,
        employeeId: approval.userId,
        hoursOverdue: approval.hoursOverdue
      }
    });
  }

  private async sendReminderNotification(approval: PendingApproval): Promise<void> {
    const currentRule = this.DEFAULT_SLA_CONFIG.rules[approval.currentSLALevel - 1];
    const hoursRemaining = Math.max(0, differenceInHours(approval.slaDeadline, new Date()));

    const subject = `[REMINDER] Timesheet Approval Due in ${hoursRemaining} hours - ${approval.employeeName}`;
    const body = `
      A timesheet is approaching its SLA deadline and requires your attention.

      Employee: ${approval.employeeName}
      Department: ${approval.departmentName}
      Hours Worked: ${approval.hoursWorked}
      Submitted: ${format(approval.submittedAt, 'dd/MM/yyyy HH:mm')}
      
      SLA Deadline: ${format(approval.slaDeadline, 'dd/MM/yyyy HH:mm')}
      Time Remaining: ${hoursRemaining} hours
      
      If not approved by the deadline, this will be escalated to ${
        this.DEFAULT_SLA_CONFIG.rules[approval.currentSLALevel]?.roleName || 'Senior Management'
      }.
    `;

    await this.notificationService.sendNotification({
      type: 'timesheet_reminder',
      category: 'approvals',
      priority: 'normal',
      subject,
      body,
      channels: currentRule.notificationChannels,
      roleId: await this.getRoleIdByType(currentRule.roleType),
      departmentId: approval.departmentId,
      relatedEntityType: 'timesheet',
      relatedEntityId: approval.timesheetId,
      actionUrl: `/time-payroll/timesheets/${approval.timesheetId}/approve`
    });
  }

  private async sendCriticalEscalationNotification(approval: PendingApproval): Promise<void> {
    const subject = `[CRITICAL] Timesheet Approval - Maximum Escalation Level Reached - ${approval.employeeName}`;
    const body = `
      CRITICAL: A timesheet has reached the maximum escalation level and requires immediate executive attention.

      Employee: ${approval.employeeName}
      Department: ${approval.departmentName}
      Hours Worked: ${approval.hoursWorked}
      Submitted: ${format(approval.submittedAt, 'dd/MM/yyyy HH:mm')}
      
      This timesheet has been pending for ${Math.round(approval.hoursOverdue + 72)} hours and has breached all SLA levels.
      
      Immediate action is required to maintain payroll processing schedules.
    `;

    await this.notificationService.sendNotification({
      type: 'timesheet_critical',
      category: 'approvals',
      priority: 'critical',
      subject,
      body,
      channels: ['email', 'inApp', 'whatsapp'],
      roleId: await this.getRoleIdByType('vp'),
      acknowledgmentRequired: true,
      relatedEntityType: 'timesheet',
      relatedEntityId: approval.timesheetId,
      actionUrl: `/time-payroll/timesheets/${approval.timesheetId}/approve`,
      jsonData: {
        isCritical: true,
        totalHoursOverdue: approval.hoursOverdue + 72,
        employeeId: approval.userId
      }
    });
  }

  private async recordEscalation(event: EscalationEvent): Promise<void> {
    try {
      await db.insert(notificationEscalations).values({
        notificationId: event.timesheetId,
        escalationLevel: event.escalationLevel,
        escalatedToUserId: null,
        escalatedToRoleId: null,
        escalationReason: event.reason,
        previousStatus: 'pending',
        newStatus: 'escalated',
        nextEscalationAt: addHours(new Date(), 24),
        maxEscalationLevel: this.DEFAULT_SLA_CONFIG.rules.length,
        createdAt: event.timestamp
      });
    } catch (error) {
      console.error('[EscalationService] Error recording escalation:', error);
    }
  }

  private async getRecentEscalations(departmentId?: number, days: number = 7): Promise<EscalationEvent[]> {
    const since = subHours(new Date(), days * 24);

    const results = await db
      .select({
        id: notificationEscalations.id,
        notificationId: notificationEscalations.notificationId,
        escalationLevel: notificationEscalations.escalationLevel,
        reason: notificationEscalations.escalationReason,
        createdAt: notificationEscalations.createdAt
      })
      .from(notificationEscalations)
      .where(gte(notificationEscalations.createdAt, since))
      .orderBy(desc(notificationEscalations.createdAt))
      .limit(50);

    return results.map(row => ({
      timesheetId: row.notificationId || 0,
      employeeId: 0,
      employeeName: 'Unknown',
      escalatedFrom: this.DEFAULT_SLA_CONFIG.rules[(row.escalationLevel || 1) - 2]?.roleName || 'Initial',
      escalatedTo: this.DEFAULT_SLA_CONFIG.rules[(row.escalationLevel || 1) - 1]?.roleName || 'Manager',
      escalationLevel: row.escalationLevel || 1,
      reason: row.reason || 'SLA breach',
      slaBreachDuration: 0,
      timestamp: row.createdAt || new Date()
    }));
  }

  private async calculateSLAMetrics(pendingApprovals: PendingApproval[]): Promise<EscalationDashboard['slaMetrics']> {
    const totalPending = pendingApprovals.length;
    const onTrack = pendingApprovals.filter(a => a.escalationStatus === 'on_track').length;
    const warning = pendingApprovals.filter(a => a.escalationStatus === 'warning').length;
    const breached = pendingApprovals.filter(a => a.escalationStatus === 'breached').length;
    const critical = pendingApprovals.filter(a => a.escalationStatus === 'critical').length;

    const avgApprovalTimeHours = pendingApprovals.length > 0
      ? pendingApprovals.reduce((sum, a) => sum + differenceInHours(new Date(), a.submittedAt), 0) / pendingApprovals.length
      : 0;

    const historicalCompliance = await this.calculateHistoricalSLACompliance(30);
    
    return {
      totalPending,
      onTrack,
      warning,
      breached,
      critical,
      avgApprovalTimeHours: Math.round(avgApprovalTimeHours * 10) / 10,
      slaComplianceRate: Math.round(historicalCompliance.complianceRate * 10) / 10
    };
  }

  private async calculateHistoricalSLACompliance(days: number = 30): Promise<{
    complianceRate: number;
    totalCompleted: number;
    withinSLA: number;
    breachedSLA: number;
    avgApprovalHours: number;
  }> {
    const since = subHours(new Date(), days * 24);
    const managerSLA = this.DEFAULT_SLA_CONFIG.rules[0].slaHours;

    try {
      const completedApprovals = await db
        .select({
          timesheetId: timesheets.id,
          submittedAt: timesheets.submittedAt,
          approvedAt: timesheets.updatedAt,
          approvedById: timesheets.approvedById,
          status: timesheets.status
        })
        .from(timesheets)
        .where(
          and(
            eq(timesheets.approved, true),
            eq(timesheets.status, 'approved'),
            isNotNull(timesheets.approvedById),
            gte(timesheets.updatedAt, since)
          )
        );

      if (completedApprovals.length === 0) {
        return {
          complianceRate: 100,
          totalCompleted: 0,
          withinSLA: 0,
          breachedSLA: 0,
          avgApprovalHours: 0
        };
      }

      let withinSLA = 0;
      let totalApprovalHours = 0;

      for (const approval of completedApprovals) {
        const submittedAt = approval.submittedAt ? new Date(approval.submittedAt) : null;
        const approvedAt = approval.approvedAt ? new Date(approval.approvedAt) : null;
        
        if (!submittedAt || !approvedAt) continue;
        
        const hoursToApprove = differenceInHours(approvedAt, submittedAt);
        
        if (hoursToApprove < 0 || hoursToApprove > 720) continue;
        
        totalApprovalHours += hoursToApprove;
        
        if (hoursToApprove <= managerSLA) {
          withinSLA++;
        }
      }

      const totalCompleted = completedApprovals.length;
      const breachedSLA = totalCompleted - withinSLA;
      const complianceRate = totalCompleted > 0 ? (withinSLA / totalCompleted) * 100 : 100;
      const avgApprovalHours = totalCompleted > 0 ? totalApprovalHours / totalCompleted : 0;

      console.log('[EscalationService] Historical SLA compliance from approved timesheets:', {
        days,
        totalCompleted,
        withinSLA,
        breachedSLA,
        complianceRate: Math.round(complianceRate * 10) / 10,
        avgApprovalHours: Math.round(avgApprovalHours * 10) / 10,
        source: "timesheets WHERE approved=true AND status='approved' AND approvedById IS NOT NULL"
      });

      return {
        complianceRate,
        totalCompleted,
        withinSLA,
        breachedSLA,
        avgApprovalHours
      };
    } catch (error) {
      console.error('[EscalationService] Error calculating historical SLA compliance:', error);
      return {
        complianceRate: 100,
        totalCompleted: 0,
        withinSLA: 0,
        breachedSLA: 0,
        avgApprovalHours: 0
      };
    }
  }

  private async getDepartmentBreakdown(): Promise<EscalationDashboard['departmentBreakdown']> {
    const depts = await db.select({ id: departments.id, name: departments.name }).from(departments);
    const breakdown: EscalationDashboard['departmentBreakdown'] = [];

    for (const dept of depts) {
      const pending = await this.getPendingApprovals(dept.id);
      const breached = pending.filter(p => p.escalationStatus === 'breached' || p.escalationStatus === 'critical');
      const avgTime = pending.length > 0
        ? pending.reduce((sum, p) => sum + differenceInHours(new Date(), p.submittedAt), 0) / pending.length
        : 0;

      breakdown.push({
        departmentId: dept.id,
        departmentName: dept.name,
        pendingCount: pending.length,
        breachedCount: breached.length,
        avgTimeToApproval: Math.round(avgTime * 10) / 10
      });
    }

    return breakdown.sort((a, b) => b.breachedCount - a.breachedCount);
  }

  private async getRoleIdByType(roleType: string): Promise<number | undefined> {
    const roleMapping: Record<string, string[]> = {
      manager: ['Manager', 'Supervisor', 'Team Lead'],
      director: ['Director', 'Department Head'],
      vp: ['VP', 'Vice President', 'COO', 'CFO'],
      cfo: ['CFO', 'Chief Financial Officer', 'Finance Director']
    };

    const roleNames = roleMapping[roleType] || [];
    
    for (const roleName of roleNames) {
      const [role] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(sql`LOWER(${roles.name}) LIKE LOWER(${'%' + roleName + '%'})`)
        .limit(1);
      
      if (role) {
        return role.id;
      }
    }

    return undefined;
  }

  async getSLAConfiguration(departmentId?: number): Promise<ApprovalSLAConfig> {
    return this.DEFAULT_SLA_CONFIG;
  }

  async updateSLAConfiguration(
    config: Partial<ApprovalSLAConfig>,
    departmentId?: number
  ): Promise<ApprovalSLAConfig> {
    console.log('[EscalationService] Updating SLA configuration', { departmentId, config });
    return { ...this.DEFAULT_SLA_CONFIG, ...config };
  }
}

export const approvalEscalationService = new ApprovalEscalationService();
