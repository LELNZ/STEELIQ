# Fortune 50 GPS Testing Guide

## Manual Testing Checklist

### 1. GPS Auto-Start Test
**Steps:**
1. Open the Time & Payroll page (`/time-payroll`)
2. Watch the GPS status indicator in the Mobile Time Clock section
3. **Expected:** GPS should show "🛰️ GPS Active" within 5-10 seconds
4. **Verify:** No manual GPS button should be visible

**What to Check:**
- ✅ GPS starts automatically without clicking anything
- ✅ Accuracy is displayed (e.g., "±10m")
- ✅ Location updates every 30 seconds (watch the timestamp)

### 2. Browser Permission Test
**Steps:**
1. Open browser settings and block location for the site
2. Refresh the Time & Payroll page
3. **Expected:** GPS shows "📍 GPS Required" with red warning
4. **Verify:** Clock In button is disabled

**Recovery Test:**
1. Re-enable location permissions
2. Refresh the page
3. **Expected:** GPS should acquire location automatically

### 3. Clock-In with GPS Test
**Steps:**
1. Ensure GPS shows "GPS Active" status
2. Select a job from dropdown
3. Click "Clock In" button
4. Take a photo when prompted
5. **Expected:** Clock in successful with GPS coordinates saved

**Database Verification:**
```sql
-- Check location_tracking table for breadcrumbs
SELECT * FROM location_tracking 
WHERE user_id = [your_user_id] 
ORDER BY timestamp DESC 
LIMIT 10;

-- Verify hash chain integrity
SELECT id, previous_hash, current_hash, timestamp 
FROM location_tracking 
WHERE user_id = [your_user_id]
ORDER BY timestamp DESC 
LIMIT 5;
```

### 4. Supervisor Override Test
**Steps:**
1. Block browser location permissions
2. Try to click "Clock In"
3. **Expected:** "Supervisor Override Required" dialog appears
4. Enter override code: `SUPER123` (test code)
5. **Expected:** Clock in allowed despite no GPS

**Audit Verification:**
```sql
-- Check for override usage
SELECT * FROM location_tracking 
WHERE supervisor_override = true 
ORDER BY timestamp DESC;
```

### 5. Velocity Check Test (Simulated)
**Steps:**
1. Clock in at current location
2. Use browser developer tools to spoof location 1000km away
3. Try to clock in again within 1 minute
4. **Expected:** System should log velocity warning in console

**Console Check:**
```
[FRAUD DETECTION] Impossible travel detected for user X: 60000.0 km/h
```

### 6. Geofencing Test
**Create Test Zone:**
```sql
-- Insert a test geofence zone around current location
INSERT INTO geofence_zones (
  zone_name, zone_type, geometry, radius_meters, 
  tolerance_meters, enforcement_level, is_active
) VALUES (
  'Test Office Zone',
  'office',
  '{"center": {"lat": 40.7128, "lng": -74.0060}}',  -- New York coordinates
  500,  -- 500 meter radius
  50,   -- 50 meter tolerance
  'strict',
  true
);
```

**Test Steps:**
1. Clock in from within the zone
2. **Expected:** Geofence status shows "inside"
3. Move/spoof location outside the zone
4. **Expected:** Warning about being outside authorized zone

### 7. Mock Location Detection Test
**For Android Chrome:**
1. Enable Developer Options on Android
2. Use "Fake GPS" app to mock location
3. Try to clock in
4. **Expected:** System detects and flags mock location

**Verification:**
```sql
-- Check for mock location detections
SELECT * FROM location_tracking 
WHERE is_mock_location = true 
ORDER BY timestamp DESC;
```

### 8. Continuous Tracking Test
**Steps:**
1. Leave Time & Payroll page open for 5 minutes
2. Check browser console for breadcrumb saves
3. **Expected:** New breadcrumb every 30 seconds

**Console Output:**
```
[GPS] Breadcrumb saved: {sessionId: "xxx", lat: 40.7128, lng: -74.0060, accuracy: 10}
```

**Database Check:**
```sql
-- Count breadcrumbs in last 5 minutes
SELECT COUNT(*) as breadcrumb_count,
       MIN(timestamp) as first,
       MAX(timestamp) as last
FROM location_tracking 
WHERE user_id = [your_user_id]
  AND timestamp > NOW() - INTERVAL '5 minutes';
  
-- Should show ~10 breadcrumbs (one every 30 seconds)
```

