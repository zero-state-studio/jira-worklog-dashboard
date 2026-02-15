-- Migration: Add is_active column to users table for soft delete support
-- Date: 2024-02-13
-- Description: Implements soft delete pattern - users are marked inactive instead of deleted
--              This preserves historical worklog data, billing records, and reports

-- Add is_active column to users table (defaults to 1 = active)
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1 NOT NULL;

-- Update any existing users to be active (should already be the case, but be explicit)
UPDATE users SET is_active = 1 WHERE is_active IS NULL;

-- Create index for efficient filtering of active users
CREATE INDEX IF NOT EXISTS idx_users_active ON users(company_id, is_active);

-- Verification: Check that all existing users are active
-- Expected: All users should have is_active = 1
SELECT
    company_id,
    COUNT(*) as total_users,
    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users
FROM users
GROUP BY company_id;
