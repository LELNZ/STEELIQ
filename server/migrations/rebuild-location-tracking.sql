-- Wave 1 Complete Rebuild: location_tracking table for Fortune 50 GPS compliance
-- This migration rebuilds the table to match shared/schema.ts exactly

-- Step 1: Rename existing table to preserve data
ALTER TABLE IF EXISTS location_tracking RENAME TO location_tracking_old_backup;

-- Step 2: Create new table with exact schema from shared/schema.ts
CREATE TABLE location_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- GPS Data
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(8, 2),
  altitude DECIMAL(8, 2),
  altitude_accuracy DECIMAL(8, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(6, 2),
  
  -- Anti-Spoofing & Validation
  provider VARCHAR(20),
  is_mock_location BOOLEAN DEFAULT FALSE,
  wifi_ssid VARCHAR(100),
  wifi_bssid VARCHAR(20),
  cell_tower_id VARCHAR(50),
  ip_address VARCHAR(45),
  
  -- Device Fingerprinting
  device_id VARCHAR(100) NOT NULL,
  device_model VARCHAR(100),
  os_version VARCHAR(50),
  app_version VARCHAR(20),
  
  -- Velocity & Movement Analysis
  distance_from_last DECIMAL(10, 2),
  time_from_last INTEGER,
  calculated_speed DECIMAL(8, 2),
  impossible_travel BOOLEAN DEFAULT FALSE,
  
  -- Geofence Validation
  geofence_id INTEGER REFERENCES geofence_zones(id),
  inside_geofence BOOLEAN DEFAULT FALSE,
  distance_from_geofence DECIMAL(10, 2),
  
  -- Audit Trail
  capture_method VARCHAR(20) DEFAULT 'automatic',
  supervisor_override BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  override_by INTEGER REFERENCES users(id),
  
  -- SOX Compliance - Tamper Evidence
  previous_hash VARCHAR(64),
  current_hash VARCHAR(64),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 3: Create all required indexes for performance
CREATE INDEX idx_location_tracking_user ON location_tracking(user_id);
CREATE INDEX idx_location_tracking_session ON location_tracking(session_id);
CREATE INDEX idx_location_tracking_timestamp ON location_tracking(timestamp);
CREATE INDEX idx_location_tracking_device ON location_tracking(device_id);
CREATE INDEX idx_location_tracking_geofence ON location_tracking(geofence_id);
CREATE INDEX idx_location_tracking_velocity ON location_tracking(user_id, timestamp, impossible_travel);

-- Step 4: Copy any existing valid data from old table (if it exists and has data)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_tracking_old_backup') THEN
    INSERT INTO location_tracking (
      user_id, session_id, timestamp,
      latitude, longitude, accuracy, altitude,
      is_mock_location, device_id,
      previous_hash, current_hash
    )
    SELECT 
      user_id, 
      COALESCE(session_id, gen_random_uuid()),
      timestamp,
      latitude::DECIMAL(10,8),
      longitude::DECIMAL(11,8),
      accuracy::DECIMAL(8,2),
      altitude::DECIMAL(8,2),
      COALESCE(is_mock_location, FALSE),
      COALESCE(device_id, 'migrated'),
      previous_hash,
      current_hash
    FROM location_tracking_old_backup
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
  END IF;
END $$;

-- Step 5: Drop the old backup table
DROP TABLE IF EXISTS location_tracking_old_backup;

-- Add comment for documentation
COMMENT ON TABLE location_tracking IS 'Fortune 50 compliant GPS tracking with 30-second breadcrumbs, velocity checks, geofencing, and cryptographic audit trail for tamper evidence';