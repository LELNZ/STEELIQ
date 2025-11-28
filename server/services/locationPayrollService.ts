// Fortune 50 Location-Based Payroll Service
// Integrates GPS tracking data with payroll calculations for location-based pay rates and travel compensation

import { db } from '../db';
import { locationTracking, timeClocks, timesheets, teamMembers, laborRates, geofenceZones } from '@shared/schema';
import { eq, and, between, gte, lte, sql, desc } from 'drizzle-orm';
import { GPS_VALIDATION } from '@shared/gpsConfig';

// Re-export for backward compatibility
export { GPS_VALIDATION };

export interface LocationPayrollAdjustment {
  userId: number;
  timesheetId: number;
  adjustmentType: 'travel_compensation' | 'hazard_pay' | 'remote_location' | 'geofence_bonus';
  adjustmentAmount: number;
  adjustmentPercentage?: number;
  reason: string;
  locationTrackingIds: number[];
}

export interface GPSValidationResult {
  isValid: boolean;
  flaggedRecords: number[];
  reason?: string;
}

export interface TravelCompensation {
  userId: number;
  date: Date;
  totalMiles: number;
  mileageRate: number;
  totalCompensation: number;
  locations: Array<{
    lat: number;
    lng: number;
    timestamp: Date;
  }>;
}

export class LocationPayrollService {
  // Calculate Haversine distance between two GPS coordinates (in kilometers)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Validate GPS record for payroll use (Fortune 50 anti-fraud)
  private isValidGPSRecord(record: any): boolean {
    // Reject mock locations
    if (record.isMock === true) {
      console.log(`[GPS VALIDATION] Rejected mock location: record ${record.id}`);
      return false;
    }

    // Reject IP-based geolocation (accuracy > 10km)
    const accuracy = parseFloat(record.accuracy) || 0;
    if (accuracy > GPS_VALIDATION.IP_BASED_ACCURACY_METERS) {
      console.log(`[GPS VALIDATION] Rejected IP-based location: record ${record.id}, accuracy ${accuracy}m`);
      return false;
    }

    // Reject poor accuracy readings for payroll calculations
    if (accuracy > GPS_VALIDATION.MAX_ACCURACY_METERS) {
      console.log(`[GPS VALIDATION] Rejected poor accuracy: record ${record.id}, accuracy ${accuracy}m`);
      return false;
    }

    // Validate coordinate ranges
    const lat = parseFloat(record.latitude);
    const lng = parseFloat(record.longitude);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.log(`[GPS VALIDATION] Rejected invalid coordinates: record ${record.id}`);
      return false;
    }

