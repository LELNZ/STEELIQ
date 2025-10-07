-- STEELIQ Database Migration Script
-- This script adds the missing columns and tables needed for the application to work properly
-- Generated on October 7, 2025

-- ================================================
-- STEP 1: Add missing column to jobs table
-- ================================================
-- This adds the estimated_hours column that tracks how many hours a job is expected to take
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 0;

-- ================================================
-- STEP 2: Create email_imported_costs table
-- ================================================
-- This table stores costs that are automatically imported from email invoices
CREATE TABLE IF NOT EXISTS email_imported_costs (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  invoice_number VARCHAR(255),
  invoice_date DATE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NZD',
  email_uid VARCHAR(255),
  email_from VARCHAR(255),
  email_subject TEXT,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- STEP 3: Create time_entries table
-- ================================================
-- This table tracks employee time entries for jobs
CREATE TABLE IF NOT EXISTS time_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  job_id INTEGER REFERENCES jobs(id),
  location_id INTEGER REFERENCES locations(id),
  clock_in TIMESTAMP NOT NULL,
  clock_out TIMESTAMP,
  break_duration INTEGER DEFAULT 0,
  total_hours DECIMAL(5, 2),
  hourly_rate DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- STEP 4: Create lifecycle_events table (if not exists)
-- ================================================
-- This table tracks all lifecycle events for jobs
CREATE TABLE IF NOT EXISTS lifecycle_events (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- STEP 5: Create procurement_approvals table (if not exists)
-- ================================================
-- This table manages approval workflows for procurement
CREATE TABLE IF NOT EXISTS procurement_approvals (
  id SERIAL PRIMARY KEY,
  requisition_id INTEGER,
  approver_id INTEGER REFERENCES users(id),
  approval_level INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- VERIFICATION QUERIES
-- ================================================
-- Run these queries after the migration to verify everything worked:

-- Check if estimated_hours column was added to jobs table:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' AND column_name = 'estimated_hours';

-- Check if new tables were created:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('email_imported_costs', 'time_entries', 'lifecycle_events', 'procurement_approvals');

-- If all 4 tables show up, the migration was successful!