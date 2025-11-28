#!/usr/bin/env tsx

/**
 * Test Data Generation Script for Time & Payroll Module
 * Generates realistic time clock events and timesheets for load testing
 * 
 * Usage: npm run tsx server/scripts/generateTimeTestData.ts
 */

import { db } from '../db';
import { 
  timeClocks, 
  timesheets,
  users,
  jobs,
  laborRates,
  departments
} from '../../shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import * as crypto from 'crypto';

// Test data generation parameters
const CONFIG = {
  TIME_EVENTS_TO_CREATE: 1000,
  TIMESHEETS_TO_CREATE: 50,
  DAYS_OF_HISTORY: 30,
  EMPLOYEES_TO_USE: 10,
  JOBS_TO_USE: 5,
  GPS_CAPTURE_RATE: 0.95, // 95% of events have GPS
  PHOTO_CAPTURE_RATE: 0.3, // 30% of events have photos
  APPROVAL_RATE: 0.7, // 70% of timesheets get approved
  REJECTION_RATE: 0.1, // 10% get rejected
};

// Utility functions
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateGPSLocation() {
  // Generate realistic GPS coordinates (Houston, TX area)
  return {
    latitude: randomFloat(29.5, 30.1),
    longitude: randomFloat(-95.8, -95.0),
    accuracy: randomFloat(5, 50) // meters
  };
}

function generatePhotoUrl(employeeId: number, timestamp: Date) {
  // Generate a deterministic fake photo URL
  const hash = crypto.createHash('md5')
    .update(`${employeeId}-${timestamp.toISOString()}`)
    .digest('hex');
  return `/api/photos/time-clock/${hash}.jpg`;
}

function generateDeviceInfo() {
  const devices = [
    'iPhone 13 Pro - iOS 16.5',
    'iPhone 14 - iOS 17.1',
    'Samsung Galaxy S23 - Android 13',
    'iPad Pro - iPadOS 16.6',
    'Google Pixel 7 - Android 13'
  ];
  return randomChoice(devices);
}