    return true;
  }

  // Detect impossible velocity between two GPS records (anti-spoofing)
  private detectImpossibleVelocity(
    prev: any, 
    curr: any
  ): { isImpossible: boolean; velocityKmh: number } {
    const timeDiffSec = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
    
    // Skip if time difference is too small (avoid division by zero)
    if (timeDiffSec < GPS_VALIDATION.MIN_BREADCRUMB_INTERVAL_SEC) {
      return { isImpossible: false, velocityKmh: 0 };
    }

    const distance = this.calculateDistance(
      parseFloat(prev.latitude),
      parseFloat(prev.longitude),
      parseFloat(curr.latitude),
      parseFloat(curr.longitude)
    );

    const velocityKmh = (distance / timeDiffSec) * 3600;

    // Flag impossible velocity (>200 km/h = teleportation/spoofing)
    if (velocityKmh > GPS_VALIDATION.MAX_VELOCITY_KMH) {
      console.log(`[GPS FRAUD DETECTION] Impossible velocity detected: ${velocityKmh.toFixed(1)} km/h between records ${prev.id} and ${curr.id}`);
      return { isImpossible: true, velocityKmh };
    }

    return { isImpossible: false, velocityKmh };
  }

  // Validate GPS records for a user session (returns filtered valid records with full audit trail)
  async validateGPSSession(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{ 
    validRecords: any[]; 
    flaggedRecords: number[]; 
    auditLog: string[];
    sessions: Array<{ startIdx: number; endIdx: number; records: any[] }>;
  }> {
    const auditLog: string[] = [];
    const flaggedRecords: number[] = [];
    const sessions: Array<{ startIdx: number; endIdx: number; records: any[] }> = [];

    try {
      const allRecords = await db
        .select()
        .from(locationTracking)
        .where(and(
          eq(locationTracking.userId, userId),
          between(locationTracking.timestamp, startDate, endDate)
        ))
        .orderBy(locationTracking.timestamp);

      auditLog.push(`[GPS VALIDATION] Processing ${allRecords.length} records for user ${userId}`);
      auditLog.push(`[GPS VALIDATION] Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Filter out invalid records (mock, IP-based, poor accuracy, invalid coordinates)
      const preliminaryValid = allRecords.filter(record => {
        if (!this.isValidGPSRecord(record)) {
          flaggedRecords.push(record.id);
          return false;
        }
        return true;
      });

      auditLog.push(`[GPS VALIDATION] ${preliminaryValid.length} records passed initial validation (${allRecords.length - preliminaryValid.length} rejected)`);

      // Apply session gap detection and velocity checks
      // CRITICAL: Track the last ACCEPTED record for gap/velocity checks, not just the previous in array
      const validRecords: any[] = [];
      let currentSession: any[] = [];
      let sessionStartIdx = 0;
      let lastAcceptedRecord: any = null;

      for (let i = 0; i < preliminaryValid.length; i++) {
        const curr = preliminaryValid[i];
        
        // First record is always accepted (becomes baseline for chain)
        if (lastAcceptedRecord === null) {
          lastAcceptedRecord = curr;
          currentSession.push(curr);
          validRecords.push(curr);
          continue;
        }

        // Use LAST ACCEPTED record for gap/velocity checks (not just i-1)
        const timeDiffSec = (curr.timestamp.getTime() - lastAcceptedRecord.timestamp.getTime()) / 1000;

        // Check for session gap (>4 hours from last accepted)
        if (timeDiffSec > GPS_VALIDATION.MAX_BREADCRUMB_GAP_HOURS * 3600) {
          auditLog.push(`[GPS SESSION] Gap detected: ${(timeDiffSec / 3600).toFixed(1)} hours between records ${lastAcceptedRecord.id} and ${curr.id}`);
          
          // Save current session if it has valid records
          if (currentSession.length > 0) {
            sessions.push({ 
              startIdx: sessionStartIdx, 
              endIdx: validRecords.length - 1, 
              records: [...currentSession] 
            });
          }
          
          // Start new session - curr becomes baseline for new session
          currentSession = [curr];
          sessionStartIdx = validRecords.length;
          validRecords.push(curr);
          lastAcceptedRecord = curr;
          continue;
        }

        // Skip duplicate/too-frequent breadcrumbs (< 10 seconds from last accepted)
        if (timeDiffSec < GPS_VALIDATION.MIN_BREADCRUMB_INTERVAL_SEC) {
          auditLog.push(`[GPS VALIDATION] Skipped duplicate breadcrumb ${curr.id}: only ${timeDiffSec.toFixed(1)}s since last accepted record ${lastAcceptedRecord.id}`);
          flaggedRecords.push(curr.id);
          // DO NOT update lastAcceptedRecord - this record is rejected
          continue;
        }

        // Check for impossible velocity (anti-spoofing) against last accepted
        const velocityCheck = this.detectImpossibleVelocity(lastAcceptedRecord, curr);
        if (velocityCheck.isImpossible) {
          flaggedRecords.push(curr.id);
          auditLog.push(`[GPS FRAUD] Flagged record ${curr.id}: impossible velocity ${velocityCheck.velocityKmh.toFixed(1)} km/h from record ${lastAcceptedRecord.id} (limit: ${GPS_VALIDATION.MAX_VELOCITY_KMH} km/h)`);
          // DO NOT update lastAcceptedRecord - this record is rejected
          continue;
        }

        // Record passed all checks - add to valid chain
        currentSession.push(curr);
        validRecords.push(curr);
        lastAcceptedRecord = curr; // Only update after successful acceptance
      }

      // Save final session
      if (currentSession.length > 0) {
        sessions.push({ 
          startIdx: sessionStartIdx, 
          endIdx: preliminaryValid.length - 1, 
          records: [...currentSession] 
        });
      }

      auditLog.push(`[GPS VALIDATION] Final: ${validRecords.length} valid records, ${flaggedRecords.length} flagged, ${sessions.length} sessions detected`);
      auditLog.push(`[GPS AUDIT] Numerator: ${validRecords.length} valid / Denominator: ${allRecords.length} total = ${((validRecords.length / allRecords.length) * 100).toFixed(1)}% acceptance rate`);

      return { validRecords, flaggedRecords, auditLog, sessions };
    } catch (error) {
      auditLog.push(`[GPS VALIDATION ERROR] ${error.message}`);
      console.error('[GPS VALIDATION] Error:', error);
      return { validRecords: [], flaggedRecords: [], auditLog, sessions: [] };
    }
  }

  // Get location-based pay adjustments for a timesheet
  async getLocationPayrollAdjustments(timesheetId: number): Promise<LocationPayrollAdjustment[]> {
    const adjustments: LocationPayrollAdjustment[] = [];
    
    try {
      // Get timesheet details
      const [timesheet] = await db
        .select()
        .from(timesheets)
        .where(eq(timesheets.id, timesheetId))
        .limit(1);
        
      if (!timesheet) {
        console.error(`Timesheet ${timesheetId} not found`);
        return adjustments;
      }
      
      // Get all time clocks for this timesheet period
      const clocks = await db
        .select()
        .from(timeClocks)
        .where(and(
          eq(timeClocks.userId, timesheet.userId),
          between(timeClocks.timestamp, timesheet.periodStartDate, timesheet.periodEndDate)
        ))
        .orderBy(timeClocks.timestamp);
      
      // Check for hazard zone work (geofence-based)
      const hazardZoneAdjustment = await this.calculateHazardPayAdjustment(
        timesheet.userId,
        clocks
      );
      if (hazardZoneAdjustment) {
        adjustments.push(hazardZoneAdjustment);
      }
      
      // Calculate travel compensation between job sites
      const travelAdjustment = await this.calculateTravelCompensation(
        timesheet.userId,
        timesheet.periodStartDate,
        timesheet.periodEndDate
      );
      if (travelAdjustment && travelAdjustment.totalCompensation > 0) {
        adjustments.push({
          userId: timesheet.userId,
          timesheetId: timesheetId,
          adjustmentType: 'travel_compensation',
          adjustmentAmount: travelAdjustment.totalCompensation,
          reason: `Travel compensation: ${travelAdjustment.totalMiles.toFixed(1)} miles @ $${travelAdjustment.mileageRate}/mile`,
          locationTrackingIds: []
        });
      }
      
      // Check for remote location work
      const remoteAdjustment = await this.calculateRemoteLocationAdjustment(
        timesheet.userId,
        clocks
      );
      if (remoteAdjustment) {
        adjustments.push(remoteAdjustment);
      }
      
      return adjustments;
    } catch (error) {
      console.error('[LOCATION PAYROLL] Error calculating adjustments:', error);
      return adjustments;
    }
  }
  
  // Calculate hazard pay based on geofence zones
  private async calculateHazardPayAdjustment(
    userId: number,
    clocks: any[]
  ): Promise<LocationPayrollAdjustment | null> {
    try {
      // Get hazard zones from geofence configuration
      const hazardZones = await db
        .select()
        .from(geofenceZones)
        .where(and(
          eq(geofenceZones.isActive, true),
          eq(geofenceZones.zoneType, 'hazard')
        ));
      
      if (hazardZones.length === 0) return null;
      
      let hazardHours = 0;
      const trackingIds: number[] = [];
      
      // Check clock-in/out pairs for hazard zone work
      for (let i = 0; i < clocks.length; i++) {
        const clock = clocks[i];
        if (clock.clockType === 'clock_in' && clock.locationTrackingId) {
          // Find corresponding clock out
          const clockOut = clocks.find((c, idx) => 
            idx > i && c.clockType === 'clock_out'
          );
          
          if (clockOut) {
            // Check if this work period was in a hazard zone
            for (const zone of hazardZones) {
              if (clock.geofenceId === zone.id) {
                const hours = (clockOut.timestamp.getTime() - clock.timestamp.getTime()) / (1000 * 60 * 60);
                hazardHours += hours;
                trackingIds.push(clock.locationTrackingId);
                break;
              }
            }
          }
        }
      }
      
      if (hazardHours > 0) {
        // Get user's base rate for hazard pay calculation
        const [teamMember] = await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.userId, userId))
          .limit(1);
        
        const baseRate = teamMember?.hourlyRate || 25; // Default $25/hour
        const hazardMultiplier = 1.5; // 50% hazard pay premium
        const adjustmentAmount = hazardHours * baseRate * (hazardMultiplier - 1);
        
        return {
          userId,
          timesheetId: 0, // Will be set by caller
          adjustmentType: 'hazard_pay',
          adjustmentAmount,
          adjustmentPercentage: 50,
          reason: `Hazard zone work: ${hazardHours.toFixed(2)} hours @ 50% premium`,
          locationTrackingIds: trackingIds
        };
      }
      
      return null;
    } catch (error) {
      console.error('[HAZARD PAY] Calculation error:', error);
      return null;
    }
  }
  
  // Calculate travel compensation based on GPS tracking (with anti-fraud validation)
  async calculateTravelCompensation(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<TravelCompensation | null> {
    try {
      // Use validated GPS session to filter out fraudulent/low-quality records
      const { validRecords, flaggedRecords, auditLog, sessions } = await this.validateGPSSession(userId, startDate, endDate);
      
      // Log validation results for audit trail
      auditLog.forEach(log => console.log(log));
      
      if (validRecords.length < 2) {
        console.log(`[TRAVEL COMPENSATION] Insufficient valid GPS records for user ${userId}: ${validRecords.length} valid, ${flaggedRecords.length} flagged`);
        return null;
      }
      
      let totalDistance = 0;
      let segmentsIncluded = 0;
      let segmentsExcluded = 0;
      const locations: TravelCompensation['locations'] = [];
      
      // Calculate total travel distance using only validated records within sessions
      // Re-verify velocity for each segment to catch any edge cases
      for (const session of sessions) {
        for (let i = 1; i < session.records.length; i++) {
          const prev = session.records[i - 1];
          const curr = session.records[i];
          
          const timeDiffSec = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
          
          // Skip very short intervals (already validated but double-check)
          if (timeDiffSec < GPS_VALIDATION.MIN_BREADCRUMB_INTERVAL_SEC) {
            segmentsExcluded++;
            continue;
          }
          
          const distance = this.calculateDistance(
            parseFloat(prev.latitude),
            parseFloat(prev.longitude),
            parseFloat(curr.latitude),
            parseFloat(curr.longitude)
          );
          const velocityKmh = (distance / timeDiffSec) * 3600;
          
          // Re-verify velocity is within acceptable range for mileage calculation
          // Must be: >10 km/h (vehicle travel) AND <MAX_VELOCITY (not spoofed)
          if (velocityKmh > GPS_VALIDATION.MIN_VELOCITY_KMH && velocityKmh < GPS_VALIDATION.MAX_VELOCITY_KMH) {
            totalDistance += distance;
            segmentsIncluded++;
            locations.push({
              lat: parseFloat(curr.latitude),
              lng: parseFloat(curr.longitude),
              timestamp: curr.timestamp
            });
          } else if (velocityKmh >= GPS_VALIDATION.MAX_VELOCITY_KMH) {
            // Log high velocity segments that slipped through
            console.log(`[TRAVEL COMPENSATION AUDIT] Excluded segment: ${velocityKmh.toFixed(1)} km/h exceeds max ${GPS_VALIDATION.MAX_VELOCITY_KMH} km/h`);
            segmentsExcluded++;
          } else {
            // Too slow (walking/stationary)
            segmentsExcluded++;
          }
        }
      }
      
      // Convert to miles and calculate compensation
      const totalMiles = totalDistance * 0.621371;
      const mileageRate = 0.67; // 2024 IRS standard mileage rate
      const totalCompensation = totalMiles * mileageRate;
      
      // Log audit trail with numerator/denominator for traceability
      console.log(`[TRAVEL COMPENSATION AUDIT] User ${userId}:`, {
        totalMiles: totalMiles.toFixed(2),
        totalCompensation: totalCompensation.toFixed(2),
        mileageRate,
        segmentsIncluded,
        segmentsExcluded,
        sessionsProcessed: sessions.length,
        recordsValidated: validRecords.length,
        recordsFlagged: flaggedRecords.length,
        acceptanceRate: `${((segmentsIncluded / (segmentsIncluded + segmentsExcluded)) * 100).toFixed(1)}%`
      });
      
      return {
        userId,
        date: startDate,
        totalMiles,
        mileageRate,
        totalCompensation,
        locations
      };
    } catch (error) {
      console.error('[TRAVEL COMPENSATION] Calculation error:', error);
      return null;
    }
  }
  
  // Calculate remote location adjustment
  private async calculateRemoteLocationAdjustment(
    userId: number,
    clocks: any[]
  ): Promise<LocationPayrollAdjustment | null> {
    try {
      // Get company headquarters location (could be from config)
      const hqLat = 40.7128; // Example: NYC
      const hqLng = -74.0060;
      const remoteThresholdKm = 100; // 100km from HQ is considered remote
      
      let remoteHours = 0;
      const trackingIds: number[] = [];
      
      for (let i = 0; i < clocks.length; i++) {
        const clock = clocks[i];
        if (clock.clockType === 'clock_in' && clock.geolocation) {
          const distance = this.calculateDistance(
            hqLat,
            hqLng,
            clock.geolocation.lat,
            clock.geolocation.lng
          );
          
          if (distance > remoteThresholdKm) {
            // Find corresponding clock out
            const clockOut = clocks.find((c, idx) => 
              idx > i && c.clockType === 'clock_out'
            );
            
            if (clockOut) {
              const hours = (clockOut.timestamp.getTime() - clock.timestamp.getTime()) / (1000 * 60 * 60);
              remoteHours += hours;
              if (clock.locationTrackingId) {
                trackingIds.push(clock.locationTrackingId);
              }
            }
          }
        }
      }
      
      if (remoteHours > 0) {
        const remoteRate = 5; // $5/hour remote work premium
        const adjustmentAmount = remoteHours * remoteRate;
        
        return {
          userId,
          timesheetId: 0, // Will be set by caller
          adjustmentType: 'remote_location',
          adjustmentAmount,
          reason: `Remote location work: ${remoteHours.toFixed(2)} hours @ $${remoteRate}/hour premium`,
          locationTrackingIds: trackingIds
        };
      }
      
      return null;
    } catch (error) {
      console.error('[REMOTE LOCATION] Calculation error:', error);
      return null;
    }
  }
  
  // Apply location-based adjustments to payroll
  async applyLocationAdjustmentsToPayroll(periodId: number): Promise<void> {
    try {
      // Get all timesheets for the period
      const periodTimesheets = await db
        .select()
        .from(timesheets)
        .where(eq(timesheets.payrollPeriodId, periodId));
      
      console.log(`[LOCATION PAYROLL] Processing ${periodTimesheets.length} timesheets for period ${periodId}`);
      
      for (const timesheet of periodTimesheets) {
        // Get location-based adjustments
        const adjustments = await this.getLocationPayrollAdjustments(timesheet.id);
        
        if (adjustments.length > 0) {
          // Calculate total adjustment amount
          const totalAdjustment = adjustments.reduce((sum, adj) => sum + adj.adjustmentAmount, 0);
          
          // Update timesheet with location-based adjustments
          await db
            .update(timesheets)
            .set({
              totalCost: sql`${timesheets.totalCost} + ${totalAdjustment}`,
              metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ 
                locationAdjustments: adjustments 
              })}::jsonb`,
              updatedAt: new Date()
            })
            .where(eq(timesheets.id, timesheet.id));
          
          console.log(`[LOCATION PAYROLL] Applied ${adjustments.length} adjustments totaling $${totalAdjustment.toFixed(2)} to timesheet ${timesheet.id}`);
        }
      }
    } catch (error) {
      console.error('[LOCATION PAYROLL] Error applying adjustments:', error);
      throw error;
    }
  }
}

const locationPayrollService = new LocationPayrollService();

export { LocationPayrollService, locationPayrollService };