-- Add updated_at to duels (was missing from migration 010)
ALTER TABLE public.duels
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
