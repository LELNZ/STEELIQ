-- Migration: Add GPS tracking linkage to time clocks for Fortune 50 compliance
-- Date: 2025-11-20
-- Purpose: Links GPS breadcrumbs to time clock events for audit trail and location-based payroll

-- Add locationTrackingId column to time_clocks table
ALTER TABLE time_clocks 
ADD COLUMN IF NOT EXISTS location_tracking_id INTEGER REFERENCES location_tracking(id);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_time_clocks_location_tracking 
ON time_clocks(location_tracking_id);

-- Create composite index for payroll period queries with GPS data
CREATE INDEX IF NOT EXISTS idx_time_clocks_user_timestamp_location 
ON time_clocks(user_id, timestamp, location_tracking_id);

-- Add indexes for efficient GPS data archival and queries
-- These support queries for payroll periods (monthly ranges)
CREATE INDEX IF NOT EXISTS idx_location_tracking_user_month 
ON location_tracking(user_id, DATE_TRUNC('month', timestamp));

-- Index for velocity fraud detection queries
CREATE INDEX IF NOT EXISTS idx_location_tracking_fraud 
ON location_tracking(user_id, impossible_travel, timestamp) 
WHERE impossible_travel = true;

-- Index for geofence violation queries
CREATE INDEX IF NOT EXISTS idx_location_tracking_geofence_violations 
ON location_tracking(user_id, geofence_status, timestamp) 
WHERE geofence_status != 'inside';

-- Comment on column for documentation
COMMENT ON COLUMN time_clocks.location_tracking_id IS 
'Foreign key to location_tracking table - links GPS breadcrumb to clock event for Fortune 50 compliance';

-- Update existing time_clocks to link with recent GPS data (optional backfill)
-- This is commented out by default - run manually if needed
/*
UPDATE time_clocks tc
SET location_tracking_id = (
  SELECT lt.id 
  FROM location_tracking lt
  WHERE lt.user_id = tc.user_id
    AND lt.timestamp BETWEEN (tc.timestamp - INTERVAL '60 seconds') 
                         AND (tc.timestamp + INTERVAL '60 seconds')
  ORDER BY ABS(EXTRACT(EPOCH FROM (lt.timestamp - tc.timestamp)))
  LIMIT 1
)
WHERE tc.location_tracking_id IS NULL
  AND tc.timestamp >= NOW() - INTERVAL '30 days';
*/