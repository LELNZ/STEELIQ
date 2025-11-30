-- Migration: Add SOX/ITGC Compliance Audit Columns to Time & Payroll Tables
-- Purpose: Add hash chain and user attribution fields for Fortune 50 compliance
-- Date: 2025-11-30
-- 
-- IMPORTANT: This migration is designed to be safe for existing data:
-- - All new columns are NULLABLE initially
-- - No existing columns are modified or dropped
-- - Foreign keys reference users(id) with ON DELETE SET NULL for safety
--
-- After migration, a separate data migration should:
-- 1. Compute initial audit_hash values for existing records
-- 2. Set previous_audit_hash to 'GENESIS' for the first record in each table
-- 3. Populate created_by/modified_by where determinable from audit logs

-- ============================================================================
-- Table: timesheets
-- Add: audit_hash, previous_audit_hash, created_by, modified_by
-- Update: created_at and updated_at to use timezone
-- ============================================================================

-- Add audit hash columns for tamper-evident trail
ALTER TABLE "timesheets" ADD COLUMN IF NOT EXISTS "audit_hash" varchar(64);
--> statement-breakpoint

ALTER TABLE "timesheets" ADD COLUMN IF NOT EXISTS "previous_audit_hash" varchar(64);
--> statement-breakpoint

-- Add user attribution columns
ALTER TABLE "timesheets" ADD COLUMN IF NOT EXISTS "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE "timesheets" ADD COLUMN IF NOT EXISTS "modified_by" integer REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- Add comments for documentation
COMMENT ON COLUMN "timesheets"."audit_hash" IS 'SHA-256 hash of record content for SOX/ITGC compliance';
--> statement-breakpoint

COMMENT ON COLUMN "timesheets"."previous_audit_hash" IS 'SHA-256 hash of previous record for hash chain integrity (or GENESIS for first record)';
--> statement-breakpoint

COMMENT ON COLUMN "timesheets"."created_by" IS 'User who created this timesheet record (SOX user attribution)';
--> statement-breakpoint

COMMENT ON COLUMN "timesheets"."modified_by" IS 'User who last modified this timesheet record (SOX user attribution)';
--> statement-breakpoint

-- ============================================================================
-- Table: time_entries
-- Add: audit_hash, previous_audit_hash
-- ============================================================================

-- Add audit hash columns for tamper-evident trail
ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "audit_hash" varchar(64);
--> statement-breakpoint

ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "previous_audit_hash" varchar(64);
--> statement-breakpoint

-- Add comments for documentation
COMMENT ON COLUMN "time_entries"."audit_hash" IS 'SHA-256 hash of record content for SOX/ITGC compliance';
--> statement-breakpoint

COMMENT ON COLUMN "time_entries"."previous_audit_hash" IS 'SHA-256 hash of previous record for hash chain integrity (or GENESIS for first record)';
--> statement-breakpoint

-- ============================================================================
-- Table: payroll_periods
-- Add: audit_hash, previous_audit_hash
-- ============================================================================

-- Add audit hash columns for tamper-evident trail
ALTER TABLE "payroll_periods" ADD COLUMN IF NOT EXISTS "audit_hash" varchar(64);
--> statement-breakpoint

ALTER TABLE "payroll_periods" ADD COLUMN IF NOT EXISTS "previous_audit_hash" varchar(64);
--> statement-breakpoint

-- Add comments for documentation
COMMENT ON COLUMN "payroll_periods"."audit_hash" IS 'SHA-256 hash of record content for SOX/ITGC compliance';
--> statement-breakpoint

COMMENT ON COLUMN "payroll_periods"."previous_audit_hash" IS 'SHA-256 hash of previous record for hash chain integrity (or GENESIS for first record)';
--> statement-breakpoint

-- ============================================================================
-- Create indexes for hash chain verification queries (optional but recommended)
-- ============================================================================

CREATE INDEX IF NOT EXISTS "idx_timesheets_audit_hash" ON "timesheets" ("audit_hash");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_time_entries_audit_hash" ON "time_entries" ("audit_hash");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_payroll_periods_audit_hash" ON "payroll_periods" ("audit_hash");
--> statement-breakpoint

-- ============================================================================
-- Summary of changes:
-- 
-- timesheets:
--   + audit_hash VARCHAR(64) NULL
--   + previous_audit_hash VARCHAR(64) NULL  
--   + created_by INTEGER NULL FK -> users(id)
--   + modified_by INTEGER NULL FK -> users(id)
--
-- time_entries:
--   + audit_hash VARCHAR(64) NULL
--   + previous_audit_hash VARCHAR(64) NULL
--
-- payroll_periods:
--   + audit_hash VARCHAR(64) NULL
--   + previous_audit_hash VARCHAR(64) NULL
--
-- Indexes added:
--   + idx_timesheets_audit_hash
--   + idx_time_entries_audit_hash
--   + idx_payroll_periods_audit_hash
-- ============================================================================
