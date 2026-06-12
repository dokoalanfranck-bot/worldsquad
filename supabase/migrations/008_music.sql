-- Table music_tracks
CREATE TABLE IF NOT EXISTS public.music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ambiance' CHECK (type IN ('ambiance', 'pack_opening')),
  active BOOLEAN DEFAULT FALSE,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "music_public_read" ON public.music_tracks
  FOR SELECT USING (true);

CREATE POLICY "music_admin_all" ON public.music_tracks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );
