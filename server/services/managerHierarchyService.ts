import { db } from '../db';
import {
  teamMembers,
  departments,
  users,
  roles,
  timesheets
} from '@shared/schema';
import { eq, and, or, sql, desc, isNull, gte, lte } from 'drizzle-orm';
import { format, addDays, isWithinInterval, parseISO } from 'date-fns';

interface ApprovalChainMember {
  userId: number;
  name: string;
  email: string;
  roleId: number;
  roleName: string;
  departmentId?: number;
  departmentName?: string;
  hierarchyLevel: number;
  canApprove: boolean;
  isDelegate: boolean;
  delegatedFrom?: number;
  delegatedFromName?: string;
}

interface ApprovalChain {
  employeeId: number;
  employeeName: string;
  departmentId: number;
  departmentName: string;
  chain: ApprovalChainMember[];
  effectiveApprover: ApprovalChainMember | null;
  hasDelegation: boolean;
}

interface DelegationConfig {
  id?: number;
  delegatorId: number;
  delegateId: number;
  startDate: Date;
  endDate: Date;
  reason: string;
  approvalTypes: string[];
  maxApprovalAmount?: number;
  isActive: boolean;
  createdAt?: Date;
}

interface VacationCoverage {
  userId: number;
  userName: string;
  vacationStart: Date;
  vacationEnd: Date;
  coveredBy: number;
  coveringUserName: string;
  approvalTypes: string[];
  isAutoAssigned: boolean;
}

interface HierarchyNode {
  userId: number;
  name: string;
  roleId: number;
  roleName: string;
  departmentId?: number;
  departmentName?: string;
  hierarchyLevel: number;
  directReports: number[];
  managerId?: number;
  managerName?: string;
}

class ManagerHierarchyService {
  private readonly ROLE_HIERARCHY: Record<string, number> = {
    'employee': 0,
    'tradesman': 0,
    'apprentice': 0,
    'team_lead': 1,
    'supervisor': 1,
    'foreman': 1,
    'manager': 2,
    'department_head': 2,
    'senior_manager': 3,
    'director': 3,
    'vp': 4,
    'vice_president': 4,
    'coo': 5,
    'cfo': 5,
    'ceo': 6,
    'admin': 6
  };

  private delegations: Map<number, DelegationConfig[]> = new Map();
  private vacationCoverages: Map<number, VacationCoverage> = new Map();

  async getApprovalChainForEmployee(employeeUserId: number): Promise<ApprovalChain> {
    console.log('[ManagerHierarchy] Getting approval chain for employee:', employeeUserId);

    try {
      const employee = await this.getTeamMemberInfo(employeeUserId);
      if (!employee) {
        throw new Error(`Employee not found: ${employeeUserId}`);
      }

      const chain: ApprovalChainMember[] = [];

      const departmentManager = await this.getDepartmentManager(employee.departmentId);
      if (departmentManager && departmentManager.userId !== employeeUserId) {
        chain.push({
          ...departmentManager,
          hierarchyLevel: 1,
          canApprove: true,
          isDelegate: false
        });
      }

      const higherManagement = await this.getHigherManagement(employee.departmentId, 1);
      for (const manager of higherManagement) {
        if (!chain.find(c => c.userId === manager.userId)) {
          chain.push({
            ...manager,
            canApprove: true,
            isDelegate: false
          });
        }
      }

      await this.applyDelegations(chain);

      const effectiveApprover = this.findEffectiveApprover(chain);

      return {
        employeeId: employeeUserId,
        employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        departmentId: employee.departmentId || 0,
        departmentName: employee.departmentName || 'Unassigned',
        chain,
        effectiveApprover,
        hasDelegation: chain.some(c => c.isDelegate)
      };
    } catch (error) {
      console.error('[ManagerHierarchy] Error getting approval chain:', error);
      throw error;
    }
  }

  private async getTeamMemberInfo(userId: number) {
    const [member] = await db
      .select({
        userId: teamMembers.userId,
        firstName: teamMembers.firstName,
        lastName: teamMembers.lastName,
        roleId: teamMembers.roleId,
        departmentId: teamMembers.departmentId,
        departmentName: departments.name,
        roleName: roles.name
      })
      .from(teamMembers)
      .leftJoin(departments, eq(teamMembers.departmentId, departments.id))
      .leftJoin(roles, eq(teamMembers.roleId, roles.id))
      .where(eq(teamMembers.userId, userId))
      .limit(1);

    return member;
  }

