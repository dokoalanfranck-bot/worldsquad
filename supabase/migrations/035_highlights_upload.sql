-- Support upload vidéo direct en plus des liens YouTube
ALTER TABLE highlights ALTER COLUMN youtube_id DROP NOT NULL;
ALTER TABLE highlights ADD COLUMN IF NOT EXISTS video_url TEXT;
