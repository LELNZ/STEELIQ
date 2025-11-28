import { db } from '../db';
import { users, teamMembers, jobs, timeClocks, timesheets } from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { format, subDays, addHours, addMinutes, setHours, setMinutes, isWeekend } from 'date-fns';

// Configuration
const NUM_DAYS = 30; // Generate data for last 30 days
const EVENTS_PER_DAY_PER_USER = 6; // clock_in, break_start, break_end, meal_start, meal_end, clock_out
const PHOTO_PLACEHOLDER = '/secure-uploads/time-clock/placeholder.jpg';

// Location data for variety
const LOCATIONS = [
  { name: 'Main Office', lat: -36.8485, lng: 174.7633, accuracy: 10, address: '123 Queen St, Auckland' },
  { name: 'Workshop', lat: -36.8590, lng: 174.7603, accuracy: 15, address: '45 Industrial Ave, Penrose' },
  { name: 'Site A', lat: -36.8700, lng: 174.7700, accuracy: 25, address: 'Construction Site, Mt Eden' },
  { name: 'Site B', lat: -36.9000, lng: 174.7800, accuracy: 30, address: 'Construction Site, Manukau' },
  { name: 'Remote', lat: -37.0000, lng: 174.8000, accuracy: 50, address: 'Field Location' }
];

// Clock patterns for realistic data
const CLOCK_PATTERNS = {
  normal: {
    clock_in: { hour: 8, minute: 0, variance: 30 },
    break_start: { hour: 10, minute: 15, variance: 15 },
    break_end: { hour: 10, minute: 30, variance: 10 },
    meal_start: { hour: 12, minute: 30, variance: 20 },
    meal_end: { hour: 13, minute: 0, variance: 15 },
    clock_out: { hour: 17, minute: 0, variance: 45 }
  },
  early: {
    clock_in: { hour: 6, minute: 30, variance: 20 },
    break_start: { hour: 9, minute: 0, variance: 15 },
    break_end: { hour: 9, minute: 15, variance: 10 },
    meal_start: { hour: 11, minute: 30, variance: 20 },
    meal_end: { hour: 12, minute: 0, variance: 15 },
    clock_out: { hour: 15, minute: 0, variance: 30 }
  },
  late: {
    clock_in: { hour: 10, minute: 0, variance: 30 },
    break_start: { hour: 12, minute: 0, variance: 15 },
    break_end: { hour: 12, minute: 15, variance: 10 },
    meal_start: { hour: 14, minute: 30, variance: 20 },
    meal_end: { hour: 15, minute: 0, variance: 15 },
    clock_out: { hour: 19, minute: 0, variance: 45 }
  }
};

// Generate time with variance
function generateTime(date: Date, schedule: any): Date {
  const variance = Math.floor((Math.random() - 0.5) * schedule.variance);
  const result = setHours(setMinutes(date, schedule.minute), schedule.hour);
  return addMinutes(result, variance);
}

// Generate clock events for a single day
async function generateDayEvents(userId: number, date: Date, jobId: number | null, pattern: keyof typeof CLOCK_PATTERNS = 'normal') {
  // Skip weekends occasionally (70% of weekends are skipped)
  if (isWeekend(date) && Math.random() < 0.7) {
    return [];
  }

  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  const schedule = CLOCK_PATTERNS[pattern];
  const events = [];

  // Generate events for the day
  for (const [eventType, timing] of Object.entries(schedule)) {
    const timestamp = generateTime(date, timing);
    
    // Occasionally skip breaks (10% chance)
    if ((eventType === 'break_start' || eventType === 'break_end') && Math.random() < 0.1) {
      continue;
    }

    // Add photo URL for clock_in and clock_out (80% of the time)
    const hasPhoto = (eventType === 'clock_in' || eventType === 'clock_out') && Math.random() < 0.8;
    
    const clockEvent = {
      userId,
      clockType: eventType.replace('_', '_'), // Keep underscores
      timestamp,
      location: location.name,
      geolocation: {
        lat: location.lat + (Math.random() - 0.5) * 0.001, // Add slight variance
        lng: location.lng + (Math.random() - 0.5) * 0.001,
        accuracy: location.accuracy + Math.random() * 10,
        address: location.address
      },
      photoUrl: hasPhoto ? PHOTO_PLACEHOLDER : null,
      captureMethod: hasPhoto ? (Math.random() < 0.7 ? 'camera' : 'gallery') : 'manual',
      geofenceValidated: Math.random() < 0.95, // 95% pass geofence
      deviceInfo: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        platform: 'iOS',
        screenResolution: '1170x2532',
        timezone: 'Pacific/Auckland'
      },
      jobId,
      notes: Math.random() < 0.1 ? 'Working on special project' : null
    };

    events.push(clockEvent);
  }

  return events;
}