  private async getDepartmentManager(departmentId?: number): Promise<ApprovalChainMember | null> {
    if (!departmentId) return null;

    const [dept] = await db
      .select({
        managerId: departments.managerId,
        departmentName: departments.name
      })
      .from(departments)
      .where(eq(departments.id, departmentId))
      .limit(1);

    if (!dept?.managerId) return null;

    const [manager] = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        roleId: teamMembers.roleId,
        roleName: roles.name,
        departmentId: teamMembers.departmentId,
        departmentName: departments.name
      })
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .leftJoin(roles, eq(teamMembers.roleId, roles.id))
      .leftJoin(departments, eq(teamMembers.departmentId, departments.id))
      .where(eq(users.id, dept.managerId))
      .limit(1);

    if (!manager) return null;

    return {
      userId: manager.userId,
      name: manager.name || 'Unknown',
      email: manager.email || '',
      roleId: manager.roleId || 0,
      roleName: manager.roleName || 'Manager',
      departmentId: manager.departmentId || undefined,
      departmentName: manager.departmentName || undefined,
      hierarchyLevel: 1,
      canApprove: true,
      isDelegate: false
    };
  }

  private async getHigherManagement(departmentId?: number, startLevel: number = 1): Promise<ApprovalChainMember[]> {
    const managers: ApprovalChainMember[] = [];

    const seniorRoles = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        roleId: roles.id,
        roleName: roles.name,
        departmentId: teamMembers.departmentId,
        departmentName: departments.name
      })
      .from(users)
      .innerJoin(teamMembers, eq(users.id, teamMembers.userId))
      .innerJoin(roles, eq(teamMembers.roleId, roles.id))
      .leftJoin(departments, eq(teamMembers.departmentId, departments.id))
      .where(
        or(
          sql`LOWER(${roles.name}) LIKE '%director%'`,
          sql`LOWER(${roles.name}) LIKE '%vp%'`,
          sql`LOWER(${roles.name}) LIKE '%vice president%'`,
          sql`LOWER(${roles.name}) LIKE '%cfo%'`,
          sql`LOWER(${roles.name}) LIKE '%coo%'`,
          sql`LOWER(${roles.name}) LIKE '%ceo%'`,
          sql`LOWER(${roles.name}) LIKE '%admin%'`
        )
      )
      .limit(10);

    for (const role of seniorRoles) {
      const hierarchyLevel = this.getRoleHierarchyLevel(role.roleName || '');
      if (hierarchyLevel > startLevel) {
        managers.push({
          userId: role.userId,
          name: role.name || 'Unknown',
          email: role.email || '',
          roleId: role.roleId,
          roleName: role.roleName || 'Senior Manager',
          departmentId: role.departmentId || undefined,
          departmentName: role.departmentName || undefined,
          hierarchyLevel,
          canApprove: true,
          isDelegate: false
        });
      }
    }

    managers.sort((a, b) => a.hierarchyLevel - b.hierarchyLevel);
    return managers;
  }

  private getRoleHierarchyLevel(roleName: string): number {
    const normalizedName = roleName.toLowerCase().replace(/[^a-z]/g, '_');
    
    for (const [key, level] of Object.entries(this.ROLE_HIERARCHY)) {
      if (normalizedName.includes(key)) {
        return level;
      }
    }
    
    return 0;
  }

  private async applyDelegations(chain: ApprovalChainMember[]): Promise<void> {
    const now = new Date();

    for (let i = 0; i < chain.length; i++) {
      const member = chain[i];
      
      const vacationCoverage = this.vacationCoverages.get(member.userId);
      if (vacationCoverage && isWithinInterval(now, { 
        start: vacationCoverage.vacationStart, 
        end: vacationCoverage.vacationEnd 
      })) {
        const delegate = await this.getTeamMemberInfo(vacationCoverage.coveredBy);
        if (delegate) {
          chain[i] = {
            userId: vacationCoverage.coveredBy,
            name: vacationCoverage.coveringUserName,
            email: '',
            roleId: delegate.roleId || member.roleId,
            roleName: delegate.roleName || member.roleName,
            departmentId: delegate.departmentId,
            departmentName: delegate.departmentName,
            hierarchyLevel: member.hierarchyLevel,
            canApprove: true,
            isDelegate: true,
            delegatedFrom: member.userId,
            delegatedFromName: member.name
          };
        }
      }

      const delegations = this.delegations.get(member.userId);
      if (delegations) {
        const activeDelegation = delegations.find(d => 
          d.isActive && 
          isWithinInterval(now, { start: d.startDate, end: d.endDate })
        );

        if (activeDelegation) {
          const delegate = await this.getTeamMemberInfo(activeDelegation.delegateId);
          if (delegate) {
            chain[i] = {
              userId: activeDelegation.delegateId,
              name: `${delegate.firstName || ''} ${delegate.lastName || ''}`.trim(),
              email: '',
              roleId: delegate.roleId || member.roleId,
              roleName: delegate.roleName || member.roleName,
              departmentId: delegate.departmentId,
              departmentName: delegate.departmentName,
              hierarchyLevel: member.hierarchyLevel,
              canApprove: true,
              isDelegate: true,
              delegatedFrom: member.userId,
              delegatedFromName: member.name
            };
          }
        }
      }
    }
  }

  private findEffectiveApprover(chain: ApprovalChainMember[]): ApprovalChainMember | null {
    const availableApprovers = chain.filter(c => c.canApprove);
    return availableApprovers.length > 0 ? availableApprovers[0] : null;
  }

  async createDelegation(config: Omit<DelegationConfig, 'id' | 'createdAt'>): Promise<DelegationConfig> {
    console.log('[ManagerHierarchy] Creating delegation:', config);

    const delegation: DelegationConfig = {
      ...config,
      id: Date.now(),
      createdAt: new Date()
    };

    const existing = this.delegations.get(config.delegatorId) || [];
    existing.push(delegation);
    this.delegations.set(config.delegatorId, existing);

    return delegation;
  }

  async removeDelegation(delegatorId: number, delegateId: number): Promise<boolean> {
    const delegations = this.delegations.get(delegatorId);
    if (!delegations) return false;

    const index = delegations.findIndex(d => d.delegateId === delegateId);
    if (index === -1) return false;

    delegations.splice(index, 1);
    if (delegations.length === 0) {
      this.delegations.delete(delegatorId);
    } else {
      this.delegations.set(delegatorId, delegations);
    }

    return true;
  }

  async setVacationCoverage(coverage: VacationCoverage): Promise<void> {
    console.log('[ManagerHierarchy] Setting vacation coverage:', coverage);
    this.vacationCoverages.set(coverage.userId, coverage);
  }

  async removeVacationCoverage(userId: number): Promise<boolean> {
    return this.vacationCoverages.delete(userId);
  }

  async getOrgChartForDepartment(departmentId: number): Promise<HierarchyNode[]> {
    const nodes: HierarchyNode[] = [];

    const members = await db
      .select({
        userId: teamMembers.userId,
        firstName: teamMembers.firstName,
        lastName: teamMembers.lastName,
        roleId: teamMembers.roleId,
        roleName: roles.name,
        departmentId: teamMembers.departmentId,
        departmentName: departments.name
      })
      .from(teamMembers)
      .innerJoin(roles, eq(teamMembers.roleId, roles.id))
      .leftJoin(departments, eq(teamMembers.departmentId, departments.id))
      .where(eq(teamMembers.departmentId, departmentId));

    const deptManager = await this.getDepartmentManager(departmentId);

    for (const member of members) {
      const hierarchyLevel = this.getRoleHierarchyLevel(member.roleName || '');
      const isManager = deptManager?.userId === member.userId;

      nodes.push({
        userId: member.userId,
        name: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        roleId: member.roleId || 0,
        roleName: member.roleName || 'Employee',
        departmentId: member.departmentId || undefined,
        departmentName: member.departmentName || undefined,
        hierarchyLevel,
        directReports: [],
        managerId: isManager ? undefined : deptManager?.userId,
        managerName: isManager ? undefined : deptManager?.name
      });
    }

    for (const node of nodes) {
      if (node.managerId) {
        const manager = nodes.find(n => n.userId === node.managerId);
        if (manager) {
          manager.directReports.push(node.userId);
        }
      }
    }

    return nodes.sort((a, b) => b.hierarchyLevel - a.hierarchyLevel);
  }

  async assignTimesheetToApprover(timesheetId: number): Promise<{
    assigned: boolean;
    approverId?: number;
    approverName?: string;
    reason: string;
  }> {
    console.log('[ManagerHierarchy] Assigning timesheet to approver:', timesheetId);

    try {
      const [timesheet] = await db
        .select({
          id: timesheets.id,
          userId: timesheets.userId,
          supervisorId: timesheets.supervisorId
        })
        .from(timesheets)
        .where(eq(timesheets.id, timesheetId))
        .limit(1);

      if (!timesheet) {
        return { assigned: false, reason: 'Timesheet not found' };
      }

      if (timesheet.supervisorId) {
        const vacationCoverage = this.vacationCoverages.get(timesheet.supervisorId);
        const now = new Date();
        
        if (vacationCoverage && isWithinInterval(now, {
          start: vacationCoverage.vacationStart,
          end: vacationCoverage.vacationEnd
        })) {
          await db
            .update(timesheets)
            .set({ supervisorId: vacationCoverage.coveredBy })
            .where(eq(timesheets.id, timesheetId));

          return {
            assigned: true,
            approverId: vacationCoverage.coveredBy,
            approverName: vacationCoverage.coveringUserName,
            reason: `Assigned to vacation coverage for ${vacationCoverage.userName}`
          };
        }

        const supervisorInfo = await this.getTeamMemberInfo(timesheet.supervisorId);
        return {
          assigned: true,
          approverId: timesheet.supervisorId,
          approverName: supervisorInfo ? `${supervisorInfo.firstName || ''} ${supervisorInfo.lastName || ''}`.trim() : 'Supervisor',
          reason: 'Using existing supervisor assignment'
        };
      }

      const chain = await this.getApprovalChainForEmployee(timesheet.userId);
      if (!chain.effectiveApprover) {
        return { assigned: false, reason: 'No approver found in hierarchy' };
      }

      await db
        .update(timesheets)
        .set({ supervisorId: chain.effectiveApprover.userId })
        .where(eq(timesheets.id, timesheetId));

      return {
        assigned: true,
        approverId: chain.effectiveApprover.userId,
        approverName: chain.effectiveApprover.name,
        reason: chain.hasDelegation 
          ? `Assigned to delegate: ${chain.effectiveApprover.name}` 
          : `Assigned to ${chain.effectiveApprover.roleName}: ${chain.effectiveApprover.name}`
      };
    } catch (error) {
      console.error('[ManagerHierarchy] Error assigning timesheet:', error);
      return { assigned: false, reason: `Error: ${(error as Error).message}` };
    }
  }

  async getActiveDelegations(userId?: number): Promise<DelegationConfig[]> {
    const now = new Date();
    const results: DelegationConfig[] = [];

    if (userId) {
      const delegations = this.delegations.get(userId) || [];
      return delegations.filter(d => 
        d.isActive && 
        isWithinInterval(now, { start: d.startDate, end: d.endDate })
      );
    }

    for (const [, delegations] of this.delegations) {
      for (const d of delegations) {
        if (d.isActive && isWithinInterval(now, { start: d.startDate, end: d.endDate })) {
          results.push(d);
        }
      }
    }

    return results;
  }

  async getActiveVacationCoverages(): Promise<VacationCoverage[]> {
    const now = new Date();
    const results: VacationCoverage[] = [];

    for (const [, coverage] of this.vacationCoverages) {
      if (isWithinInterval(now, { start: coverage.vacationStart, end: coverage.vacationEnd })) {
        results.push(coverage);
      }
    }

    return results;
  }

  async validateApprovalAuthority(
    approverId: number, 
    employeeId: number, 
    approvalType: string = 'timesheet'
  ): Promise<{
    authorized: boolean;
    reason: string;
    hierarchyLevel?: number;
  }> {
    try {
      const chain = await this.getApprovalChainForEmployee(employeeId);
      
      const approver = chain.chain.find(c => c.userId === approverId);
      if (!approver) {
        const approverRole = await this.getTeamMemberInfo(approverId);
        const approverLevel = this.getRoleHierarchyLevel(approverRole?.roleName || '');
        
        if (approverLevel >= 4) {
          return {
            authorized: true,
            reason: 'Senior executive has global approval authority',
            hierarchyLevel: approverLevel
          };
        }

        return {
          authorized: false,
          reason: 'Approver is not in the employee\'s approval chain'
        };
      }

      if (!approver.canApprove) {
        return {
          authorized: false,
          reason: 'Approver cannot approve at this time'
        };
      }

      return {
        authorized: true,
        reason: approver.isDelegate 
          ? `Authorized as delegate for ${approver.delegatedFromName}` 
          : `Authorized as ${approver.roleName}`,
        hierarchyLevel: approver.hierarchyLevel
      };
    } catch (error) {
      console.error('[ManagerHierarchy] Error validating approval authority:', error);
      return {
        authorized: false,
        reason: `Validation error: ${(error as Error).message}`
      };
    }
  }
}

export const managerHierarchyService = new ManagerHierarchyService();
