-- Wave 1.5 Database Migration
-- Adding tables for bulk corrections, shift notifications, kiosk mode, and enhanced geofencing

-- 1. Bulk Time Corrections Tables
CREATE TABLE IF NOT EXISTS time_corrections (
    id SERIAL PRIMARY KEY,
    correction_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    manager_id INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    total_entries INTEGER NOT NULL,
    total_adjustment_minutes INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    applied_at TIMESTAMP,
    applied_by INTEGER REFERENCES users(id),
    rejected_at TIMESTAMP,
    rejected_by INTEGER REFERENCES users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_corrections_manager ON time_corrections(manager_id);
CREATE INDEX IF NOT EXISTS idx_corrections_status ON time_corrections(status);
CREATE INDEX IF NOT EXISTS idx_corrections_created ON time_corrections(created_at);

CREATE TABLE IF NOT EXISTS time_correction_items (
    id SERIAL PRIMARY KEY,
    correction_id INTEGER NOT NULL REFERENCES time_corrections(id),
    time_clock_id INTEGER NOT NULL REFERENCES time_clocks(id),
    original_timestamp TIMESTAMP NOT NULL,
    original_clock_type VARCHAR(20) NOT NULL,
    new_timestamp TIMESTAMP NOT NULL,
    adjustment_minutes INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_correction_items_batch ON time_correction_items(correction_id);
CREATE INDEX IF NOT EXISTS idx_correction_items_clock ON time_correction_items(time_clock_id);

-- 2. Shift Notifications Tables
CREATE TABLE IF NOT EXISTS shift_notifications (
    id SERIAL PRIMARY KEY,
    notification_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    shift_id INTEGER REFERENCES job_tasks(id),
    shift_date DATE NOT NULL,
    shift_start_time TIMESTAMP NOT NULL,
    notification_type VARCHAR(20) NOT NULL,
    reminder_minutes INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    sent_at TIMESTAMP,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    scheduled_for TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shift_notif_user ON shift_notifications(user_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_notif_status ON shift_notifications(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_shift_notif_shift ON shift_notifications(shift_id);

CREATE TABLE IF NOT EXISTS shift_notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    default_reminder_minutes INTEGER DEFAULT 30,
    weekend_reminders BOOLEAN DEFAULT true,
    sms_number TEXT,
    email_override TEXT,
    opted_in BOOLEAN DEFAULT true,
    opt_in_date TIMESTAMP,
    opt_out_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Device Sessions for Kiosk Mode
CREATE TABLE IF NOT EXISTS device_sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    device_id VARCHAR(100) NOT NULL,
    device_fingerprint JSONB DEFAULT '{}',
    location_id INTEGER REFERENCES company_locations(id),
    location_name VARCHAR(100),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    terminated_at TIMESTAMP,
    active_user_id INTEGER REFERENCES users(id),
    last_activity_at TIMESTAMP,
    session_token TEXT NOT NULL,
    refresh_token TEXT,
    kiosk_mode BOOLEAN DEFAULT false,
    requires_photo BOOLEAN DEFAULT true,
    requires_pin BOOLEAN DEFAULT false,
    allowed_actions JSONB DEFAULT '[]',
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_device_session_device ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_session_location ON device_sessions(location_id);
CREATE INDEX IF NOT EXISTS idx_device_session_expiry ON device_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_session_active_user ON device_sessions(active_user_id);

-- 4. Enhance Geofence Zones with UI fields
ALTER TABLE geofence_zones 
ADD COLUMN IF NOT EXISTS display_color VARCHAR(7) DEFAULT '#0066CC',
ADD COLUMN IF NOT EXISTS notification_radius INTEGER,
ADD COLUMN IF NOT EXISTS last_edited_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS center_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS center_longitude DECIMAL(11, 8);

-- 5. Add device metrics to location_tracking for battery optimization
ALTER TABLE location_tracking
ADD COLUMN IF NOT EXISTS device_metrics JSONB;

-- Add comments for documentation
COMMENT ON TABLE time_corrections IS 'Wave 1.5: Bulk time entry corrections for managers';
COMMENT ON TABLE shift_notifications IS 'Wave 1.5: Automated shift reminder system';
COMMENT ON TABLE device_sessions IS 'Wave 1.5: Kiosk mode device session management';
COMMENT ON COLUMN geofence_zones.display_color IS 'Wave 1.5: Hex color for map UI display';
COMMENT ON COLUMN location_tracking.device_metrics IS 'Wave 1.5: Battery level and optimization data';