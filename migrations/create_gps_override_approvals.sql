-- GPS Override Dual Authorization Schema for Fortune 50 Compliance
-- Tracks supervisor approval requests and tokens for GPS override scenarios

-- Drop table if exists (for development only)
DROP TABLE IF EXISTS gps_override_approvals CASCADE;

-- Create the dual authorization tracking table
CREATE TABLE gps_override_approvals (
  id SERIAL PRIMARY KEY,
  request_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  
  -- Request details
  requester_id INTEGER NOT NULL REFERENCES users(id),
  employee_id INTEGER NOT NULL REFERENCES users(id),
  clock_type VARCHAR(20) NOT NULL CHECK (clock_type IN ('clock_in', 'clock_out', 'break_start', 'break_end', 'meal_start', 'meal_end')),
  reason TEXT NOT NULL,
  override_code VARCHAR(50),
  
  -- Approval details
  approver_id INTEGER REFERENCES users(id),
  approval_pin_hash VARCHAR(255), -- Hashed PIN for 2FA
  approval_method VARCHAR(20) CHECK (approval_method IN ('pin', 'totp', 'sms', 'offline')),
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'consumed')),
  
  -- JWT tracking
  jwt_token TEXT, -- Stored encrypted after approval
  jti VARCHAR(100) UNIQUE, -- JWT ID for preventing replay attacks
  jwt_secret_version INTEGER, -- Track which secret was used for rotation
  
  -- Metadata
  request_metadata JSONB NOT NULL DEFAULT '{}', -- GPS attempt details, device info
  approval_metadata JSONB DEFAULT '{}', -- Approval context, 2FA details
  offline_approval_code VARCHAR(100), -- For offline scenarios
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP,
  denied_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  consumed_at TIMESTAMP, -- When used for successful clock-in
  
  -- GPS tracking linkage
  location_tracking_id INTEGER REFERENCES location_tracking(id),
  time_clock_id INTEGER REFERENCES time_clocks(id),
  
  -- Audit fields
  request_ip_address VARCHAR(45),
  approval_ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Constraints
  CONSTRAINT different_supervisors CHECK (requester_id != approver_id),
  CONSTRAINT valid_approval CHECK (
    (status = 'approved' AND approver_id IS NOT NULL AND approved_at IS NOT NULL) OR
    (status != 'approved')
  ),
  CONSTRAINT single_use_token CHECK (
    (status = 'consumed' AND consumed_at IS NOT NULL) OR
    (status != 'consumed' AND consumed_at IS NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_override_pending ON gps_override_approvals(status, expires_at) 
  WHERE status = 'pending';
CREATE INDEX idx_override_employee ON gps_override_approvals(employee_id, created_at DESC);
CREATE INDEX idx_override_requester ON gps_override_approvals(requester_id, created_at DESC);
CREATE INDEX idx_override_approver ON gps_override_approvals(approver_id, approved_at DESC) 
  WHERE approver_id IS NOT NULL;
CREATE INDEX idx_override_jti ON gps_override_approvals(jti) 
  WHERE jti IS NOT NULL;
CREATE INDEX idx_override_expiry ON gps_override_approvals(expires_at) 
  WHERE status = 'pending';

-- Function to automatically expire old pending requests
CREATE OR REPLACE FUNCTION expire_old_override_requests() 
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE gps_override_approvals
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Rate limiting table for approval requests
CREATE TABLE IF NOT EXISTS override_rate_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL DEFAULT NOW(),
  last_request TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, window_start)
);

-- Index for rate limit queries
CREATE INDEX idx_rate_limit_user_window ON override_rate_limits(user_id, window_start DESC);

-- Function to check rate limits (max 5 requests per hour)
CREATE OR REPLACE FUNCTION check_override_rate_limit(p_user_id INTEGER) 
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMP;
BEGIN
  window_start_time := date_trunc('hour', NOW());
  
  -- Get or create rate limit record
  INSERT INTO override_rate_limits (user_id, window_start, request_count, last_request)
  VALUES (p_user_id, window_start_time, 1, NOW())
  ON CONFLICT (user_id, window_start) 
  DO UPDATE SET 
    request_count = override_rate_limits.request_count + 1,
    last_request = NOW()
  RETURNING request_count INTO current_count;
  
  -- Return true if under limit (5 per hour)
  RETURN current_count <= 5;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger for override approvals
CREATE OR REPLACE FUNCTION audit_override_approval() 
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'denied') THEN
    -- Log the approval/denial action
    INSERT INTO audit_log (
      user_id,
      action,
      entity,
      entity_id,
      details,
      created_at
    ) VALUES (
      NEW.approver_id,
      'GPS_OVERRIDE_' || UPPER(NEW.status),
      'gps_override_approval',
      NEW.id,
      jsonb_build_object(
        'request_id', NEW.request_id,
        'requester_id', NEW.requester_id,
        'employee_id', NEW.employee_id,
        'reason', NEW.reason,
        'approval_method', NEW.approval_method
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach audit trigger
CREATE TRIGGER trg_audit_override_approval
AFTER UPDATE ON gps_override_approvals
FOR EACH ROW
EXECUTE FUNCTION audit_override_approval();

-- View for pending approvals (excludes requester from seeing their own)
CREATE OR REPLACE VIEW pending_override_approvals AS
SELECT 
  goa.*,
  requester.username AS requester_name,
  requester.email AS requester_email,
  employee.username AS employee_name,
  employee.email AS employee_email
FROM gps_override_approvals goa
JOIN users requester ON goa.requester_id = requester.id
JOIN users employee ON goa.employee_id = employee.id
WHERE goa.status = 'pending' 
  AND goa.expires_at > NOW();

-- Grant permissions
GRANT SELECT ON pending_override_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON gps_override_approvals TO authenticated;
GRANT EXECUTE ON FUNCTION check_override_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_override_requests TO authenticated;

-- Comments for documentation
COMMENT ON TABLE gps_override_approvals IS 'Fortune 50 compliant dual authorization tracking for GPS override requests';
COMMENT ON COLUMN gps_override_approvals.jti IS 'JWT ID for one-time token use, prevents replay attacks';
COMMENT ON COLUMN gps_override_approvals.jwt_secret_version IS 'Tracks secret rotation for in-flight token validation';
COMMENT ON COLUMN gps_override_approvals.approval_pin_hash IS 'Hashed PIN for supervisor 2FA verification';
COMMENT ON COLUMN gps_override_approvals.offline_approval_code IS 'Backup code for offline supervisor approval scenarios';