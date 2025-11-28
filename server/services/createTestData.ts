import { db } from '../db';
import bcrypt from 'bcrypt';
import {
  users,
  teamMembers,
  jobs,
  timeClocks,
  timesheets,
  workSchedules,
  roles,
  departments
} from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Service to create test data for email notifications
 * This ensures we have real data in the database to test with
 */
export class TestDataService {
  /**
   * Create a test employee with all necessary data
   */
  async createTestEmployee() {
    try {
      // Check if test user already exists (by username or email)
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.username, 'test.employee'))
        .limit(1);
      
      if (existingUser.length > 0) {
        console.log('Test employee already exists with ID:', existingUser[0].id);
        return existingUser[0].id;
      }
      
      // Create test role if it doesn't exist
      let testRole = await db.select()
        .from(roles)
        .where(eq(roles.name, 'Employee'))
        .limit(1);
      
      if (testRole.length === 0) {
        const newRole = await db.insert(roles).values({
          name: 'Employee',
          description: 'Standard employee role',
          permissions: {},
        }).returning();
        testRole = newRole;
      }
      
      // Create test department if it doesn't exist
      let testDept = await db.select()
        .from(departments)
        .where(eq(departments.name, 'Fabrication'))
        .limit(1);
      
      if (testDept.length === 0) {
        const newDept = await db.insert(departments).values({
          name: 'Fabrication',
          code: 'FAB',
          description: 'Fabrication department',
          isActive: true
        }).returning();
        testDept = newDept;
      }
      
      // Create test user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      const newUser = await db.insert(users).values({
        username: 'test.employee',
        email: 'test.employee@lateralengineering.co.nz',
        name: 'John Smith',
        password: hashedPassword,
      }).returning();
      
      // Create team member profile
      await db.insert(teamMembers).values({
        userId: newUser[0].id,
        roleId: testRole[0].id,
        departmentId: testDept[0].id,
        firstName: 'John',
        lastName: 'Smith',
        position: 'Senior Welder',
        jobTitle: 'Fabrication Specialist',
        hourlyRate: '35.00',
        overtimeRate: '52.50',
        employeeNumber: 'EMP001',
        isActive: true
      });
      
      console.log('Created test employee with ID:', newUser[0].id);
      return newUser[0].id;
    } catch (error) {
      console.error('Error creating test employee:', error);
      throw error;
    }
  }
  
  /**
   * Create test shift for tomorrow
   */
  async createTestShift(userId: number) {
    try {
      // Create a test job if needed
      let testJob = await db.select()
        .from(jobs)
        .where(eq(jobs.jobNumber, 'TEST-001'))
        .limit(1);
      
      if (testJob.length === 0) {
        const newJob = await db.insert(jobs).values({
          jobNumber: 'TEST-001',
          clientName: 'Auckland Transport',
          projectDescription: 'Auckland Harbour Bridge Maintenance',
          status: 'active',
          estimatedHours: '500'
        }).returning();
        testJob = newJob;
      }
      
      // Create shift for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const shift = await db.insert(workSchedules).values({
        userId,
        date: tomorrow.toISOString().split('T')[0],
        shiftStart: '09:00:00',  // Time field expects HH:MM:SS format
        shiftEnd: '17:00:00',    // Time field expects HH:MM:SS format
        breakDuration: 30,
        location: 'Auckland Workshop',
        jobId: testJob[0].id,
        notes: 'Bridge welding and structural repairs'
      }).returning();
      
      console.log('Created test shift for tomorrow:', shift[0].id);
      return shift[0].id;
    } catch (error) {
      console.error('Error creating test shift:', error);
      throw error;
    }
  }
  
  /**
   * Create test clock in record
   */
  async createTestClockIn(userId: number, jobId?: number) {
    try {
      const now = new Date();
      
      const clockIn = await db.insert(timeClocks).values({
        userId,
        clockType: 'clock_in',  // Changed from 'in' to 'clock_in'
        timestamp: now,
        location: 'Auckland Workshop',
        geolocation: {
          lat: -36.8485,
          lng: 174.7633,
          accuracy: 10,
          address: '123 Workshop Road, Auckland'
        },
        photoUrl: '/photos/clock_in_test.jpg',
        captureMethod: 'camera',
        geofenceValidated: true,
        jobId: jobId || null,
        notes: 'Clocked in via mobile app'
      }).returning();
      
      console.log('Created test clock in:', clockIn[0].id);
      return clockIn[0].id;
    } catch (error) {
      console.error('Error creating test clock in:', error);
      throw error;
    }
  }
  
  /**
   * Create test clock out record
   */
  async createTestClockOut(userId: number, jobId?: number) {
    try {
      const now = new Date();
      
      const clockOut = await db.insert(timeClocks).values({
        userId,
        clockType: 'clock_out',  // Changed from 'out' to 'clock_out'
        timestamp: now,
        location: 'Auckland Workshop',
        geolocation: {
          lat: -36.8485,
          lng: 174.7633,
          accuracy: 10,
          address: '123 Workshop Road, Auckland'
        },
        photoUrl: '/photos/clock_out_test.jpg',
        captureMethod: 'camera',
        geofenceValidated: true,
        jobId: jobId || null,
        notes: 'Clocked out after completing shift'
      }).returning();
      
      console.log('Created test clock out:', clockOut[0].id);
      return clockOut[0].id;
    } catch (error) {
      console.error('Error creating test clock out:', error);
      throw error;
    }
  }
  
  /**
   * Create test timesheet for approval
   */
  async createTestTimesheet(userId: number, jobId?: number) {
    try {
      const today = new Date();
      
      const timesheet = await db.insert(timesheets).values({
        userId,
        date: today.toISOString().split('T')[0],
        jobId: jobId || null,
        startTime: new Date(today.setHours(9, 0, 0, 0)),
        endTime: new Date(today.setHours(17, 0, 0, 0)),
        hoursWorked: '8.00',
        breakHours: '0.50',
        overtimeHours: '0.00',
        status: 'submitted',
        description: 'Regular workday - welding and fabrication',
        workLocation: 'workshop',
        submittedAt: new Date()
      }).returning();
      
      console.log('Created test timesheet:', timesheet[0].id);
      return timesheet[0].id;
    } catch (error) {
      console.error('Error creating test timesheet:', error);
      throw error;
    }
  }
  
  /**
   * Create complete test data set
   */
  async createCompleteTestData() {
    try {
      console.log('Creating complete test data set...');
      
      // Create test employee
      const userId = await this.createTestEmployee();
      
      // Create test shift for tomorrow
      const shiftId = await this.createTestShift(userId);
      
      // Get the job from the shift
      const shift = await db.select()
        .from(workSchedules)
        .where(eq(workSchedules.id, shiftId))
        .limit(1);
      
      const jobId = shift[0]?.jobId || null;
      
      // Create clock in/out records
      const clockInId = await this.createTestClockIn(userId, jobId);
      const clockOutId = await this.createTestClockOut(userId, jobId);
      
      // Create timesheet for approval
      const timesheetId = await this.createTestTimesheet(userId, jobId);
      
      return {
        userId,
        shiftId,
        clockInId,
        clockOutId,
        timesheetId,
        jobId,
        testEmail: 'test.employee@lateralengineering.co.nz'
      };
    } catch (error) {
      console.error('Error creating complete test data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const testDataService = new TestDataService();