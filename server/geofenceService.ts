import { db } from './db';
import { geofenceZones, timeEntries, auditLog } from '@shared/schema';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
import type { GeofenceZone, TimeEntry } from '@shared/schema';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a location is within a geofence zone
 */
export function isLocationWithinZone(
  location: { lat: number; lng: number },
  zone: { centerLatitude: number; centerLongitude: number; radiusMeters: number }
): boolean {
  const distance = calculateDistance(
    location.lat,
    location.lng,
    zone.centerLatitude,
    zone.centerLongitude
  );
  return distance <= zone.radiusMeters;
}

/**
 * Get active geofence zones for a business unit or job
 */
export async function getActiveGeofences(
  businessUnitId: number,
  jobId?: number
): Promise<GeofenceZone[]> {
  try {
    // Build the where condition - zones must be:
    // 1. Active
    // 2. For the specified business unit
    // 3. Either for the specific job OR general business unit zones (null jobId)
    const conditions = [
      eq(geofenceZones.isActive, true),
      eq(geofenceZones.businessUnitId, businessUnitId)
    ];
    
    // If a job is specified, get zones for that job OR general business unit zones
    if (jobId) {
      conditions.push(
        or(
          eq(geofenceZones.jobId, jobId),
          isNull(geofenceZones.jobId)
        )
      );
    } else {
      // If no job specified, only get general business unit zones
      conditions.push(isNull(geofenceZones.jobId));
    }

    const zones = await db
      .select()
      .from(geofenceZones)
      .where(and(...conditions));

    return zones;
  } catch (error) {
    console.error('Error fetching geofence zones:', error);
    throw new Error('Failed to fetch geofence zones');
  }
}

/**
 * Validate if a location is within any applicable geofence
 */
export async function validateGeofence(
  location: { lat: number; lng: number } | null,
  businessUnitId: number,
  jobId?: number,
  userId?: number
): Promise<{
  isValid: boolean;
  violatedZone?: GeofenceZone;
  message?: string;
  distance?: number; // Distance from nearest zone boundary in meters (for 500m displacement check)
}> {
  try {
    // If no location provided, consider it invalid if geofencing is required
    // Note: lat/lng can be 0 (equator/prime meridian), so check for null/undefined specifically
    if (!location || location.lat === null || location.lat === undefined || 
        location.lng === null || location.lng === undefined) {
      return {
        isValid: false,
        message: 'No location data provided'
      };
    }

    // Get all applicable geofence zones
    const zones = await getActiveGeofences(businessUnitId, jobId);
    
    // If no zones defined, location is valid by default
    if (zones.length === 0) {
      return { isValid: true };
    }

    // Check if location is within any zone and track closest zone
    let closestZone: GeofenceZone | null = null;
    let minDistanceFromBoundary = Infinity;
    let hasValidZoneGeometry = false;

    for (const zone of zones) {
      if (zone.centerLatitude && zone.centerLongitude && zone.radiusMeters) {
        hasValidZoneGeometry = true;
        const distanceFromCenter = calculateDistance(
          location.lat,
          location.lng,
          parseFloat(zone.centerLatitude),
          parseFloat(zone.centerLongitude)
        );
        
        // Distance from boundary (negative = inside, positive = outside)
        const distanceFromBoundary = distanceFromCenter - zone.radiusMeters;
        
        if (distanceFromBoundary < minDistanceFromBoundary) {
          minDistanceFromBoundary = distanceFromBoundary;
          closestZone = zone;
        }

        const isWithin = distanceFromCenter <= zone.radiusMeters;
        if (isWithin) {
          return { isValid: true, distance: 0 }; // Within zone = 0 displacement
        }
      }
    }

    // If no zones had valid geometry, return error with large displacement to trigger blocking
    if (!hasValidZoneGeometry) {
      console.error('[GEOFENCE] All zones have invalid geometry - blocking by default');
      return {
        isValid: false,
        violatedZone: zones[0],
        message: 'Geofence zones configured but missing valid geometry',
        distance: 9999 // Large value to trigger 500m enforcement
      };
    }

    // If we reach here, location is outside all zones
    const violatedZone = closestZone || zones[0];
    // Ensure distance is never Infinity (which would serialize as null in JSON)
    const displacementMeters = Math.min(Math.max(0, minDistanceFromBoundary), 99999); // Cap at 99999m
    
    // Log the violation
    if (userId) {
      await logGeofenceViolation(userId, location, violatedZone);
    }

    return {
      isValid: false,
      violatedZone,
      message: `Location is ${Math.round(displacementMeters)}m outside authorized zone: ${violatedZone.name}`,
      distance: displacementMeters
    };
  } catch (error) {
    console.error('Geofence validation error:', error);
    // In case of error, we allow the clock-in but log it
    return {
      isValid: true,
      message: 'Geofence validation error - allowing clock-in'
    };
  }
}

/**
 * Log a geofence violation for audit purposes
 */
