-- ============================================================
-- Dream to Vision AI — Phase 1 Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: dreams
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dreams (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_input        TEXT NOT NULL,
  input_type       TEXT DEFAULT 'text' CHECK (input_type IN ('text', 'voice')),
  title            TEXT,
  enhanced_prompt  TEXT,
  analysis         JSONB,
  story            TEXT,
  logline          TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: characters
-- ============================================================
CREATE TABLE IF NOT EXISTS public.characters (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dream_id            UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  name                TEXT,
  role                TEXT,
  age_range           TEXT,
  appearance          TEXT,
  personality         TEXT,
  clothing            TEXT,
  visual_description  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: scenes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scenes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dream_id         UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  scene_number     INTEGER NOT NULL,
  title            TEXT,
  description      TEXT,
  duration         INTEGER DEFAULT 5,
  visual_prompt    TEXT,
  camera_movement  TEXT,
  camera_angle     TEXT,
  lighting         TEXT,
  mood             TEXT,
  environment      TEXT,
  characters       JSONB DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: generation_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dream_id       UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  job_type       TEXT NOT NULL,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress       INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_dreams_user_id        ON public.dreams(user_id);
CREATE INDEX IF NOT EXISTS idx_dreams_status         ON public.dreams(status);
CREATE INDEX IF NOT EXISTS idx_dreams_created_at     ON public.dreams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_characters_dream_id   ON public.characters(dream_id);
CREATE INDEX IF NOT EXISTS idx_scenes_dream_id       ON public.scenes(dream_id);
CREATE INDEX IF NOT EXISTS idx_scenes_scene_number   ON public.scenes(dream_id, scene_number);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_dream ON public.generation_jobs(dream_id);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_dreams
  BEFORE UPDATE ON public.dreams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_generation_jobs
  BEFORE UPDATE ON public.generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- dreams
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own dreams"
  ON public.dreams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own dreams"
  ON public.dreams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own dreams"
  ON public.dreams FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dreams"
  ON public.dreams FOR DELETE
  USING (auth.uid() = user_id);

-- characters
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert characters for own dreams"
  ON public.characters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dreams
      WHERE dreams.id = characters.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view characters of own dreams"
  ON public.characters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dreams
      WHERE dreams.id = characters.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete characters of own dreams"
  ON public.characters FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.dreams
      WHERE dreams.id = characters.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

-- scenes
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert scenes for own dreams"
  ON public.scenes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dreams
      WHERE dreams.id = scenes.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view scenes of own dreams"
  ON public.scenes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dreams
      WHERE dreams.id = scenes.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete scenes of own dreams"
  ON public.scenes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.dreams
      WHERE dreams.id = scenes.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

-- generation_jobs
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view generation jobs of own dreams"
  ON public.generation_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dreams
      WHERE dreams.id = generation_jobs.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert generation jobs for own dreams"
  ON public.generation_jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dreams
      WHERE dreams.id = generation_jobs.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

-- ============================================================
-- GRANT PERMISSIONS TO SERVICE ROLE (for backend)
-- ============================================================
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.dreams TO service_role;
GRANT ALL ON public.characters TO service_role;
GRANT ALL ON public.scenes TO service_role;
GRANT ALL ON public.generation_jobs TO service_role;
