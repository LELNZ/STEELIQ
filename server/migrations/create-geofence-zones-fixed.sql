-- Create geofence_zones table for Wave 1.5 
-- Using existing tables: jobs, company_locations, users
CREATE TABLE IF NOT EXISTS geofence_zones (
    id SERIAL PRIMARY KEY,
    -- Using existing tables
    job_id INTEGER REFERENCES jobs(id),
    location_id INTEGER REFERENCES company_locations(id),
    
    -- Core zone fields
    zone_name VARCHAR(100) NOT NULL,
    zone_type VARCHAR(20) NOT NULL, -- job_site, office, warehouse, field
    
    -- Geofence data
    geometry JSONB NOT NULL, -- GeoJSON format
    radius_meters INTEGER,
    tolerance_meters INTEGER DEFAULT 50,
    
    -- Zone settings
    enforcement_level VARCHAR(20) DEFAULT 'warning', -- none, warning, strict
    schedule JSONB, -- When zone is active
    allowed_users JSONB, -- User IDs or roles
    restricted_actions JSONB, -- What actions are restricted
    notification_settings JSONB, -- Alert settings
    
    -- Wave 1.5 UI enhancements
    display_color VARCHAR(7) DEFAULT '#0066CC',
    notification_radius INTEGER,
    last_edited_by INTEGER REFERENCES users(id),
    center_latitude DECIMAL(10, 8),
    center_longitude DECIMAL(11, 8),
    
    -- Status and audit
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_geofence_zones_job ON geofence_zones(job_id, is_active);
CREATE INDEX IF NOT EXISTS idx_geofence_zones_location ON geofence_zones(location_id, is_active);
CREATE INDEX IF NOT EXISTS idx_geofence_zones_active ON geofence_zones(is_active);

-- Add comments
COMMENT ON TABLE geofence_zones IS 'Wave 1.5: Location-based enforcement zones for time clock validation';
COMMENT ON COLUMN geofence_zones.display_color IS 'Hex color for map UI display';
COMMENT ON COLUMN geofence_zones.notification_radius IS 'Meters from zone for proximity alerts';