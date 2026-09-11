require('dotenv').config();
const { supabaseAdmin } = require('../src/config/supabase');

const migrations = [
  `CREATE TABLE IF NOT EXISTS public.video_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')),
    total_scenes INTEGER DEFAULT 0,
    completed_scenes INTEGER DEFAULT 0,
    current_scene INTEGER DEFAULT 0,
    final_video_url TEXT,
    storage_path TEXT,
    duration INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS public.scene_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
    scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
    generation_id UUID REFERENCES public.video_generations(id) ON DELETE CASCADE,
    scene_number INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
    provider TEXT DEFAULT 'fal-kling',
    provider_job_id TEXT,
    video_url TEXT,
    storage_path TEXT,
    duration INTEGER DEFAULT 5,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_video_generations_dream_id ON public.video_generations(dream_id)`,
  `CREATE INDEX IF NOT EXISTS idx_video_generations_user_id  ON public.video_generations(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_scene_videos_generation_id ON public.scene_videos(generation_id)`,
  `CREATE INDEX IF NOT EXISTS idx_scene_videos_dream_id      ON public.scene_videos(dream_id)`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_updated_at_video_generations') THEN
      CREATE TRIGGER set_updated_at_video_generations
        BEFORE UPDATE ON public.video_generations
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_updated_at_scene_videos') THEN
      CREATE TRIGGER set_updated_at_scene_videos
        BEFORE UPDATE ON public.scene_videos
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
  END $$`,

  `ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.scene_videos ENABLE ROW LEVEL SECURITY`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_generations' AND policyname='Users can insert own video generations') THEN
      CREATE POLICY "Users can insert own video generations"
        ON public.video_generations FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_generations' AND policyname='Users can view own video generations') THEN
      CREATE POLICY "Users can view own video generations"
        ON public.video_generations FOR SELECT USING (auth.uid() = user_id);
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_generations' AND policyname='Users can update own video generations') THEN
      CREATE POLICY "Users can update own video generations"
        ON public.video_generations FOR UPDATE USING (auth.uid() = user_id);
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_generations' AND policyname='Users can delete own video generations') THEN
      CREATE POLICY "Users can delete own video generations"
        ON public.video_generations FOR DELETE USING (auth.uid() = user_id);
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scene_videos' AND policyname='Users can insert scene videos for own dreams') THEN
      CREATE POLICY "Users can insert scene videos for own dreams"
        ON public.scene_videos FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM public.dreams WHERE dreams.id = scene_videos.dream_id AND dreams.user_id = auth.uid())
        );
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scene_videos' AND policyname='Users can view scene videos of own dreams') THEN
      CREATE POLICY "Users can view scene videos of own dreams"
        ON public.scene_videos FOR SELECT USING (
          EXISTS (SELECT 1 FROM public.dreams WHERE dreams.id = scene_videos.dream_id AND dreams.user_id = auth.uid())
        );
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scene_videos' AND policyname='Users can update scene videos of own dreams') THEN
      CREATE POLICY "Users can update scene videos of own dreams"
        ON public.scene_videos FOR UPDATE USING (
          EXISTS (SELECT 1 FROM public.dreams WHERE dreams.id = scene_videos.dream_id AND dreams.user_id = auth.uid())
        );
    END IF;
  END $$`,

  `GRANT ALL ON public.video_generations TO service_role`,
  `GRANT ALL ON public.scene_videos TO service_role`,
];

async function runMigration() {
  console.log('Running Phase 2 database migration...\n');

  // Use the Supabase SQL endpoint via fetch
  const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;

  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i].trim();
    const preview = sql.substring(0, 60).replace(/\n/g, ' ');

    try {
      // Try via supabase-js rpc if available
      const { error } = await supabaseAdmin.rpc('exec_sql', { query: sql });
      if (error && !error.message.includes('does not exist')) {
        // RPC not available — use direct fetch to postgres-over-http
        const res = await fetch(`${process.env.SUPABASE_URL}/pg`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ query: sql }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.log(`  [${i + 1}] WARN: ${preview}... → ${body.substring(0, 80)}`);
        } else {
          console.log(`  [${i + 1}] OK: ${preview}...`);
        }
      } else if (!error) {
        console.log(`  [${i + 1}] OK: ${preview}...`);
      } else {
        console.log(`  [${i + 1}] SKIP (rpc unavailable): ${preview}...`);
      }
    } catch (err) {
      console.log(`  [${i + 1}] ERROR: ${err.message.substring(0, 80)}`);
    }
  }

  // Create storage bucket
  console.log('\nCreating dream-videos storage bucket...');
  const { error: bucketErr } = await supabaseAdmin.storage.createBucket('dream-videos', {
    public: false,
    fileSizeLimit: 524288000,
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'application/octet-stream'],
  });

  if (bucketErr && !bucketErr.message.includes('already exists')) {
    console.log('Bucket error:', bucketErr.message);
  } else {
    console.log('dream-videos bucket: OK');
  }

  // Verify
  console.log('\nVerifying tables...');
  for (const t of ['video_generations', 'scene_videos']) {
    const { error } = await supabaseAdmin.from(t).select('id').limit(1);
    console.log(` ${t}: ${error ? 'MISSING - run SQL manually' : 'EXISTS'}`);
  }
  const { error: bErr } = await supabaseAdmin.storage.getBucket('dream-videos');
  console.log(` dream-videos bucket: ${bErr ? 'MISSING' : 'EXISTS'}`);
}

runMigration().catch(console.error);
