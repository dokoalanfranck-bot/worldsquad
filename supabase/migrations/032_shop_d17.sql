-- Add D17 (Tunisian mobile payment) support to shop_config
ALTER TABLE shop_config
  ADD COLUMN IF NOT EXISTS d17       TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prices_dt JSONB   NOT NULL DEFAULT '{"starter": 5, "fan": 15, "ultra": 35}';
