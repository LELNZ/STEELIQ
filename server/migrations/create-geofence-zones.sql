-- Create geofence_zones table if it doesn't exist
CREATE TABLE IF NOT EXISTS geofence_zones (
    id SERIAL PRIMARY KEY,
    business_unit_id INTEGER REFERENCES business_units(id),
    job_id INTEGER REFERENCES jobs(id),
    zone_name VARCHAR(100) NOT NULL,
    zone_type VARCHAR(20) NOT NULL,
    geometry JSONB NOT NULL,
    radius_meters INTEGER,
    tolerance_meters INTEGER DEFAULT 50,
    enforcement_level VARCHAR(20) DEFAULT 'warning',
    schedule JSONB,
    allowed_users JSONB,
    restricted_actions JSONB,
    notification_settings JSONB,
    -- Wave 1.5 UI enhancements
    display_color VARCHAR(7) DEFAULT '#0066CC',
    notification_radius INTEGER,
    last_edited_by INTEGER REFERENCES users(id),
    center_latitude DECIMAL(10, 8),
    center_longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_geofence_zones_business_unit ON geofence_zones(business_unit_id, is_active);
CREATE INDEX IF NOT EXISTS idx_geofence_zones_job ON geofence_zones(job_id, is_active);

COMMENT ON TABLE geofence_zones IS 'Location-based clock-in/out enforcement zones';
COMMENT ON COLUMN geofence_zones.display_color IS 'Wave 1.5: Hex color for map UI display';