### 9. Hash Chain Integrity Test
**Steps:**
1. Query two consecutive location records
2. Verify the second record's `previous_hash` matches first record's `current_hash`

```sql
-- Get consecutive records
WITH numbered_records AS (
  SELECT *, ROW_NUMBER() OVER (ORDER BY timestamp) as rn
  FROM location_tracking
  WHERE user_id = [your_user_id]
)
SELECT 
  r1.id as record1_id,
  r1.current_hash as record1_hash,
  r2.id as record2_id,
  r2.previous_hash as record2_prev_hash,
  r1.current_hash = r2.previous_hash as hash_chain_valid
FROM numbered_records r1
JOIN numbered_records r2 ON r1.rn = r2.rn - 1
LIMIT 5;
```

### 10. Edge Case Testing

#### Test Equator Coordinates (0° latitude)
```javascript
// In browser console
fetch('/api/location-tracking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 0,
    longitude: -74.0060,
    accuracy: 10,
    timestamp: new Date()
  })
});
```
**Expected:** Request succeeds (previously would fail)

#### Test Prime Meridian (0° longitude)
```javascript
fetch('/api/location-tracking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 51.4779,
    longitude: 0,
    accuracy: 10,
    timestamp: new Date()
  })
});
```
**Expected:** Request succeeds

## Performance Testing

### Breadcrumb Volume Test
1. Leave app running for 1 hour
2. Check database size:
```sql
-- Count breadcrumbs per user
SELECT user_id, COUNT(*) as breadcrumb_count
FROM location_tracking
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY user_id;

-- Expected: ~120 breadcrumbs per active user (2 per minute)
```

### Query Performance
```sql
-- Test index performance
EXPLAIN ANALYZE
SELECT * FROM location_tracking
WHERE user_id = 1
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Should use indexes: idx_location_tracking_user, idx_location_tracking_timestamp
```

## Security Testing

### SQL Injection Test
```javascript
// Attempt SQL injection in coordinates
fetch('/api/location-tracking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: "40.7128'; DROP TABLE users; --",
    longitude: -74.0060
  })
});
```
**Expected:** Request fails with validation error

### XSS Test
```javascript
// Attempt XSS in device info
fetch('/api/location-tracking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 40.7128,
    longitude: -74.0060,
    deviceInfo: {
      userAgent: "<script>alert('XSS')</script>"
    }
  })
});
```
**Expected:** Data is escaped/sanitized, no script execution

## Troubleshooting

### GPS Not Working?
1. Check browser permissions: `chrome://settings/content/location`
2. Ensure HTTPS is enabled (GPS requires secure context)
3. Check browser console for errors
4. Verify location services enabled on device

### Breadcrumbs Not Saving?
1. Check network tab for failed requests
2. Verify authentication is valid
3. Check server logs for errors
4. Ensure database is accessible

### Hash Chain Broken?
1. Check for gaps in timestamp sequence
2. Verify no manual database edits occurred
3. Review audit logs for tampering attempts

## Test Coverage Report

| Feature | Status | Notes |
|---------|---------|-------|
| Auto GPS Start | ✅ | No manual intervention |
| 30-Second Updates | ✅ | Continuous tracking |
| Permission Handling | ✅ | Graceful degradation |
| Clock-In Blocking | ✅ | No GPS = No clock |
| Supervisor Override | ✅ | Audit logged |
| Velocity Detection | ✅ | 200 km/h threshold |
| Geofencing | ✅ | Circular zones |
| Mock Detection | ✅ | Flag fake GPS |
| Hash Chain | ✅ | SHA-256 tamper-proof |
| Edge Coordinates | ✅ | 0° lat/lng fixed |
| Database Persistence | ✅ | All fields saved |
| Security Validation | ✅ | Input sanitization |

## Compliance Verification

### SOX Compliance
- ✅ Immutable audit trail via hash chains
- ✅ Tamper detection through hash verification
- ✅ Complete forensic data capture
- ✅ Supervisor override accountability

### Fortune 50 Standards
- ✅ Automatic GPS without user action
- ✅ Continuous monitoring (30-second intervals)
- ✅ Multi-factor fraud detection
- ✅ Enterprise-grade data retention
- ✅ Cryptographic integrity guarantees