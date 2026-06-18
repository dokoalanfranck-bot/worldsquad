-- Super admin + ban system
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason     TEXT;

-- Set super admin (also ensures is_admin = true)
UPDATE users
SET is_super_admin = true, is_admin = true
WHERE email = 'dokoalan9@gmail.com';
