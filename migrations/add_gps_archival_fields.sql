-- Add archival tracking fields to location_tracking table for Fortune 50 data retention
-- These fields support the GPS Archival Service retention policies

ALTER TABLE location_tracking 
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "archiveReason" VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "purgedAt" TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "compressionRehashed" BOOLEAN DEFAULT FALSE;

-- Create indexes for efficient archival queries
CREATE INDEX IF NOT EXISTS idx_location_tracking_archived 
ON location_tracking("archivedAt") 
WHERE "archivedAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_location_tracking_timestamp_archive 
ON location_tracking(timestamp, "archivedAt");

CREATE INDEX IF NOT EXISTS idx_location_tracking_user_timestamp 
ON location_tracking("userId", timestamp);

-- Add comment for compliance documentation
COMMENT ON COLUMN location_tracking."archivedAt" IS 'Timestamp when record was archived for compression or long-term storage';
COMMENT ON COLUMN location_tracking."archiveReason" IS 'Reason for archival: COMPRESSION_90_DAYS, LONG_TERM_STORAGE_365_DAYS';
COMMENT ON COLUMN location_tracking."purgedAt" IS 'Timestamp when PII was purged after 7-year SOX compliance hold';

-- Create GPS archival statistics view for monitoring
CREATE OR REPLACE VIEW gps_archival_stats AS
SELECT 
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '90 days') as active_records,
    COUNT(*) FILTER (WHERE timestamp <= NOW() - INTERVAL '90 days' AND timestamp > NOW() - INTERVAL '365 days') as compressed_period,
    COUNT(*) FILTER (WHERE "archivedAt" IS NOT NULL) as archived_records,
    COUNT(*) FILTER (WHERE "purgedAt" IS NOT NULL) as purged_records,
    MIN(timestamp) as oldest_record,
    MAX(timestamp) as newest_record,
    ROUND((COUNT(*) * 500.0 / 1024 / 1024 / 1024)::numeric, 2) as estimated_storage_gb
FROM location_tracking;

-- Grant appropriate permissions
GRANT SELECT ON gps_archival_stats TO authenticated;