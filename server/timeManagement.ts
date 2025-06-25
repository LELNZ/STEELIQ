import { db } from "./db";
import { timesheets, timeClocks, jobTasks, leaveRequests, workSchedules, users, jobs } from "@shared/schema";
import { eq, and, desc, gte, lte, isNull } from "drizzle-orm";
import type { 
  Timesheet, 
  InsertTimesheet, 
  TimeClock,
  InsertTimeClock,
  JobTask, 
  InsertJobTask,
  LeaveRequest,
  InsertLeaveRequest,
  WorkSchedule,
  InsertWorkSchedule
} from "@shared/schema";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from "date-fns";

export interface ITimeManagementStorage {
  // Time Clocks
  createTimeClock(clock: InsertTimeClock): Promise<TimeClock>;
  getTodayTimeClocks(userId: number): Promise<TimeClock[]>;
  getUserTimeClocks(userId: number, startDate: Date, endDate: Date): Promise<TimeClock[]>;

  // Timesheets
  getTimesheets(userId?: number, startDate?: Date, endDate?: Date): Promise<any[]>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: number, timesheet: Partial<InsertTimesheet>): Promise<Timesheet>;
  deleteTimesheet(id: number): Promise<void>;
  getTimesheetById(id: number): Promise<any | undefined>;
  submitTimesheet(id: number, userId: number): Promise<Timesheet>;
  approveTimesheet(id: number, approvedBy: number): Promise<Timesheet>;

  // Job Tasks
  getJobTasks(assignedTo?: number): Promise<any[]>;
  createJobTask(task: InsertJobTask): Promise<JobTask>;
  updateJobTask(id: number, task: Partial<InsertJobTask>): Promise<JobTask>;
  deleteJobTask(id: number): Promise<void>;
  getJobTaskById(id: number): Promise<any | undefined>;
  assignTask(taskId: number, userId: number): Promise<JobTask>;

  // Leave Requests
  getLeaveRequests(userId?: number): Promise<any[]>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, request: Partial<InsertLeaveRequest>): Promise<LeaveRequest>;
  approveLeaveRequest(id: number, approvedBy: number, approved: boolean): Promise<LeaveRequest>;

  // Work Schedules
  getWorkSchedules(userId?: number, date?: Date): Promise<any[]>;
  createWorkSchedule(schedule: InsertWorkSchedule): Promise<WorkSchedule>;
  updateWorkSchedule(id: number, schedule: Partial<InsertWorkSchedule>): Promise<WorkSchedule>;
  deleteWorkSchedule(id: number): Promise<void>;

  // Analytics
  getUserHoursSummary(userId: number, startDate: Date, endDate: Date): Promise<any>;
  getTeamProductivity(startDate: Date, endDate: Date): Promise<any[]>;
}

export class TimeManagementStorage implements ITimeManagementStorage {
  
  // Time Clocks
  async createTimeClock(clock: InsertTimeClock): Promise<TimeClock> {
    // Auto-generate timesheets from time clocks
    if (clock.clockType === "clock_out") {
      await this.generateTimesheetFromClocks(clock.userId, new Date(clock.timestamp));
    }
    
    const [newClock] = await db.insert(timeClocks).values(clock).returning();
    return newClock;
  }