export async function logGeofenceViolation(
  userId: number,
  location: { lat: number; lng: number },
  zone: GeofenceZone
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      tableName: 'geofence_violations',
      recordId: zone.id.toString(),
      action: 'GEOFENCE_VIOLATION',
      userId,
      changes: {
        zone_id: zone.id,
        zone_name: zone.name,
        user_location: location,
        zone_center: {
          lat: zone.centerLatitude,
          lng: zone.centerLongitude
        },
        zone_radius: zone.radiusMeters,
        distance_from_center: calculateDistance(
          location.lat,
          location.lng,
          parseFloat(zone.centerLatitude || '0'),
          parseFloat(zone.centerLongitude || '0')
        )
      }
    });
  } catch (error) {
    console.error('Error logging geofence violation:', error);
    // Don't throw - we don't want audit logging failures to break the main flow
  }
}

/**
 * Create a new geofence zone
 */
export async function createGeofenceZone(data: {
  name: string;
  businessUnitId: number;
  jobId?: number;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  alertOnEntry?: boolean;
  alertOnExit?: boolean;
  description?: string;
  createdBy: number;
}): Promise<GeofenceZone> {
  try {
    const [zone] = await db
      .insert(geofenceZones)
      .values({
        ...data,
        centerLatitude: data.centerLatitude.toString(),
        centerLongitude: data.centerLongitude.toString(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: data.createdBy
      })
      .returning();

    // Log the creation
    await db.insert(auditLog).values({
      tableName: 'geofence_zones',
      recordId: zone.id.toString(),
      action: 'CREATE',
      userId: data.createdBy,
      changes: data
    });

    return zone;
  } catch (error) {
    console.error('Error creating geofence zone:', error);
    throw new Error('Failed to create geofence zone');
  }
}

/**
 * Update a geofence zone
 */
export async function updateGeofenceZone(
  id: number,
  data: Partial<{
    name: string;
    centerLatitude: number;
    centerLongitude: number;
    radiusMeters: number;
    alertOnEntry: boolean;
    alertOnExit: boolean;
    description: string;
    isActive: boolean;
  }>,
  userId: number
): Promise<GeofenceZone> {
  try {
    // Convert numbers to strings for decimal fields
    const updateData: any = { ...data };
    if (data.centerLatitude !== undefined) {
      updateData.centerLatitude = data.centerLatitude.toString();
    }
    if (data.centerLongitude !== undefined) {
      updateData.centerLongitude = data.centerLongitude.toString();
    }

    const [zone] = await db
      .update(geofenceZones)
      .set({
        ...updateData,
        updatedAt: new Date(),
        updatedBy: userId
      })
      .where(eq(geofenceZones.id, id))
      .returning();

    // Log the update
    await db.insert(auditLog).values({
      tableName: 'geofence_zones',
      recordId: id.toString(),
      action: 'UPDATE',
      userId,
      changes: data
    });

    return zone;
  } catch (error) {
    console.error('Error updating geofence zone:', error);
    throw new Error('Failed to update geofence zone');
  }
}

/**
 * Delete (soft delete by deactivating) a geofence zone
 */
export async function deleteGeofenceZone(id: number, userId: number): Promise<void> {
  try {
    await db
      .update(geofenceZones)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: userId
      })
      .where(eq(geofenceZones.id, id));

    // Log the deletion
    await db.insert(auditLog).values({
      tableName: 'geofence_zones',
      recordId: id.toString(),
      action: 'DELETE',
      userId,
      changes: { isActive: false }
    });
  } catch (error) {
    console.error('Error deleting geofence zone:', error);
    throw new Error('Failed to delete geofence zone');
  }
}

/**
 * Check for geofence entry/exit events
 */
export async function checkGeofenceTransition(
  previousLocation: { lat: number; lng: number } | null,
  currentLocation: { lat: number; lng: number },
  businessUnitId: number,
  jobId?: number
): Promise<{
  entered: GeofenceZone[];
  exited: GeofenceZone[];
}> {
  const zones = await getActiveGeofences(businessUnitId, jobId);
  const entered: GeofenceZone[] = [];
  const exited: GeofenceZone[] = [];

  for (const zone of zones) {
    if (!zone.centerLatitude || !zone.centerLongitude || !zone.radiusMeters) {
      continue;
    }

    const zoneData = {
      centerLatitude: parseFloat(zone.centerLatitude),
      centerLongitude: parseFloat(zone.centerLongitude),
      radiusMeters: zone.radiusMeters
    };

    const isCurrentlyInside = isLocationWithinZone(currentLocation, zoneData);
    const wasPreviouslyInside = previousLocation
      ? isLocationWithinZone(previousLocation, zoneData)
      : false;

    // Check for entry
    if (isCurrentlyInside && !wasPreviouslyInside && zone.alertOnEntry) {
      entered.push(zone);
    }

    // Check for exit
    if (!isCurrentlyInside && wasPreviouslyInside && zone.alertOnExit) {
      exited.push(zone);
    }
  }

  return { entered, exited };
}