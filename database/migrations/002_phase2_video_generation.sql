-- ============================================================
-- Dream to Vision AI — Phase 2: Video Generation Schema
-- Run this in your Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- TABLE: video_generations
-- Tracks the overall video generation job for a dream
-- ============================================================
CREATE TABLE IF NOT EXISTS public.video_generations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dream_id          UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_scenes      INTEGER DEFAULT 0,
  completed_scenes  INTEGER DEFAULT 0,
  current_scene     INTEGER DEFAULT 0,
  final_video_url   TEXT,
  storage_path      TEXT,
  duration          INTEGER DEFAULT 0,
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: scene_videos
-- Tracks individual scene video generation for each scene
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scene_videos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dream_id         UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  scene_id         UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  generation_id    UUID REFERENCES public.video_generations(id) ON DELETE CASCADE,
  scene_number     INTEGER NOT NULL,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  provider         TEXT DEFAULT 'fal-kling',
  provider_job_id  TEXT,
  video_url        TEXT,
  storage_path     TEXT,
  duration         INTEGER DEFAULT 5,
  error_message    TEXT,
  attempts         INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_video_generations_dream_id  ON public.video_generations(dream_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_user_id   ON public.video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_status    ON public.video_generations(status);
CREATE INDEX IF NOT EXISTS idx_scene_videos_dream_id       ON public.scene_videos(dream_id);
CREATE INDEX IF NOT EXISTS idx_scene_videos_generation_id  ON public.scene_videos(generation_id);
CREATE INDEX IF NOT EXISTS idx_scene_videos_scene_id       ON public.scene_videos(scene_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at_video_generations
  BEFORE UPDATE ON public.video_generations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_scene_videos
  BEFORE UPDATE ON public.scene_videos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- video_generations
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own video generations"
  ON public.video_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own video generations"
  ON public.video_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own video generations"
  ON public.video_generations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own video generations"
  ON public.video_generations FOR DELETE
  USING (auth.uid() = user_id);

-- scene_videos
ALTER TABLE public.scene_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert scene videos for own dreams"
  ON public.scene_videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dreams
      WHERE dreams.id = scene_videos.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view scene videos of own dreams"
  ON public.scene_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dreams
      WHERE dreams.id = scene_videos.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update scene videos of own dreams"
  ON public.scene_videos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.dreams
      WHERE dreams.id = scene_videos.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

-- ============================================================
-- GRANT PERMISSIONS TO SERVICE ROLE (for backend)
-- ============================================================
GRANT ALL ON public.video_generations TO service_role;
GRANT ALL ON public.scene_videos TO service_role;

-- ============================================================
-- STORAGE BUCKET: dream-videos
-- Run these in the Supabase Storage section OR via SQL
-- ============================================================

-- Create the storage bucket for dream videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dream-videos',
  'dream-videos',
  false,
  524288000,  -- 500MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can only access their own videos
CREATE POLICY "Users can upload own dream videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dream-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own dream videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dream-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own dream videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dream-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Service role full access to storage
CREATE POLICY "Service role full access to dream-videos"
  ON storage.objects FOR ALL
  USING (bucket_id = 'dream-videos')
  WITH CHECK (bucket_id = 'dream-videos');