// Generate timesheets from clock events
async function generateTimesheets(userId: number, startDate: Date, endDate: Date) {
  // Get all clock events for the user in date range
  const clocks = await db
    .select()
    .from(timeClocks)
    .where(
      and(
        eq(timeClocks.userId, userId),
        gte(timeClocks.timestamp, startDate),
        lte(timeClocks.timestamp, endDate)
      )
    )
    .orderBy(timeClocks.timestamp);

  // Group by day
  const dailyClocks = new Map<string, typeof clocks>();
  
  for (const clock of clocks) {
    const dayKey = format(clock.timestamp!, 'yyyy-MM-dd');
    if (!dailyClocks.has(dayKey)) {
      dailyClocks.set(dayKey, []);
    }
    dailyClocks.get(dayKey)!.push(clock);
  }

  // Create timesheet for each day with complete clock cycle
  const timesheetData = [];
  for (const [dayKey, dayClocks] of dailyClocks) {
    const clockIn = dayClocks.find(c => c.clockType === 'clock_in');
    const clockOut = dayClocks.find(c => c.clockType === 'clock_out');
    
    if (clockIn && clockOut) {
      // Calculate hours worked
      const startTime = new Date(clockIn.timestamp!);
      const endTime = new Date(clockOut.timestamp!);
      const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      // Calculate break time
      const breakStart = dayClocks.find(c => c.clockType === 'break_start');
      const breakEnd = dayClocks.find(c => c.clockType === 'break_end');
      let breakHours = 0;
      if (breakStart && breakEnd) {
        breakHours = (new Date(breakEnd.timestamp!).getTime() - new Date(breakStart.timestamp!).getTime()) / (1000 * 60 * 60);
      }
      
      // Calculate meal time
      const mealStart = dayClocks.find(c => c.clockType === 'meal_start');
      const mealEnd = dayClocks.find(c => c.clockType === 'meal_end');
      let mealHours = 0;
      if (mealStart && mealEnd) {
        mealHours = (new Date(mealEnd.timestamp!).getTime() - new Date(mealStart.timestamp!).getTime()) / (1000 * 60 * 60);
      }
      
      const totalHours = hoursWorked - breakHours - mealHours;
      const regularHours = Math.min(totalHours, 8);
      const overtimeHours = Math.max(0, totalHours - 8);
      
      timesheetData.push({
        userId,
        jobId: clockIn.jobId,
        date: new Date(dayKey),
        startTime: startTime,
        endTime: endTime,
        hoursWorked: totalHours.toFixed(2),
        breakHours: (breakHours + mealHours).toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        status: Math.random() < 0.7 ? 'approved' : 'submitted', // 70% approved
        approved: Math.random() < 0.7 ? true : false,
        approvedBy: Math.random() < 0.7 ? 1 : null, // Admin user
        approvedAt: Math.random() < 0.7 ? new Date() : null,
        workLocation: clockIn.location || 'workshop',
        geolocation: clockIn.geolocation,
        notes: `Generated from time clocks on ${dayKey}`
      });
    }
  }

  return timesheetData;
}

