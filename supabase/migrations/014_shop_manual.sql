-- Migration 014 — Boutique manuelle (Orange Money / MTN)

-- Config boutique (ligne unique)
CREATE TABLE IF NOT EXISTS public.shop_config (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orange_money   text NOT NULL DEFAULT '',
  mtn            text NOT NULL DEFAULT '',
  prices_fcfa    jsonb NOT NULL DEFAULT '{"starter": 500, "fan": 1500, "ultra": 3500}',
  is_active      boolean NOT NULL DEFAULT true,
  updated_at     timestamptz DEFAULT now()
);

INSERT INTO public.shop_config (orange_money, mtn, prices_fcfa)
VALUES ('', '', '{"starter": 500, "fan": 1500, "ultra": 3500}')
ON CONFLICT DO NOTHING;

-- Demandes de paiement
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pack_type       text NOT NULL CHECK (pack_type IN ('starter', 'fan', 'ultra')),
  pack_name       text NOT NULL,
  amount_fcfa     integer NOT NULL,
  coins_to_credit integer NOT NULL,
  phone_number    text NOT NULL,
  screenshot_url  text NOT NULL,
  payment_method  text NOT NULL DEFAULT 'orange_money'
                  CHECK (payment_method IN ('orange_money', 'mtn')),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note      text,
  reviewed_by     uuid REFERENCES public.users(id),
  created_at      timestamptz DEFAULT now(),
  reviewed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user   ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status, created_at DESC);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own requests"   ON public.payment_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own requests" ON public.payment_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role all"          ON public.payment_requests FOR ALL USING (auth.role() = 'service_role');

ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
