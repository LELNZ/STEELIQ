-- Wave 1 Fix: Add missing columns to location_tracking table for Fortune 50 GPS compliance
-- This migration adds all missing columns identified from schema comparison

-- Fix data type issues for existing columns
ALTER TABLE location_tracking 
ALTER COLUMN calculated_speed TYPE DECIMAL(8,2) USING calculated_speed::decimal(8,2),
ALTER COLUMN distance_from_geofence TYPE DECIMAL(10,2) USING distance_from_geofence::decimal(10,2);

-- Add missing columns that don't exist in the database
ALTER TABLE location_tracking 
ADD COLUMN IF NOT EXISTS capture_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS battery_level INTEGER,
ADD COLUMN IF NOT EXISTS battery_charging BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS network_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS signal_strength INTEGER,
ADD COLUMN IF NOT EXISTS mock_provider VARCHAR(100),
ADD COLUMN IF NOT EXISTS velocity_kmh DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS bearing DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS horizontal_accuracy DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS vertical_accuracy DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS satellites_used INTEGER,
ADD COLUMN IF NOT EXISTS satellites_visible INTEGER,
ADD COLUMN IF NOT EXISTS location_age_ms INTEGER,
ADD COLUMN IF NOT EXISTS is_fallback_location BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fallback_reason VARCHAR(100);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_tracking_user_timestamp ON location_tracking(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_tracking_session ON location_tracking(session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_tracking_geofence ON location_tracking(geofence_id) WHERE geofence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_location_tracking_impossible ON location_tracking(user_id, impossible_travel) WHERE impossible_travel = TRUE;

-- Add comment for documentation
COMMENT ON TABLE location_tracking IS 'Fortune 50 compliant GPS tracking with 30-second breadcrumbs, anti-fraud detection, and cryptographic audit trail';