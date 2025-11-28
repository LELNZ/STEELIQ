-- Add dual approval fields to time_corrections table for Fortune 50 compliance
ALTER TABLE time_corrections 
ADD COLUMN IF NOT EXISTS second_approver_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS second_approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS dual_approval_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approval_threshold_minutes INTEGER DEFAULT 120;

-- Add index for dual approval queries
CREATE INDEX IF NOT EXISTS idx_time_corrections_dual_approval 
ON time_corrections(dual_approval_required, second_approver_id);

-- Add comment for compliance documentation
COMMENT ON COLUMN time_corrections.second_approver_id IS 'Second approver for dual-authorization requirements (Fortune 50 compliance)';
COMMENT ON COLUMN time_corrections.second_approved_at IS 'Timestamp of second approval';
COMMENT ON COLUMN time_corrections.dual_approval_required IS 'Whether this correction requires dual approval based on adjustment threshold';
COMMENT ON COLUMN time_corrections.approval_threshold_minutes IS 'Minute threshold that triggers dual approval requirement';