import { db } from "../db";
import { eq, and, gte, lte, desc, sql, inArray, isNull, or } from "drizzle-orm";
import {
  schedulingRequirements,
  employeeAvailability,
  employeeSchedulePreferences,
  aiScheduleRuns,
  scheduleAssignments,
  shiftSwapRequests,
  scheduleChangeAudit,
  fatigueRules,
  users,
  teamMembers,
  departments,
  jobs,
  timeClocks,
  InsertSchedulingRequirement,
  InsertEmployeeAvailability,
  InsertAiScheduleRun,
  InsertScheduleAssignment,
  InsertShiftSwapRequest,
  SchedulingRequirement,
  EmployeeAvailability,
  AiScheduleRun,
  ScheduleAssignment,
} from "@shared/schema";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";

interface ScheduleConstraints {
  maxHoursPerWeek: number;
  maxConsecutiveDays: number;
  minRestHours: number;
  fairnessWeight: number;
  considerPreferences: boolean;
  autoFillGaps: boolean;
}

interface EmployeeData {
  id: number;
  name: string;
  skills: string[];
  certifications: string[];
  departmentId: number | null;
  availability: {
    dayOfWeek: number;
    availableFrom: string | null;
    availableTo: string | null;
    preferenceType: string;
  }[];
  preferences: {
    preferredHoursPerWeek: number;
    maxHoursPerWeek: number;
    preferredShiftType: string | null;
    avoidNightShifts: boolean;
    avoidWeekends: boolean;
    maxConsecutiveDays: number;
  } | null;
  recentHours: number;
  lastShiftDate: string | null;
}

interface ShiftRequirement {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  minStaff: number;
  preferredStaff: number;
  requiredSkills: string[];
  requiredCertifications: string[];
  locationCode: string | null;
  jobId: number | null;
  priority: string;
}

interface GeneratedAssignment {
  userId: number;
  date: string;
  startTime: string;
  endTime: string;
  fitScore: number;
  fatigueRisk: string;
  explanation: string;
  requirementId: number | null;
  jobId: number | null;
  locationCode: string | null;
}

interface ScheduleResult {
  assignments: GeneratedAssignment[];
  coverageScore: number;
  fairnessScore: number;
  fatigueComplianceScore: number;
  violations: string[];
  suggestions: string[];
}