async function main() {
  console.log('🕐 Starting Time Clock test data generation...\n');

  try {
    // Get all active team members
    const activeMembers = await db
      .select({
        userId: teamMembers.userId,
        userName: users.name,
        roleId: teamMembers.roleId
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.isActive, true));

    console.log(`Found ${activeMembers.length} active team members`);

    // Get active jobs for assignment
    const activeJobs = await db
      .select({ id: jobs.id, jobNumber: jobs.jobNumber })
      .from(jobs)
      .where(eq(jobs.status, 'in_progress'))
      .limit(10);

    console.log(`Found ${activeJobs.length} active jobs`);

    // If no active jobs, set some to in_progress
    if (activeJobs.length === 0) {
      await db
        .update(jobs)
        .set({ status: 'in_progress' })
        .where(sql`id IN (SELECT id FROM jobs LIMIT 5)`);
      
      const updatedJobs = await db
        .select({ id: jobs.id, jobNumber: jobs.jobNumber })
        .from(jobs)
        .where(eq(jobs.status, 'in_progress'))
        .limit(5);
      
      activeJobs.push(...updatedJobs);
      console.log(`Updated ${updatedJobs.length} jobs to in_progress status`);
    }

    let totalEventsGenerated = 0;
    let totalTimesheetsGenerated = 0;

    // Generate data for each team member
    for (const member of activeMembers) {
      console.log(`\nGenerating data for ${member.userName}...`);
      
      const patterns: Array<keyof typeof CLOCK_PATTERNS> = ['normal', 'early', 'late'];
      let memberEvents = 0;

      // Generate events for last NUM_DAYS days
      for (let dayOffset = 0; dayOffset < NUM_DAYS; dayOffset++) {
        const date = subDays(new Date(), dayOffset);
        
        // Assign a job (80% of the time)
        const jobId = Math.random() < 0.8 && activeJobs.length > 0
          ? activeJobs[Math.floor(Math.random() * activeJobs.length)].id
          : null;
        
        // Select pattern (mostly normal)
        const pattern = Math.random() < 0.7 ? 'normal' : patterns[Math.floor(Math.random() * patterns.length)];
        
        // Generate events for this day
        const dayEvents = await generateDayEvents(member.userId, date, jobId, pattern);
        
        // Insert events
        if (dayEvents.length > 0) {
          await db.insert(timeClocks).values(dayEvents);
          memberEvents += dayEvents.length;
        }
      }

      console.log(`  ✓ Generated ${memberEvents} clock events`);
      totalEventsGenerated += memberEvents;

      // Generate timesheets from the clock events
      const startDate = subDays(new Date(), NUM_DAYS);
      const endDate = new Date();
      const timesheetData = await generateTimesheets(member.userId, startDate, endDate);
      
      if (timesheetData.length > 0) {
        await db.insert(timesheets).values(timesheetData);
        console.log(`  ✓ Generated ${timesheetData.length} timesheets`);
        totalTimesheetsGenerated += timesheetData.length;
      }
    }

    // Generate some error/edge cases
    console.log('\n📊 Generating edge cases...');
    
    // Clock in without clock out (forgot to clock out)
    await db.insert(timeClocks).values({
      userId: activeMembers[0].userId,
      clockType: 'clock_in',
      timestamp: setHours(new Date(), 14),
      location: LOCATIONS[0].name,
      geolocation: LOCATIONS[0],
      captureMethod: 'manual',
      notes: 'Forgot to clock out - test case'
    });

    // Clock out without clock in (system error)
    await db.insert(timeClocks).values({
      userId: activeMembers[1]?.userId || 1,
      clockType: 'clock_out',
      timestamp: setHours(new Date(), 16),
      location: LOCATIONS[1].name,
      geolocation: LOCATIONS[1],
      captureMethod: 'manual',
      notes: 'Missing clock in - test case'
    });

    totalEventsGenerated += 2;

    // Summary statistics
    const finalStats = await db
      .select({
        totalClocks: sql<number>`count(*)`,
        uniqueUsers: sql<number>`count(distinct user_id)`,
        withPhotos: sql<number>`count(case when photo_url is not null then 1 end)`,
        withGPS: sql<number>`count(case when geolocation is not null then 1 end)`,
        withJobs: sql<number>`count(case when job_id is not null then 1 end)`
      })
      .from(timeClocks);

    console.log('\n✅ Test data generation complete!\n');
    console.log('📊 Summary:');
    console.log(`  Total clock events: ${finalStats[0].totalClocks}`);
    console.log(`  Unique users: ${finalStats[0].uniqueUsers}`);
    console.log(`  Events with photos: ${finalStats[0].withPhotos}`);
    console.log(`  Events with GPS: ${finalStats[0].withGPS}`);
    console.log(`  Events linked to jobs: ${finalStats[0].withJobs}`);
    console.log(`  Timesheets generated: ${totalTimesheetsGenerated}`);
    
    console.log('\n🎉 Time & Payroll test data ready for testing!');

  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
main();