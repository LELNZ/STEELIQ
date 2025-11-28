/**
 * Clock Session Builder
 * Transforms individual clock events into complete shift sessions
 * This bridges the gap between event-based storage and session-based logic
 */

import { 
  ClockType, 
  CLOCK_IN, 
  CLOCK_OUT, 
  BREAK_START, 
  BREAK_END,
  MEAL_START,
  MEAL_END
} from "@shared/constants/timeClock";

// Represents a single clock event from the database
export interface ClockEvent {
  id: number;
  userId: number;
  clockType: string;
  timestamp: Date;
  jobId?: number | null;
  taskId?: number | null;
  notes?: string | null;
  location?: string | null;
  geolocation?: any;
  photoUrl?: string | null;
  captureMethod?: string | null;
  geofenceValidated?: boolean;
  createdAt?: Date;
}

// Represents a complete shift session with paired events
export interface ShiftSession {
  id: number; // ID of the clock_in event
  userId: number;
  clockInTime: Date;
  clockOutTime?: Date | null;
  jobId?: number | null;
  taskId?: number | null;
  breaks: BreakPeriod[];
  meals: MealPeriod[];
  totalHoursWorked?: number;
  breakMinutes?: number;
  mealMinutes?: number;
  netHoursWorked?: number; // Total minus breaks/meals
  isComplete: boolean; // Has both clock in and out
  notes?: string | null;
  location?: string | null;
}

export interface BreakPeriod {
  startTime: Date;
  endTime?: Date | null;
  durationMinutes?: number;
  isComplete: boolean;
}

export interface MealPeriod {
  startTime: Date;
  endTime?: Date | null;
  durationMinutes?: number;
  isComplete: boolean;
}

/**
 * Builds complete shift sessions from individual clock events
 * Pairs clock in/out events and associates breaks/meals
 */
export class ClockSessionBuilder {
  /**
   * Convert an array of clock events into shift sessions
   * @param events Array of clock events for a user/date range
   * @returns Array of shift sessions with paired events
   */
  static buildSessions(events: ClockEvent[]): ShiftSession[] {
    if (!events || events.length === 0) {
      return [];
    }

    // Sort events by timestamp
    const sortedEvents = [...events].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    const sessions: ShiftSession[] = [];
    let currentSession: ShiftSession | null = null;
    let openBreak: BreakPeriod | null = null;
    let openMeal: MealPeriod | null = null;

    for (const event of sortedEvents) {
      const clockType = event.clockType as ClockType;

      switch (clockType) {
        case CLOCK_IN:
          // Start a new session
          if (currentSession && !currentSession.isComplete) {
            // Previous session wasn't closed properly
            currentSession.isComplete = false;
            sessions.push(currentSession);
          }
          
          currentSession = {
            id: event.id,
            userId: event.userId,
            clockInTime: event.timestamp,
            clockOutTime: null,
            jobId: event.jobId,
            taskId: event.taskId,
            breaks: [],
            meals: [],
            isComplete: false,
            notes: event.notes,
            location: event.location
          };
          break;

        case CLOCK_OUT:
          if (currentSession) {
            currentSession.clockOutTime = event.timestamp;
            currentSession.isComplete = true;
            
            // Close any open breaks/meals
            if (openBreak) {
              openBreak.endTime = event.timestamp;
              openBreak.isComplete = true;
              openBreak = null;
            }
            if (openMeal) {
              openMeal.endTime = event.timestamp;
              openMeal.isComplete = true;
              openMeal = null;
            }

            // Calculate totals
            currentSession = this.calculateSessionTotals(currentSession);
            sessions.push(currentSession);
            currentSession = null;
          }
          break;

        case BREAK_START:
          if (currentSession) {
            // Close any open break first
            if (openBreak) {
              openBreak.isComplete = false;
              openBreak = null;
            }
            
            openBreak = {
              startTime: event.timestamp,
              endTime: null,
              isComplete: false
            };
            currentSession.breaks.push(openBreak);
          }
          break;

        case BREAK_END:
          if (currentSession && openBreak) {
            openBreak.endTime = event.timestamp;
            openBreak.durationMinutes = this.calculateMinutes(
              openBreak.startTime, 
              openBreak.endTime
            );
            openBreak.isComplete = true;
            openBreak = null;
          }
          break;

        case MEAL_START:
          if (currentSession) {
            // Close any open meal first
            if (openMeal) {
              openMeal.isComplete = false;
              openMeal = null;
            }
            
            openMeal = {
              startTime: event.timestamp,
              endTime: null,
              isComplete: false
            };
            currentSession.meals.push(openMeal);
          }
          break;

        case MEAL_END:
          if (currentSession && openMeal) {
            openMeal.endTime = event.timestamp;
            openMeal.durationMinutes = this.calculateMinutes(
              openMeal.startTime,
              openMeal.endTime
            );
            openMeal.isComplete = true;
            openMeal = null;
          }
          break;
      }
    }

    // Handle any unclosed session
    if (currentSession) {
      currentSession.isComplete = false;
      currentSession = this.calculateSessionTotals(currentSession);
      sessions.push(currentSession);
    }

    return sessions;
  }

  /**
   * Calculate total hours and break/meal minutes for a session
   */
  private static calculateSessionTotals(session: ShiftSession): ShiftSession {
    if (!session.clockInTime) {
      return session;
    }

    // Calculate total hours worked (clock out or current time)
    const endTime = session.clockOutTime || new Date();
    session.totalHoursWorked = this.calculateHours(session.clockInTime, endTime);

    // Calculate total break minutes
    session.breakMinutes = session.breaks.reduce((total, breakPeriod) => {
      if (breakPeriod.durationMinutes) {
        return total + breakPeriod.durationMinutes;
      } else if (breakPeriod.startTime && breakPeriod.endTime) {
        return total + this.calculateMinutes(breakPeriod.startTime, breakPeriod.endTime);
      }
      return total;
    }, 0);

    // Calculate total meal minutes
    session.mealMinutes = session.meals.reduce((total, meal) => {
      if (meal.durationMinutes) {
        return total + meal.durationMinutes;
      } else if (meal.startTime && meal.endTime) {
        return total + this.calculateMinutes(meal.startTime, meal.endTime);
      }
      return total;
    }, 0);

    // Calculate net hours (total minus breaks and meals)
    const totalBreakHours = (session.breakMinutes + session.mealMinutes) / 60;
    session.netHoursWorked = Math.max(0, session.totalHoursWorked - totalBreakHours);

    return session;
  }

  /**
   * Find the most recent incomplete session for a user
   */
  static findOpenSession(events: ClockEvent[]): ShiftSession | null {
    const sessions = this.buildSessions(events);
    return sessions.find(s => !s.isComplete) || null;
  }

  /**
   * Get all sessions for a specific date
   */
  static getSessionsForDate(events: ClockEvent[], date: Date): ShiftSession[] {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dayEvents = events.filter(e => 
      e.timestamp >= startOfDay && e.timestamp <= endOfDay
    );

    return this.buildSessions(dayEvents);
  }

  // Helper methods
  private static calculateHours(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  private static calculateMinutes(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  }
}

// Export a convenience function for simple use cases
export function buildShiftSessions(events: ClockEvent[]): ShiftSession[] {
  return ClockSessionBuilder.buildSessions(events);
}

// Export individual constants for cleaner imports
export { CLOCK_IN, CLOCK_OUT, BREAK_START, BREAK_END, MEAL_START, MEAL_END } from "@shared/constants/timeClock";