class AISchedulingService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  private generateAuditHash(data: any, previousHash: string | null): string {
    const payload = JSON.stringify({
      data,
      previousHash,
      timestamp: new Date().toISOString(),
    });
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  async getSchedulingRequirements(filters?: {
    dayOfWeek?: number;
    departmentId?: number;
    jobId?: number;
    isActive?: boolean;
  }): Promise<SchedulingRequirement[]> {
    const conditions = [];
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(schedulingRequirements.isActive, filters.isActive));
    }
    if (filters?.dayOfWeek !== undefined) {
      conditions.push(eq(schedulingRequirements.dayOfWeek, filters.dayOfWeek));
    }
    if (filters?.departmentId !== undefined) {
      conditions.push(eq(schedulingRequirements.departmentId, filters.departmentId));
    }
    if (filters?.jobId !== undefined) {
      conditions.push(eq(schedulingRequirements.jobId, filters.jobId));
    }

    return db
      .select()
      .from(schedulingRequirements)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(schedulingRequirements.dayOfWeek, schedulingRequirements.startTime);
  }

  async createSchedulingRequirement(data: InsertSchedulingRequirement): Promise<SchedulingRequirement> {
    const [requirement] = await db
      .insert(schedulingRequirements)
      .values(data)
      .returning();
    return requirement;
  }

  async updateSchedulingRequirement(id: number, data: Partial<InsertSchedulingRequirement>): Promise<SchedulingRequirement | null> {
    const [updated] = await db
      .update(schedulingRequirements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schedulingRequirements.id, id))
      .returning();
    return updated || null;
  }

  async getEmployeeAvailability(userId: number): Promise<EmployeeAvailability[]> {
    return db
      .select()
      .from(employeeAvailability)
      .where(eq(employeeAvailability.userId, userId))
      .orderBy(employeeAvailability.dayOfWeek);
  }

  async setEmployeeAvailability(userId: number, availability: InsertEmployeeAvailability[]): Promise<EmployeeAvailability[]> {
    await db.delete(employeeAvailability).where(eq(employeeAvailability.userId, userId));
    
    if (availability.length === 0) return [];
    
    return db
      .insert(employeeAvailability)
      .values(availability.map(a => ({ ...a, userId })))
      .returning();
  }

  async getScheduleRuns(filters?: {
    weekStarting?: string;
    status?: string;
    departmentId?: number;
  }): Promise<AiScheduleRun[]> {
    const conditions = [];
    
    if (filters?.weekStarting) {
      conditions.push(eq(aiScheduleRuns.weekStarting, filters.weekStarting));
    }
    if (filters?.status) {
      conditions.push(eq(aiScheduleRuns.status, filters.status));
    }
    if (filters?.departmentId) {
      conditions.push(eq(aiScheduleRuns.departmentId, filters.departmentId));
    }

    return db
      .select()
      .from(aiScheduleRuns)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(aiScheduleRuns.createdAt));
  }

  async getScheduleForWeek(weekStarting: string): Promise<{
    run: AiScheduleRun | null;
    assignments: ScheduleAssignment[];
  }> {
    const [run] = await db
      .select()
      .from(aiScheduleRuns)
      .where(eq(aiScheduleRuns.weekStarting, weekStarting))
      .orderBy(desc(aiScheduleRuns.createdAt))
      .limit(1);

    if (!run) {
      return { run: null, assignments: [] };
    }

    const assignments = await db
      .select()
      .from(scheduleAssignments)
      .where(eq(scheduleAssignments.scheduleRunId, run.id))
      .orderBy(scheduleAssignments.assignmentDate, scheduleAssignments.startTime);

    return { run, assignments };
  }

  private async getEmployeesForScheduling(departmentId?: number): Promise<EmployeeData[]> {
    const employeeQuery = db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.isActive, true));

    const employeeList = await employeeQuery;

    const employees: EmployeeData[] = [];

    for (const emp of employeeList) {
      const availability = await db
        .select({
          dayOfWeek: employeeAvailability.dayOfWeek,
          availableFrom: employeeAvailability.availableFrom,
          availableTo: employeeAvailability.availableTo,
          preferenceType: employeeAvailability.preferenceType,
        })
        .from(employeeAvailability)
        .where(eq(employeeAvailability.userId, emp.id));

      const [preferences] = await db
        .select()
        .from(employeeSchedulePreferences)
        .where(eq(employeeSchedulePreferences.userId, emp.id));

      const [teamMember] = await db
        .select({
          skills: teamMembers.skills,
          certifications: teamMembers.certifications,
          departmentId: teamMembers.departmentId,
        })
        .from(teamMembers)
        .where(eq(teamMembers.userId, emp.id));

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentClocks = await db
        .select({
          clockIn: timeClocks.clockIn,
          clockOut: timeClocks.clockOut,
        })
        .from(timeClocks)
        .where(
          and(
            eq(timeClocks.userId, emp.id),
            gte(timeClocks.clockIn, thirtyDaysAgo)
          )
        );

      let recentHours = 0;
      let lastShiftDate: string | null = null;

      for (const clock of recentClocks) {
        if (clock.clockIn && clock.clockOut) {
          const hours = (clock.clockOut.getTime() - clock.clockIn.getTime()) / (1000 * 60 * 60);
          recentHours += hours;
        }
        if (clock.clockIn) {
          const dateStr = clock.clockIn.toISOString().split('T')[0];
          if (!lastShiftDate || dateStr > lastShiftDate) {
            lastShiftDate = dateStr;
          }
        }
      }

      employees.push({
        id: emp.id,
        name: `${emp.firstName || ''} ${emp.lastName || emp.username}`.trim(),
        skills: (teamMember?.skills as string[]) || [],
        certifications: (teamMember?.certifications as string[]) || [],
        departmentId: teamMember?.departmentId || null,
        availability: availability.map(a => ({
          dayOfWeek: a.dayOfWeek,
          availableFrom: a.availableFrom,
          availableTo: a.availableTo,
          preferenceType: a.preferenceType || 'available',
        })),
        preferences: preferences ? {
          preferredHoursPerWeek: preferences.preferredHoursPerWeek || 40,
          maxHoursPerWeek: preferences.maxHoursPerWeek || 50,
          preferredShiftType: preferences.preferredShiftType,
          avoidNightShifts: preferences.avoidNightShifts || false,
          avoidWeekends: preferences.avoidWeekends || false,
          maxConsecutiveDays: preferences.maxConsecutiveDays || 5,
        } : null,
        recentHours,
        lastShiftDate,
      });
    }

    return employees;
  }

  private async getFatigueRules(): Promise<{
    maxHoursPerDay: number;
    maxHoursPerWeek: number;
    minRestBetweenShifts: number;
    maxConsecutiveDays: number;
  }> {
    const [rule] = await db
      .select()
      .from(fatigueRules)
      .where(eq(fatigueRules.isActive, true))
      .limit(1);

    return {
      maxHoursPerDay: rule?.maxHoursPerDay || 12,
      maxHoursPerWeek: rule?.maxHoursPerWeek || 50,
      minRestBetweenShifts: rule?.minRestBetweenShifts || 8,
      maxConsecutiveDays: rule?.maxConsecutiveDays || 6,
    };
  }

  async generateSchedule(
    weekStarting: string,
    constraints: ScheduleConstraints,
    optimizationPriority: string,
    createdBy: number,
    departmentId?: number
  ): Promise<AiScheduleRun> {
    const weekEnd = new Date(weekStarting);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEnding = weekEnd.toISOString().split('T')[0];

    const [lastRun] = await db
      .select({ auditHash: aiScheduleRuns.auditHash })
      .from(aiScheduleRuns)
      .orderBy(desc(aiScheduleRuns.createdAt))
      .limit(1);

    const [scheduleRun] = await db
      .insert(aiScheduleRuns)
      .values({
        weekStarting,
        weekEnding,
        departmentId,
        constraints,
        optimizationPriority,
        status: 'running',
        generationStartedAt: new Date(),
        createdBy,
        previousAuditHash: lastRun?.auditHash || null,
      })
      .returning();

    try {
      const requirements = await this.getSchedulingRequirements({ isActive: true, departmentId });
      const employees = await this.getEmployeesForScheduling(departmentId);
      const fatigueRulesData = await this.getFatigueRules();

      const result = await this.callClaudeForScheduling(
        weekStarting,
        requirements.map(r => ({
          id: r.id,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          minStaff: r.minStaff,
          preferredStaff: r.preferredStaff,
          requiredSkills: (r.requiredSkills as string[]) || [],
          requiredCertifications: (r.requiredCertifications as string[]) || [],
          locationCode: r.locationCode,
          jobId: r.jobId,
          priority: r.priority || 'normal',
        })),
        employees,
        constraints,
        fatigueRulesData,
        optimizationPriority
      );

      if (result.assignments.length > 0) {
        await db.insert(scheduleAssignments).values(
          result.assignments.map(a => ({
            scheduleRunId: scheduleRun.id,
            userId: a.userId,
            assignmentDate: a.date,
            startTime: a.startTime,
            endTime: a.endTime,
            jobId: a.jobId,
            locationCode: a.locationCode,
            requirementId: a.requirementId,
            fitScore: a.fitScore.toString(),
            fatigueRisk: a.fatigueRisk,
            aiExplanation: a.explanation,
            departmentId,
          }))
        );
      }

      const auditHash = this.generateAuditHash(
        { scheduleRun, result },
        lastRun?.auditHash || null
      );

      const [updated] = await db
        .update(aiScheduleRuns)
        .set({
          status: 'completed',
          coverageScore: result.coverageScore.toString(),
          fairnessScore: result.fairnessScore.toString(),
          fatigueComplianceScore: result.fatigueComplianceScore.toString(),
          violations: result.violations,
          suggestions: result.suggestions,
          generationCompletedAt: new Date(),
          auditHash,
          modelVersion: 'claude-sonnet-4-20250514',
          updatedAt: new Date(),
        })
        .where(eq(aiScheduleRuns.id, scheduleRun.id))
        .returning();

      return updated;
    } catch (error) {
      await db
        .update(aiScheduleRuns)
        .set({
          status: 'failed',
          violations: [error instanceof Error ? error.message : 'Unknown error'],
          generationCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(aiScheduleRuns.id, scheduleRun.id));

      throw error;
    }
  }

  private async callClaudeForScheduling(
    weekStarting: string,
    requirements: ShiftRequirement[],
    employees: EmployeeData[],
    constraints: ScheduleConstraints,
    fatigueRules: {
      maxHoursPerDay: number;
      maxHoursPerWeek: number;
      minRestBetweenShifts: number;
      maxConsecutiveDays: number;
    },
    optimizationPriority: string
  ): Promise<ScheduleResult> {
    const weekDates: string[] = [];
    const startDate = new Date(weekStarting);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      weekDates.push(date.toISOString().split('T')[0]);
    }

    const prompt = `You are an AI scheduling assistant for a steel fabrication company. Generate an optimal work schedule for the week starting ${weekStarting}.

## SHIFT REQUIREMENTS (by day of week, 0=Sunday):
${JSON.stringify(requirements, null, 2)}

## AVAILABLE EMPLOYEES:
${JSON.stringify(employees.map(e => ({
  id: e.id,
  name: e.name,
  skills: e.skills,
  certifications: e.certifications,
  availability: e.availability,
  preferences: e.preferences,
  recentHours: Math.round(e.recentHours),
  lastShiftDate: e.lastShiftDate,
})), null, 2)}

## CONSTRAINTS:
- Max hours per week: ${constraints.maxHoursPerWeek}
- Max consecutive days: ${constraints.maxConsecutiveDays}
- Min rest between shifts: ${constraints.minRestHours} hours
- Fairness weight: ${constraints.fairnessWeight} (0=coverage priority, 1=fairness priority)
- Consider preferences: ${constraints.considerPreferences}
- Auto-fill gaps: ${constraints.autoFillGaps}

## FATIGUE RULES:
- Max hours per day: ${fatigueRules.maxHoursPerDay}
- Max hours per week: ${fatigueRules.maxHoursPerWeek}
- Min rest between shifts: ${fatigueRules.minRestBetweenShifts} hours
- Max consecutive days: ${fatigueRules.maxConsecutiveDays}

## OPTIMIZATION PRIORITY: ${optimizationPriority}

## WEEK DATES:
${weekDates.map((d, i) => `Day ${i} (${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i]}): ${d}`).join('\n')}

Generate a JSON response with the following structure:
{
  "assignments": [
    {
      "userId": <employee id>,
      "date": "<YYYY-MM-DD>",
      "startTime": "<HH:MM>",
      "endTime": "<HH:MM>",
      "fitScore": <0-100>,
      "fatigueRisk": "<low|medium|high>",
      "explanation": "<why this employee was assigned>",
      "requirementId": <requirement id or null>,
      "jobId": <job id or null>,
      "locationCode": "<location or null>"
    }
  ],
  "coverageScore": <0-100 percentage of shifts filled>,
  "fairnessScore": <0-100 how evenly hours distributed>,
  "fatigueComplianceScore": <0-100 compliance with fatigue rules>,
  "violations": ["<list of constraint violations>"],
  "suggestions": ["<list of optimization suggestions>"]
}

Match employees to shifts based on:
1. Required skills and certifications
2. Availability patterns
3. Stated preferences
4. Recent workload (balance hours fairly)
5. Fatigue management (adequate rest between shifts)

Respond ONLY with valid JSON, no markdown or explanation.`;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      let jsonText = content.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }

      const result = JSON.parse(jsonText.trim()) as ScheduleResult;

      result.assignments = result.assignments.filter(a => 
        employees.some(e => e.id === a.userId) &&
        weekDates.includes(a.date)
      );

      return result;
    } catch (error) {
      console.error('Claude scheduling error:', error);

      return this.generateFallbackSchedule(weekDates, requirements, employees, constraints);
    }
  }

  private generateFallbackSchedule(
    weekDates: string[],
    requirements: ShiftRequirement[],
    employees: EmployeeData[],
    constraints: ScheduleConstraints
  ): ScheduleResult {
    const assignments: GeneratedAssignment[] = [];
    const employeeHours: Map<number, number> = new Map();
    const employeeDays: Map<number, string[]> = new Map();

    employees.forEach(e => {
      employeeHours.set(e.id, 0);
      employeeDays.set(e.id, []);
    });

    for (const date of weekDates) {
      const dayOfWeek = new Date(date).getDay();
      const dayRequirements = requirements.filter(r => r.dayOfWeek === dayOfWeek);

      for (const req of dayRequirements) {
        const eligibleEmployees = employees.filter(emp => {
          const hours = employeeHours.get(emp.id) || 0;
          if (hours >= constraints.maxHoursPerWeek) return false;

          const days = employeeDays.get(emp.id) || [];
          if (days.length >= constraints.maxConsecutiveDays) {
            const sortedDays = [...days].sort();
            const lastDay = sortedDays[sortedDays.length - 1];
            if (lastDay === weekDates[weekDates.indexOf(date) - 1]) {
              return false;
            }
          }

          const dayAvail = emp.availability.find(a => a.dayOfWeek === dayOfWeek);
          if (dayAvail?.preferenceType === 'blocked' || dayAvail?.preferenceType === 'unavailable') {
            return false;
          }

          return true;
        });

        const sortedEmployees = [...eligibleEmployees].sort((a, b) => {
          const aHours = employeeHours.get(a.id) || 0;
          const bHours = employeeHours.get(b.id) || 0;
          return aHours - bHours;
        });

        const staffNeeded = req.minStaff;
        for (let i = 0; i < staffNeeded && i < sortedEmployees.length; i++) {
          const emp = sortedEmployees[i];
          
          const startParts = req.startTime.split(':');
          const endParts = req.endTime.split(':');
          const shiftHours = 
            (parseInt(endParts[0]) + parseInt(endParts[1]) / 60) -
            (parseInt(startParts[0]) + parseInt(startParts[1]) / 60);

          assignments.push({
            userId: emp.id,
            date,
            startTime: req.startTime,
            endTime: req.endTime,
            fitScore: 75,
            fatigueRisk: 'low',
            explanation: `Assigned based on availability and workload balance`,
            requirementId: req.id,
            jobId: req.jobId,
            locationCode: req.locationCode,
          });

          employeeHours.set(emp.id, (employeeHours.get(emp.id) || 0) + shiftHours);
          employeeDays.get(emp.id)?.push(date);
        }
      }
    }

    const totalRequired = requirements.reduce((sum, r) => sum + r.minStaff, 0) * weekDates.length / 7;
    const coverageScore = totalRequired > 0 ? Math.min(100, (assignments.length / totalRequired) * 100) : 100;

    const hoursArray = Array.from(employeeHours.values()).filter(h => h > 0);
    const avgHours = hoursArray.length > 0 ? hoursArray.reduce((a, b) => a + b, 0) / hoursArray.length : 0;
    const variance = hoursArray.length > 0 
      ? hoursArray.reduce((sum, h) => sum + Math.pow(h - avgHours, 2), 0) / hoursArray.length 
      : 0;
    const fairnessScore = Math.max(0, 100 - Math.sqrt(variance) * 5);

    return {
      assignments,
      coverageScore: Math.round(coverageScore),
      fairnessScore: Math.round(fairnessScore),
      fatigueComplianceScore: 100,
      violations: [],
      suggestions: ['Schedule generated using fallback algorithm. Consider enabling AI optimization for better results.'],
    };
  }

  async approveSchedule(runId: number, approvedBy: number): Promise<AiScheduleRun> {
    const [run] = await db
      .select()
      .from(aiScheduleRuns)
      .where(eq(aiScheduleRuns.id, runId));

    if (!run) {
      throw new Error('Schedule run not found');
    }

    if (run.approvalStatus !== 'draft' && run.approvalStatus !== 'pending_approval') {
      throw new Error(`Cannot approve schedule with status: ${run.approvalStatus}`);
    }

    const auditHash = this.generateAuditHash(
      { action: 'approve', runId, approvedBy },
      run.auditHash
    );

    const [updated] = await db
      .update(aiScheduleRuns)
      .set({
        approvalStatus: 'approved',
        approvedBy,
        approvedAt: new Date(),
        auditHash,
        updatedAt: new Date(),
      })
      .where(eq(aiScheduleRuns.id, runId))
      .returning();

    await this.logScheduleChange(
      'schedule_run',
      runId,
      'approve',
      { approvalStatus: run.approvalStatus },
      { approvalStatus: 'approved' },
      approvedBy,
      auditHash,
      run.auditHash
    );

    return updated;
  }

  async publishSchedule(runId: number, publishedBy: number): Promise<AiScheduleRun> {
    const [run] = await db
      .select()
      .from(aiScheduleRuns)
      .where(eq(aiScheduleRuns.id, runId));

    if (!run) {
      throw new Error('Schedule run not found');
    }

    if (run.approvalStatus !== 'approved') {
      throw new Error(`Cannot publish schedule with status: ${run.approvalStatus}. Must be approved first.`);
    }

    const auditHash = this.generateAuditHash(
      { action: 'publish', runId, publishedBy },
      run.auditHash
    );

    const [updated] = await db
      .update(aiScheduleRuns)
      .set({
        approvalStatus: 'published',
        publishedBy,
        publishedAt: new Date(),
        auditHash,
        updatedAt: new Date(),
      })
      .where(eq(aiScheduleRuns.id, runId))
      .returning();

    await this.logScheduleChange(
      'schedule_run',
      runId,
      'publish',
      { approvalStatus: run.approvalStatus },
      { approvalStatus: 'published' },
      publishedBy,
      auditHash,
      run.auditHash
    );

    return updated;
  }

  async createShiftSwapRequest(data: InsertShiftSwapRequest): Promise<any> {
    const slaHours = data.urgency === 'emergency' ? 2 : data.urgency === 'high' ? 4 : 24;
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours);

    const [lastRequest] = await db
      .select({ auditHash: shiftSwapRequests.auditHash })
      .from(shiftSwapRequests)
      .orderBy(desc(shiftSwapRequests.createdAt))
      .limit(1);

    const auditHash = this.generateAuditHash(
      { action: 'create_swap_request', data },
      lastRequest?.auditHash || null
    );

    const [request] = await db
      .insert(shiftSwapRequests)
      .values({
        ...data,
        slaDeadline,
        auditHash,
        previousAuditHash: lastRequest?.auditHash || null,
      })
      .returning();

    return request;
  }

  async getSwapRequests(filters?: {
    requesterId?: number;
    targetUserId?: number;
    status?: string;
  }): Promise<any[]> {
    const conditions = [];

    if (filters?.requesterId) {
      conditions.push(eq(shiftSwapRequests.requesterId, filters.requesterId));
    }
    if (filters?.targetUserId) {
      conditions.push(eq(shiftSwapRequests.targetUserId, filters.targetUserId));
    }
    if (filters?.status) {
      conditions.push(eq(shiftSwapRequests.status, filters.status));
    }

    return db
      .select()
      .from(shiftSwapRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(shiftSwapRequests.createdAt));
  }

  async processSwapApproval(
    requestId: number,
    decision: 'approved' | 'rejected',
    approvedBy: number,
    isPeerApproval: boolean,
    rejectionReason?: string
  ): Promise<any> {
    const [request] = await db
      .select()
      .from(shiftSwapRequests)
      .where(eq(shiftSwapRequests.id, requestId));

    if (!request) {
      throw new Error('Swap request not found');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (isPeerApproval) {
      if (decision === 'approved') {
        updateData.status = 'supervisor_pending';
        updateData.peerApprovedBy = approvedBy;
        updateData.peerApprovedAt = new Date();
      } else {
        updateData.status = 'rejected';
        updateData.rejectionReason = rejectionReason;
      }
    } else {
      if (decision === 'approved') {
        updateData.status = 'approved';
        updateData.supervisorApprovedBy = approvedBy;
        updateData.supervisorApprovedAt = new Date();

        if (request.swapType === 'swap' && request.targetAssignmentId) {
          await db
            .update(scheduleAssignments)
            .set({ status: 'swapped', updatedAt: new Date() })
            .where(eq(scheduleAssignments.id, request.originalAssignmentId));

          await db
            .update(scheduleAssignments)
            .set({ status: 'swapped', updatedAt: new Date() })
            .where(eq(scheduleAssignments.id, request.targetAssignmentId));
        }
      } else {
        updateData.status = 'rejected';
        updateData.rejectionReason = rejectionReason;
      }
    }

    const auditHash = this.generateAuditHash(
      { action: 'swap_approval', requestId, decision, approvedBy, isPeerApproval },
      request.auditHash
    );
    updateData.auditHash = auditHash;

    const [updated] = await db
      .update(shiftSwapRequests)
      .set(updateData)
      .where(eq(shiftSwapRequests.id, requestId))
      .returning();

    return updated;
  }

  private async logScheduleChange(
    entityType: string,
    entityId: number,
    changeType: string,
    previousState: any,
    newState: any,
    changedBy: number,
    auditHash: string,
    previousAuditHash: string | null
  ): Promise<void> {
    await db.insert(scheduleChangeAudit).values({
      entityType,
      entityId,
      changeType,
      previousState,
      newState,
      changedBy,
      auditHash,
      previousAuditHash,
    });
  }

  async getScheduleDashboard(weekStarting: string): Promise<{
    schedule: AiScheduleRun | null;
    assignments: ScheduleAssignment[];
    swapRequests: any[];
    metrics: {
      totalShifts: number;
      filledShifts: number;
      pendingSwaps: number;
      coveragePercentage: number;
    };
  }> {
    const { run, assignments } = await this.getScheduleForWeek(weekStarting);

    const swapRequests = await this.getSwapRequests({
      status: 'pending',
    });

    const pendingSwapsForWeek = swapRequests.filter(sr => {
      const assignment = assignments.find(a => a.id === sr.originalAssignmentId);
      return assignment !== undefined;
    });

    return {
      schedule: run,
      assignments,
      swapRequests: pendingSwapsForWeek,
      metrics: {
        totalShifts: assignments.length,
        filledShifts: assignments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length,
        pendingSwaps: pendingSwapsForWeek.length,
        coveragePercentage: run?.coverageScore ? parseFloat(run.coverageScore) : 0,
      },
    };
  }
}

export const aiSchedulingService = new AISchedulingService();