  async getTodayTimeClocks(userId: number): Promise<TimeClock[]> {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    return await db.select()
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.userId, userId),
          gte(timeClocks.timestamp, startOfToday),
          lte(timeClocks.timestamp, endOfToday)
        )
      )
      .orderBy(desc(timeClocks.timestamp));
  }

  async getUserTimeClocks(userId: number, startDate: Date, endDate: Date): Promise<TimeClock[]> {
    return await db.select()
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.userId, userId),
          gte(timeClocks.timestamp, startDate),
          lte(timeClocks.timestamp, endDate)
        )
      )
      .orderBy(desc(timeClocks.timestamp));
  }

  // Timesheets
  async getTimesheets(userId?: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    let query = db.query.timesheets.findMany({
      with: {
        user: {
          columns: {
            id: true,
            name: true,
          }
        },
        job: {
          columns: {
            id: true,
            title: true,
          }
        },
        task: {
          columns: {
            id: true,
            taskName: true,
          }
        }
      },
      orderBy: [desc(timesheets.date)]
    });

    // Apply filters
    const conditions = [];
    if (userId) conditions.push(eq(timesheets.userId, userId));
    if (startDate) conditions.push(gte(timesheets.date, format(startDate, 'yyyy-MM-dd')));
    if (endDate) conditions.push(lte(timesheets.date, format(endDate, 'yyyy-MM-dd')));

    if (conditions.length > 0) {
      return await db.query.timesheets.findMany({
        where: and(...conditions),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
            }
          },
          job: {
            columns: {
              id: true,
              title: true,
            }
          },
          task: {
            columns: {
              id: true,
              taskName: true,
            }
          }
        },
        orderBy: [desc(timesheets.date)]
      });
    }

    return await query;
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    const [newTimesheet] = await db.insert(timesheets).values(timesheet).returning();
    return newTimesheet;
  }

  async updateTimesheet(id: number, timesheetData: Partial<InsertTimesheet>): Promise<Timesheet> {
    const [updatedTimesheet] = await db
      .update(timesheets)
      .set({ ...timesheetData, updatedAt: new Date() })
      .where(eq(timesheets.id, id))
      .returning();
    return updatedTimesheet;
  }

  async deleteTimesheet(id: number): Promise<void> {
    await db.delete(timesheets).where(eq(timesheets.id, id));
  }

  async getTimesheetById(id: number): Promise<any | undefined> {
    const [timesheet] = await db.query.timesheets.findMany({
      where: eq(timesheets.id, id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
          }
        },
        job: {
          columns: {
            id: true,
            title: true,
          }
        },
        task: {
          columns: {
            id: true,
            taskName: true,
          }
        }
      }
    });
    return timesheet;
  }

  async submitTimesheet(id: number, userId: number): Promise<Timesheet> {
    const [submittedTimesheet] = await db
      .update(timesheets)
      .set({ 
        status: "submitted", 
        submittedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(timesheets.id, id), eq(timesheets.userId, userId)))
      .returning();
    return submittedTimesheet;
  }

  async approveTimesheet(id: number, approvedBy: number): Promise<Timesheet> {
    const [approvedTimesheet] = await db
      .update(timesheets)
      .set({ 
        status: "approved", 
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(timesheets.id, id))
      .returning();
    return approvedTimesheet;
  }

  // Job Tasks
  async getJobTasks(assignedTo?: number): Promise<any[]> {
    const conditions = [];
    if (assignedTo) conditions.push(eq(jobTasks.assignedTo, assignedTo));

    return await db.query.jobTasks.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        job: {
          columns: {
            id: true,
            title: true,
          }
        },
        assignee: {
          columns: {
            id: true,
            name: true,
          }
        },
        creator: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [desc(jobTasks.createdAt)]
    });
  }

  async createJobTask(task: InsertJobTask): Promise<JobTask> {
    const [newTask] = await db.insert(jobTasks).values(task).returning();
    return newTask;
  }

  async updateJobTask(id: number, taskData: Partial<InsertJobTask>): Promise<JobTask> {
    const [updatedTask] = await db
      .update(jobTasks)
      .set({ ...taskData, updatedAt: new Date() })
      .where(eq(jobTasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteJobTask(id: number): Promise<void> {
    await db.delete(jobTasks).where(eq(jobTasks.id, id));
  }

  async getJobTaskById(id: number): Promise<any | undefined> {
    const [task] = await db.query.jobTasks.findMany({
      where: eq(jobTasks.id, id),
      with: {
        job: {
          columns: {
            id: true,
            title: true,
          }
        },
        assignee: {
          columns: {
            id: true,
            name: true,
          }
        }
      }
    });
    return task;
  }

  async assignTask(taskId: number, userId: number): Promise<JobTask> {
    const [assignedTask] = await db
      .update(jobTasks)
      .set({ 
        assignedTo: userId,
        status: "pending",
        updatedAt: new Date()
      })
      .where(eq(jobTasks.id, taskId))
      .returning();
    return assignedTask;
  }

  // Leave Requests
  async getLeaveRequests(userId?: number): Promise<any[]> {
    const conditions = [];
    if (userId) conditions.push(eq(leaveRequests.userId, userId));

    return await db.query.leaveRequests.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
          }
        },
        approver: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [desc(leaveRequests.submittedAt)]
    });
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const [newRequest] = await db.insert(leaveRequests).values(request).returning();
    return newRequest;
  }

  async updateLeaveRequest(id: number, requestData: Partial<InsertLeaveRequest>): Promise<LeaveRequest> {
    const [updatedRequest] = await db
      .update(leaveRequests)
      .set(requestData)
      .where(eq(leaveRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async approveLeaveRequest(id: number, approvedBy: number, approved: boolean): Promise<LeaveRequest> {
    const [updatedRequest] = await db
      .update(leaveRequests)
      .set({ 
        status: approved ? "approved" : "rejected",
        approvedBy,
        approvedAt: new Date()
      })
      .where(eq(leaveRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Work Schedules
  async getWorkSchedules(userId?: number, date?: Date): Promise<any[]> {
    const conditions = [];
    if (userId) conditions.push(eq(workSchedules.userId, userId));
    if (date) conditions.push(eq(workSchedules.date, format(date, 'yyyy-MM-dd')));

    return await db.query.workSchedules.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
          }
        },
        job: {
          columns: {
            id: true,
            title: true,
          }
        }
      },
      orderBy: [desc(workSchedules.date)]
    });
  }

  async createWorkSchedule(schedule: InsertWorkSchedule): Promise<WorkSchedule> {
    const [newSchedule] = await db.insert(workSchedules).values(schedule).returning();
    return newSchedule;
  }

  async updateWorkSchedule(id: number, scheduleData: Partial<InsertWorkSchedule>): Promise<WorkSchedule> {
    const [updatedSchedule] = await db
      .update(workSchedules)
      .set(scheduleData)
      .where(eq(workSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteWorkSchedule(id: number): Promise<void> {
    await db.delete(workSchedules).where(eq(workSchedules.id, id));
  }

  // Analytics
  async getUserHoursSummary(userId: number, startDate: Date, endDate: Date): Promise<any> {
    const userTimesheets = await this.getTimesheets(userId, startDate, endDate);
    
    const totalHours = userTimesheets.reduce((sum, ts) => sum + parseFloat(ts.totalHours || '0'), 0);
    const overtimeHours = userTimesheets.reduce((sum, ts) => sum + parseFloat(ts.overtimeHours || '0'), 0);
    const totalPay = userTimesheets.reduce((sum, ts) => sum + parseFloat(ts.totalPay || '0'), 0);

    return {
      totalHours: totalHours.toFixed(2),
      overtimeHours: overtimeHours.toFixed(2),
      regularHours: (totalHours - overtimeHours).toFixed(2),
      totalPay: totalPay.toFixed(2),
      averageHoursPerDay: (totalHours / userTimesheets.length || 0).toFixed(2),
      daysWorked: userTimesheets.length
    };
  }

  async getTeamProductivity(startDate: Date, endDate: Date): Promise<any[]> {
    const teamTimesheets = await this.getTimesheets(undefined, startDate, endDate);
    
    const userSummaries = teamTimesheets.reduce((acc, timesheet) => {
      const userId = timesheet.userId;
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userName: timesheet.user?.name || 'Unknown',
          totalHours: 0,
          overtimeHours: 0,
          daysWorked: 0,
          efficiency: 0
        };
      }
      
      acc[userId].totalHours += parseFloat(timesheet.totalHours || '0');
      acc[userId].overtimeHours += parseFloat(timesheet.overtimeHours || '0');
      acc[userId].daysWorked += 1;
      
      return acc;
    }, {} as any);

    return Object.values(userSummaries);
  }

  // Helper: Generate timesheet from time clocks
  private async generateTimesheetFromClocks(userId: number, date: Date): Promise<void> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const clocks = await this.getUserTimeClocks(userId, dayStart, dayEnd);
    
    if (clocks.length < 2) return; // Need at least clock in and clock out
    
    // Find pairs of clock in/out
    let clockInTime: Date | null = null;
    let totalMinutes = 0;
    let breakMinutes = 0;
    let isOnBreak = false;
    
    for (const clock of clocks.reverse()) { // Process in chronological order
      if (clock.clockType === "clock_in") {
        clockInTime = new Date(clock.timestamp);
        isOnBreak = false;
      } else if (clock.clockType === "clock_out" && clockInTime) {
        if (!isOnBreak) {
          const duration = new Date(clock.timestamp).getTime() - clockInTime.getTime();
          totalMinutes += duration / (1000 * 60);
        }
        clockInTime = null;
      } else if (clock.clockType === "break_start") {
        isOnBreak = true;
      } else if (clock.clockType === "break_end") {
        isOnBreak = false;
      }
    }
    
    if (totalMinutes > 0) {
      const totalHours = totalMinutes / 60;
      const overtimeHours = Math.max(0, totalHours - 8); // Standard 8-hour day
      
      // Check if timesheet already exists
      const existingTimesheet = await db.query.timesheets.findFirst({
        where: and(
          eq(timesheets.userId, userId),
          eq(timesheets.date, format(date, 'yyyy-MM-dd'))
        )
      });
      
      if (!existingTimesheet) {
        const firstClock = clocks[clocks.length - 1]; // First clock of the day
        const lastClock = clocks[0]; // Last clock of the day
        
        await this.createTimesheet({
          userId,
          date: format(date, 'yyyy-MM-dd'),
          startTime: firstClock.timestamp,
          endTime: lastClock.timestamp,
          breakDuration: breakMinutes,
          totalHours: totalHours.toFixed(2),
          overtimeHours: overtimeHours.toFixed(2),
          workLocation: firstClock.location || "workshop",
          status: "draft",
          jobId: firstClock.jobId,
          taskId: firstClock.taskId
        });
      }
    }
  }
}

export const timeManagementStorage = new TimeManagementStorage();