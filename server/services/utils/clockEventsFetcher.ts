/**
 * Shared utility for fetching and normalizing clock events from the database
 * This ensures consistent event fetching across all services
 */

import { db } from "../../db";
import { timeClocks } from "@shared/schema";
import { and, eq, gte, lte, asc } from "drizzle-orm";
import { ClockEvent } from "./clockSessionBuilder";
import { normalizeClockType } from "@shared/constants/timeClock";

/**
 * Fetch clock events for a user within a date range
 * Returns normalized events ready for ClockSessionBuilder
 */
export async function fetchClockEvents(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<ClockEvent[]> {
  // Query raw event rows from the database
  const rawEvents = await db
    .select({
      id: timeClocks.id,
      userId: timeClocks.userId,
      clockType: timeClocks.clockType,
      timestamp: timeClocks.timestamp,
      jobId: timeClocks.jobId,
      taskId: timeClocks.taskId,
      notes: timeClocks.notes,
      location: timeClocks.location,
      geolocation: timeClocks.geolocation,
      photoUrl: timeClocks.photoUrl,
      captureMethod: timeClocks.captureMethod,
      geofenceValidated: timeClocks.geofenceValidated,
      createdAt: timeClocks.createdAt
    })
    .from(timeClocks)
    .where(
      and(
        eq(timeClocks.userId, userId),
        gte(timeClocks.timestamp, startDate),
        lte(timeClocks.timestamp, endDate)
      )
    )
    .orderBy(asc(timeClocks.timestamp));

  // Normalize clock types and map to ClockEvent interface
  const normalizedEvents: ClockEvent[] = rawEvents.map(event => {
    // Normalize the clock type (handles legacy hyphenated values)
    const normalizedType = normalizeClockType(event.clockType);
    
    if (!normalizedType) {
      console.warn(`Unknown clock type: ${event.clockType} for event ${event.id}`);
      // Return with original type, ClockSessionBuilder will skip unknown types
      return {
        id: event.id,
        userId: event.userId,
        clockType: event.clockType,
        timestamp: event.timestamp,
        jobId: event.jobId,
        taskId: event.taskId,
        notes: event.notes,
        location: event.location,
        geolocation: event.geolocation,
        photoUrl: event.photoUrl,
        captureMethod: event.captureMethod,
        geofenceValidated: event.geofenceValidated,
        createdAt: event.createdAt
      };
    }

    return {
      id: event.id,
      userId: event.userId,
      clockType: normalizedType,
      timestamp: event.timestamp,
      jobId: event.jobId,
      taskId: event.taskId,
      notes: event.notes,
      location: event.location,
      geolocation: event.geolocation,
      photoUrl: event.photoUrl,
      captureMethod: event.captureMethod,
      geofenceValidated: event.geofenceValidated,
      createdAt: event.createdAt
    };
  });

  return normalizedEvents;
}

/**
 * Fetch clock events for a specific day
 */
export async function fetchDayClockEvents(
  userId: number,
  date: Date
): Promise<ClockEvent[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return fetchClockEvents(userId, startOfDay, endOfDay);
}

/**
 * Fetch the most recent clock event for a user
 */
export async function fetchLatestClockEvent(
  userId: number
): Promise<ClockEvent | null> {
  const [latest] = await db
    .select({
      id: timeClocks.id,
      userId: timeClocks.userId,
      clockType: timeClocks.clockType,
      timestamp: timeClocks.timestamp,
      jobId: timeClocks.jobId,
      taskId: timeClocks.taskId,
      notes: timeClocks.notes,
      location: timeClocks.location,
      geolocation: timeClocks.geolocation,
      photoUrl: timeClocks.photoUrl,
      captureMethod: timeClocks.captureMethod,
      geofenceValidated: timeClocks.geofenceValidated,
      createdAt: timeClocks.createdAt
    })
    .from(timeClocks)
    .where(eq(timeClocks.userId, userId))
    .orderBy(timeClocks.timestamp)
    .limit(1);

  if (!latest) return null;

  const normalizedType = normalizeClockType(latest.clockType);
  
  return {
    id: latest.id,
    userId: latest.userId,
    clockType: normalizedType || latest.clockType,
    timestamp: latest.timestamp,
    jobId: latest.jobId,
    taskId: latest.taskId,
    notes: latest.notes,
    location: latest.location,
    geolocation: latest.geolocation,
    photoUrl: latest.photoUrl,
    captureMethod: latest.captureMethod,
    geofenceValidated: latest.geofenceValidated,
    createdAt: latest.createdAt
  };
}