async function generateTimeTestData() {
  console.log('🚀 Starting Time & Payroll test data generation...');
  console.log('================================================\n');

  try {
    // Step 1: Get existing data
    console.log('📊 Fetching existing data...');
    const [existingUsers, existingJobs, existingDepartments] = await Promise.all([
      db.select().from(users).limit(CONFIG.EMPLOYEES_TO_USE),
      db.select().from(jobs).limit(CONFIG.JOBS_TO_USE),
      db.select().from(departments)
    ]);

    if (existingUsers.length < 3) {
      console.error('❌ Not enough users in the system. Need at least 3 users.');
      process.exit(1);
    }

    if (existingJobs.length === 0) {
      console.error('❌ No jobs found in the system.');
      process.exit(1);
    }

    console.log(`✅ Found ${existingUsers.length} users and ${existingJobs.length} jobs\n`);

    // Step 2: Generate time clock events
    console.log(`⏰ Generating ${CONFIG.TIME_EVENTS_TO_CREATE} time clock events...`);
    
    const timeEvents = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - CONFIG.DAYS_OF_HISTORY);
    
    for (let i = 0; i < CONFIG.TIME_EVENTS_TO_CREATE; i++) {
      const employee = randomChoice(existingUsers);
      const job = randomChoice(existingJobs);
      
      // Generate a timestamp within the history period
      const daysAgo = randomBetween(0, CONFIG.DAYS_OF_HISTORY);
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() - daysAgo);
      eventDate.setHours(randomBetween(6, 18)); // Working hours
      eventDate.setMinutes(randomBetween(0, 59));
      eventDate.setSeconds(randomBetween(0, 59));
      
      // Determine event type (ensure pairs of clock in/out)
      const eventType = (i % 2 === 0) ? 'clock_in' : 'clock_out';
      
      // Generate GPS data
      const hasGPS = Math.random() < CONFIG.GPS_CAPTURE_RATE;
      const gpsData = hasGPS ? generateGPSLocation() : {};
      
      // Generate photo data
      const hasPhoto = Math.random() < CONFIG.PHOTO_CAPTURE_RATE;
      const photoUrl = hasPhoto ? generatePhotoUrl(employee.id, eventDate) : null;
      
      timeEvents.push({
        userId: employee.id,
        clockType: eventType,
        timestamp: eventDate,
        location: `Job ${job.number}`,
        geolocation: hasGPS ? {
          lat: gpsData.latitude,
          lng: gpsData.longitude,
          accuracy: gpsData.accuracy,
          address: '123 Test St, Houston, TX'
        } : null,
        photoUrl: photoUrl,
        captureMethod: hasPhoto ? 'camera' : null,
        geofenceValidated: hasGPS,
        deviceInfo: { device: generateDeviceInfo() },
        notes: (Math.random() < 0.1) ? `Test note ${i}` : null,
        jobId: job.id,
        taskId: null,
        createdAt: eventDate
      });
      
      // Show progress every 100 events
      if ((i + 1) % 100 === 0) {
        console.log(`  ⏳ Generated ${i + 1}/${CONFIG.TIME_EVENTS_TO_CREATE} events...`);
      }
    }
    
    // Batch insert time events
    console.log('  💾 Inserting time clock events...');
    await db.insert(timeClocks).values(timeEvents);
    console.log(`✅ Created ${CONFIG.TIME_EVENTS_TO_CREATE} time clock events\n`);

    // Step 3: Generate timesheets
    console.log(`📋 Generating ${CONFIG.TIMESHEETS_TO_CREATE} timesheets...`);
    
    const timesheetsToCreate = [];
    const weekStartDates = new Set<string>();
    
    // Generate unique week start dates
    for (let i = 0; i < CONFIG.TIMESHEETS_TO_CREATE; i++) {
      const daysAgo = randomBetween(7, CONFIG.DAYS_OF_HISTORY);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - daysAgo);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Sunday
      weekStart.setHours(0, 0, 0, 0);
      
      const employee = randomChoice(existingUsers);
      const key = `${employee.id}-${weekStart.toISOString()}`;
      
      if (!weekStartDates.has(key)) {
        weekStartDates.add(key);
        
        // Find supervisor from department managers or use first admin user
        let supervisorId = null;
        const dept = existingDepartments.find(d => d.id === employee.departmentId);
        if (dept && dept.manager_id) {
          supervisorId = dept.manager_id;
        } else {
          // Find any user with manager role
          const managers = existingUsers.filter(u => 
            u.role?.toLowerCase().includes('manager') || 
            u.role?.toLowerCase().includes('supervisor')
          );
          if (managers.length > 0) {
            supervisorId = randomChoice(managers).id;
          }
        }
        
        // Determine status
        let status: 'draft' | 'submitted' | 'approved' | 'rejected';
        const rand = Math.random();
        if (rand < CONFIG.APPROVAL_RATE) {
          status = 'approved';
        } else if (rand < CONFIG.APPROVAL_RATE + CONFIG.REJECTION_RATE) {
          status = 'rejected';
        } else if (rand < 0.9) {
          status = 'submitted';
        } else {
          status = 'draft';
        }
        
        const hoursWorked = randomFloat(35, 50); // Weekly hours
        const overtimeHours = Math.max(0, hoursWorked - 40);
        
        timesheetsToCreate.push({
          userId: employee.id,
          date: weekStart.toISOString().split('T')[0], // Format as YYYY-MM-DD
          jobId: randomChoice(existingJobs).id,
          taskId: null,
          startTime: new Date(weekStart.getTime() + 8 * 60 * 60 * 1000), // 8 AM
          endTime: new Date(weekStart.getTime() + 17 * 60 * 60 * 1000), // 5 PM
          hoursWorked: hoursWorked.toString(),
          breakHours: "1.0", 
          overtimeHours: overtimeHours.toString(),
          status,
          description: `Test timesheet for week ${weekStart.toLocaleDateString()}`,
          notes: Math.random() < 0.2 ? `Test timesheet note ${i}` : null,
          workLocation: randomChoice(['workshop', 'field', 'office']),
          supervisorId: supervisorId,
          approved: status === 'approved',
          approvedBy: status === 'approved' ? supervisorId : null,
          approvedAt: status === 'approved' ? new Date(weekStart.getTime() + 8 * 24 * 60 * 60 * 1000) : null,
          submittedAt: status !== 'draft' ? new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
          createdAt: weekStart,
          updatedAt: new Date()
        });
      }
    }
    
    // Batch insert timesheets
    console.log(`  💾 Inserting ${timesheetsToCreate.length} timesheets...`);
    await db.insert(timesheets).values(timesheetsToCreate);
    console.log(`✅ Created ${timesheetsToCreate.length} timesheets\n`);

    // Step 4: Generate summary statistics
    console.log('📈 Generating summary statistics...');
    
    const [
      totalEvents,
      eventsWithGPS,
      eventsWithPhotos,
      totalTimesheets,
      approvedTimesheets,
      submittedTimesheets,
      rejectedTimesheets
    ] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(timeClocks),
      db.select({ count: sql`count(*)` }).from(timeClocks).where(sql`geolocation IS NOT NULL`),
      db.select({ count: sql`count(*)` }).from(timeClocks).where(sql`photo_url IS NOT NULL`),
      db.select({ count: sql`count(*)` }).from(timesheets),
      db.select({ count: sql`count(*)` }).from(timesheets).where(eq(timesheets.status, 'approved')),
      db.select({ count: sql`count(*)` }).from(timesheets).where(eq(timesheets.status, 'submitted')),
      db.select({ count: sql`count(*)` }).from(timesheets).where(eq(timesheets.status, 'rejected'))
    ]);
    
    console.log('\n🎉 Test Data Generation Complete!');
    console.log('================================\n');
    console.log('📊 Database Statistics:');
    console.log(`  • Total time clock events: ${totalEvents[0].count}`);
    console.log(`  • Events with GPS: ${eventsWithGPS[0].count} (${Math.round((Number(eventsWithGPS[0].count) / Number(totalEvents[0].count)) * 100)}%)`);
    console.log(`  • Events with photos: ${eventsWithPhotos[0].count} (${Math.round((Number(eventsWithPhotos[0].count) / Number(totalEvents[0].count)) * 100)}%)`);
    console.log(`  • Total timesheets: ${totalTimesheets[0].count}`);
    console.log(`  • Approved: ${approvedTimesheets[0].count}`);
    console.log(`  • Pending approval: ${submittedTimesheets[0].count}`);
    console.log(`  • Rejected: ${rejectedTimesheets[0].count}`);
    
    console.log('\n✅ Time & Payroll module is now ready for load testing!');
    console.log('   You can test the Manager Approval Dashboard with realistic data.');
    
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  }
}

// Run the generation
generateTimeTestData()
  .then(() => {
    console.log('\n👍 Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });