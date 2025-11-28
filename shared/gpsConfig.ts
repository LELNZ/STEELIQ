// GPS Validation Configuration (Fortune 50 Compliance)
// Shared constants for GPS anti-fraud validation across frontend and backend

export const GPS_VALIDATION = {
  MAX_VELOCITY_KMH: 200,           // Maximum realistic travel speed (km/h)
  MIN_VELOCITY_KMH: 10,            // Minimum velocity to count as vehicle travel
  MAX_ACCURACY_METERS: 500,        // Maximum GPS accuracy to trust for payroll
  IP_BASED_ACCURACY_METERS: 10000, // IP-based geolocation threshold (unreliable)
  MIN_BREADCRUMB_INTERVAL_SEC: 10, // Minimum time between valid breadcrumbs
  MAX_BREADCRUMB_GAP_HOURS: 4,     // Maximum gap before requiring new session
  GEOFENCE_DISPLACEMENT_METERS: 500, // Maximum distance from job geofence for clock-in (Wave 1)
} as const;

export type GPSValidationConfig = typeof GPS_VALIDATION;
