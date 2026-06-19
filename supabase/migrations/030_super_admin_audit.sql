-- Super admin audit log
CREATE TABLE IF NOT EXISTS super_admin_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_pseudo    TEXT NOT NULL DEFAULT '',
  action          TEXT NOT NULL,
  target_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  target_pseudo   TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON super_admin_audit_log(created_at DESC);
CREATE INDEX ON super_admin_audit_log(target_user_id);
CREATE INDEX ON super_admin_audit_log(admin_id, created_at DESC);

ALTER TABLE super_admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service audit" ON super_admin_audit_log;
CREATE POLICY "Service audit" ON super_admin_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- App settings (maintenance mode, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads settings"  ON app_settings;
DROP POLICY IF EXISTS "Service writes settings" ON app_settings;
CREATE POLICY "Anyone reads settings"  ON app_settings FOR SELECT USING (true);
CREATE POLICY "Service writes settings" ON app_settings FOR ALL   USING (auth.role() = 'service_role');

INSERT INTO app_settings (key, value) VALUES
  ('maintenance_mode', '{"enabled": false, "message": "Maintenance en cours, revenez bientôt !"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
