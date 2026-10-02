ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS web_hero_video_url TEXT,
  ADD COLUMN IF NOT EXISTS web_salon_video_url TEXT,
  ADD COLUMN IF NOT EXISTS web_marquee_text TEXT,
  ADD COLUMN IF NOT EXISTS web_gallery JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS web_team JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS web_promos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS web_facebook TEXT,
  ADD COLUMN IF NOT EXISTS web_tiktok TEXT,
  ADD COLUMN IF NOT EXISTS web_map_embed_url TEXT;
