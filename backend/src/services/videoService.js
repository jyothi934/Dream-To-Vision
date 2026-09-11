const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
const { supabaseAdmin } = require('../config/supabase');
const { getVideoProvider } = require('./providers');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Prompt Engineering ───────────────────────────────────────────────────────

/**
 * Build an enhanced, character-consistent video prompt for a scene.
 */
function buildVideoPrompt(scene, characters) {
  const protagonist = characters.find((c) => c.role === 'protagonist') || characters[0];

  const characterBlock = protagonist
    ? `Character: ${protagonist.name}, ${protagonist.appearance}. Wearing: ${protagonist.clothing}. ${protagonist.visual_description}`
    : '';

  const prompt = `
CINEMATIC VIDEO — ${scene.title}

${characterBlock}

Scene: ${scene.description}

Environment: ${scene.environment}

Camera: ${scene.camera_angle}, ${scene.camera_movement}

Lighting: ${scene.lighting}

Mood: ${scene.mood}

Visual style: premium cinematic realism, physically believable motion, detailed environments, natural lighting, consistent character appearance, 16:9 widescreen composition

${scene.visual_prompt}
`.trim();

  const negative =
    'blur, distort, low quality, watermark, text overlay, subtitles, logo, cartoon, anime, distorted anatomy, extra limbs, random characters, sudden costume change, jumpcut, static image, no motion';

  return { prompt, negative };
}

// ─── Storage ──────────────────────────────────────────────────────────────────

/**
 * Download a video from URL into a temp file. Returns local file path.
 */
async function downloadVideoToTemp(url) {
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `scene_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);

  const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 120000 });

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(tmpFile);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  return tmpFile;
}

/**
 * Upload a local file to Supabase Storage.
 * Returns the public/signed URL and storage path.
 */
async function uploadToStorage(localPath, storagePath) {
  const fileBuffer = fs.readFileSync(localPath);

  const { error } = await supabaseAdmin.storage
    .from('dream-videos')
    .upload(storagePath, fileBuffer, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  // Get a signed URL valid for 7 days
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from('dream-videos')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  if (signedError) throw new Error(`Failed to create signed URL: ${signedError.message}`);

  return { url: signedData.signedUrl, storagePath };
}

// ─── FFmpeg Assembly ──────────────────────────────────────────────────────────

/**
 * Concatenate multiple MP4 files into one final video.
 * Returns the path to the output file.
 */
async function concatenateVideos(inputFiles, outputPath) {
  return new Promise((resolve, reject) => {
    // Write a concat list file
    const listPath = path.join(os.tmpdir(), `concat_${Date.now()}.txt`);
    const listContent = inputFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    ffmpeg()
      .input(listPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions([
        '-c:v', 'libx264',
        '-crf', '23',
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-an', // no audio — scene clips have no audio track
      ])
      .output(outputPath)
      .on('end', () => {
        try { fs.unlinkSync(listPath); } catch {}
        resolve(outputPath);
      })
      .on('error', (err) => {
        try { fs.unlinkSync(listPath); } catch {}
        reject(new Error(`FFmpeg concat failed: ${err.message}`));
      })
      .run();
  });
}

// ─── Job Progress Helpers ─────────────────────────────────────────────────────

async function updateGenerationProgress(genId, fields) {
  if (!genId) return;
  await supabaseAdmin
    .from('video_generations')
    .update({ ...fields })
    .eq('id', genId);
}

async function updateSceneVideo(sceneVideoId, fields) {
  await supabaseAdmin
    .from('scene_videos')
    .update({ ...fields })
    .eq('id', sceneVideoId);
}

// ─── Poll Until Done ─────────────────────────────────────────────────────────

/**
 * Poll fal.ai until job completes or fails.
 * Max wait: 10 minutes per scene.
 */
async function pollUntilDone(provider, jobId, maxWaitMs = 600000) {
  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start < maxWaitMs) {
    attempt++;
    const { status } = await provider.getStatus(jobId);

    if (status === 'completed') return 'completed';
    if (status === 'failed') return 'failed';

    // Exponential backoff: 8s → 12s → 16s → 20s (cap)
    const delay = Math.min(8000 + attempt * 2000, 20000);
    await sleep(delay);
  }

  return 'timeout';
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

/**
 * Full Phase 2 video generation pipeline.
 * Runs as a background async process — does NOT block the HTTP response.
 */
async function runVideoPipeline(generationId, dreamId, userId) {
  let provider;
  const tmpFiles = [];

  try {
    provider = getVideoProvider();
  } catch (err) {
    await supabaseAdmin
      .from('video_generations')
      .update({ status: 'failed', error_message: err.message })
      .eq('id', generationId);
    return;
  }

  try {
    // 1. Load dream + scenes + characters
    const { data: dream, error: dreamErr } = await supabaseAdmin
      .from('dreams')
      .select('*')
      .eq('id', dreamId)
      .eq('user_id', userId)
      .single();

    if (dreamErr || !dream) throw new Error('Dream not found');

    const { data: scenes } = await supabaseAdmin
      .from('scenes')
      .select('*')
      .eq('dream_id', dreamId)
      .order('scene_number');

    const { data: characters } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('dream_id', dreamId);

    if (!scenes?.length) throw new Error('No scenes found for this dream');

    // 2. Update generation record with total scenes
    await updateGenerationProgress(generationId, {
      status: 'processing',
      total_scenes: scenes.length,
      completed_scenes: 0,
      current_scene: 1,
    });

    const sceneVideoLocalPaths = [];

    // 3. Generate each scene video
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      await updateGenerationProgress(generationId, { current_scene: i + 1 });

      // Get or create scene_video record
      const { data: existingSv } = await supabaseAdmin
        .from('scene_videos')
        .select('*')
        .eq('scene_id', scene.id)
        .eq('generation_id', generationId)
        .single();

      let sceneVideoId = existingSv?.id;

      if (!sceneVideoId) {
        const { data: newSv } = await supabaseAdmin
          .from('scene_videos')
          .insert({
            dream_id: dreamId,
            scene_id: scene.id,
            generation_id: generationId,
            scene_number: scene.scene_number,
            status: 'pending',
            provider: provider.name,
            duration: scene.duration || 5,
          })
          .select()
          .single();
        sceneVideoId = newSv?.id;
      }

      // Skip already-completed scenes (resume support)
      if (existingSv?.status === 'completed' && existingSv?.video_url) {
        console.log(`Scene ${i + 1} already completed, reusing.`);
        // Download it again for assembly
        const localPath = await downloadVideoToTemp(existingSv.video_url);
        tmpFiles.push(localPath);
        sceneVideoLocalPaths.push(localPath);
        await updateGenerationProgress(generationId, {
          completed_scenes: i + 1,
        });
        continue;
      }

      // Build prompt
      const { prompt, negative } = buildVideoPrompt(scene, characters || []);

      // Submit job
      await updateSceneVideo(sceneVideoId, { status: 'processing', attempts: (existingSv?.attempts || 0) + 1 });

      let jobId;
      try {
        jobId = await provider.submitJob({
          prompt,
          negativePrompt: negative,
          duration: scene.duration || 5,
          aspectRatio: '16:9',
        });
      } catch (submitErr) {
        console.error(`Scene ${i + 1} submit failed:`, submitErr.message);
        await updateSceneVideo(sceneVideoId, {
          status: 'failed',
          error_message: submitErr.message,
        });
        throw new Error(`Scene ${i + 1} video generation failed: ${submitErr.message}`);
      }

      await updateSceneVideo(sceneVideoId, { provider_job_id: jobId });
      console.log(`Scene ${i + 1} submitted. Job ID: ${jobId}`);

      // Poll until done
      const pollResult = await pollUntilDone(provider, jobId);

      if (pollResult !== 'completed') {
        const errMsg = pollResult === 'timeout' ? 'Generation timed out' : 'Provider reported failure';
        await updateSceneVideo(sceneVideoId, { status: 'failed', error_message: errMsg });
        throw new Error(`Scene ${i + 1}: ${errMsg}`);
      }

      // Get video URL from provider
      const videoUrl = await provider.getVideoUrl(jobId);
      console.log(`Scene ${i + 1} generated: ${videoUrl}`);

      // Download to temp
      const localPath = await downloadVideoToTemp(videoUrl);
      tmpFiles.push(localPath);

      // Upload to Supabase Storage
      const storagePath = `${userId}/${dreamId}/scene-${String(scene.scene_number).padStart(2, '0')}.mp4`;
      const { url: storageUrl } = await uploadToStorage(localPath, storagePath);

      // Save scene video record
      await updateSceneVideo(sceneVideoId, {
        status: 'completed',
        video_url: storageUrl,
        storage_path: storagePath,
      });

      sceneVideoLocalPaths.push(localPath);

      // Update progress
      await updateGenerationProgress(generationId, {
        completed_scenes: i + 1,
      });

      console.log(`Scene ${i + 1}/${scenes.length} complete.`);

      // Brief pause between scene generations
      if (i < scenes.length - 1) await sleep(2000);
    }

    // 4. Concatenate all scene videos into final MP4
    console.log('All scenes generated. Assembling final video...');
    const finalPath = path.join(os.tmpdir(), `final_${dreamId}_${Date.now()}.mp4`);
    tmpFiles.push(finalPath);

    await concatenateVideos(sceneVideoLocalPaths, finalPath);
    console.log('FFmpeg concatenation complete.');

    // 5. Upload final video to Supabase Storage
    const finalStoragePath = `${userId}/${dreamId}/final.mp4`;
    const { url: finalUrl } = await uploadToStorage(finalPath, finalStoragePath);
    console.log('Final video uploaded:', finalUrl);

    // 6. Get duration from first scene total
    const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 5), 0);

    // 7. Mark generation complete
    await updateGenerationProgress(generationId, {
      status: 'completed',
      final_video_url: finalUrl,
      storage_path: finalStoragePath,
      duration: totalDuration,
    });

    console.log(`Video pipeline complete for dream ${dreamId}`);
  } catch (err) {
    console.error('Video pipeline error:', err.message);
    await updateGenerationProgress(generationId, {
      status: 'failed',
      error_message: err.message,
    });
  } finally {
    // Cleanup temp files
    for (const f of tmpFiles) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start video generation. Creates the DB record and kicks off background pipeline.
 */
async function startVideoGeneration(dreamId, userId) {
  // Verify dream belongs to user and is completed
  const { data: dream, error } = await supabaseAdmin
    .from('dreams')
    .select('id, status, title')
    .eq('id', dreamId)
    .eq('user_id', userId)
    .single();

  if (error || !dream) {
    const err = new Error('Dream not found or access denied');
    err.status = 404;
    throw err;
  }

  if (dream.status !== 'completed') {
    const err = new Error('Dream must be fully analyzed before generating video');
    err.status = 400;
    throw err;
  }

  // Check if there's already a running generation
  const { data: existing } = await supabaseAdmin
    .from('video_generations')
    .select('id, status')
    .eq('dream_id', dreamId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing?.status === 'processing' || existing?.status === 'pending') {
    const err = new Error('Video generation already in progress');
    err.status = 409;
    throw err;
  }

  // Count scenes
  const { data: scenes } = await supabaseAdmin
    .from('scenes')
    .select('id')
    .eq('dream_id', dreamId);

  if (!scenes?.length) {
    const err = new Error('No scenes found. Please analyze the dream first.');
    err.status = 400;
    throw err;
  }

  // Create generation record
  const { data: gen, error: genErr } = await supabaseAdmin
    .from('video_generations')
    .insert({
      dream_id: dreamId,
      user_id: userId,
      status: 'pending',
      total_scenes: scenes.length,
      completed_scenes: 0,
      current_scene: 0,
    })
    .select()
    .single();

  if (genErr) throw new Error(`Failed to create generation: ${genErr.message}`);

  // Fire-and-forget background pipeline
  setImmediate(() => runVideoPipeline(gen.id, dreamId, userId));

  return {
    generationId: gen.id,
    status: 'processing',
    totalScenes: scenes.length,
  };
}

/**
 * Get generation progress by generationId (verifying ownership).
 */
async function getGenerationProgress(generationId, userId) {
  const { data, error } = await supabaseAdmin
    .from('video_generations')
    .select('*')
    .eq('id', generationId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    const err = new Error('Generation not found');
    err.status = 404;
    throw err;
  }

  const progress = data.total_scenes > 0
    ? Math.round((data.completed_scenes / data.total_scenes) * 90) // reserve 10% for assembly
    : 0;

  return {
    id: data.id,
    dreamId: data.dream_id,
    status: data.status,
    totalScenes: data.total_scenes,
    completedScenes: data.completed_scenes,
    currentScene: data.current_scene,
    progress,
    finalVideoUrl: data.final_video_url,
    duration: data.duration,
    errorMessage: data.error_message,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get the latest generation for a dream.
 */
async function getDreamVideoStatus(dreamId, userId) {
  const { data, error } = await supabaseAdmin
    .from('video_generations')
    .select('*')
    .eq('dream_id', dreamId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    status: data.status,
    finalVideoUrl: data.final_video_url,
    duration: data.duration,
    totalScenes: data.total_scenes,
    completedScenes: data.completed_scenes,
    currentScene: data.current_scene,
    progress: data.total_scenes > 0
      ? Math.round((data.completed_scenes / data.total_scenes) * 90)
      : 0,
    errorMessage: data.error_message,
    createdAt: data.created_at,
  };
}

/**
 * Get individual scene video statuses for a generation.
 */
async function getSceneVideos(generationId, userId) {
  // Verify ownership via join
  const { data: gen } = await supabaseAdmin
    .from('video_generations')
    .select('id')
    .eq('id', generationId)
    .eq('user_id', userId)
    .single();

  if (!gen) {
    const err = new Error('Generation not found');
    err.status = 404;
    throw err;
  }

  const { data, error } = await supabaseAdmin
    .from('scene_videos')
    .select('*')
    .eq('generation_id', generationId)
    .order('scene_number');

  if (error) throw new Error(`Failed to fetch scene videos: ${error.message}`);
  return data || [];
}

/**
 * Cancel an active generation.
 */
async function cancelGeneration(generationId, userId) {
  const { data: gen, error } = await supabaseAdmin
    .from('video_generations')
    .select('*')
    .eq('id', generationId)
    .eq('user_id', userId)
    .single();

  if (error || !gen) {
    const err = new Error('Generation not found');
    err.status = 404;
    throw err;
  }

  if (!['pending', 'processing'].includes(gen.status)) {
    const err = new Error('Generation is not active');
    err.status = 400;
    throw err;
  }

  // Try to cancel any in-progress scene jobs
  try {
    const provider = getVideoProvider();
    const { data: sceneVids } = await supabaseAdmin
      .from('scene_videos')
      .select('provider_job_id')
      .eq('generation_id', generationId)
      .eq('status', 'processing');

    for (const sv of sceneVids || []) {
      if (sv.provider_job_id) {
        await provider.cancelJob(sv.provider_job_id).catch(() => {});
      }
    }
  } catch {}

  await supabaseAdmin
    .from('video_generations')
    .update({ status: 'cancelled' })
    .eq('id', generationId);

  return { message: 'Generation cancelled' };
}

/**
 * Generate a fresh signed URL for a completed video (URLs expire after 7 days).
 */
async function refreshVideoUrl(dreamId, userId) {
  const { data: gen } = await supabaseAdmin
    .from('video_generations')
    .select('storage_path, status')
    .eq('dream_id', dreamId)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!gen?.storage_path) return null;

  const { data: signedData } = await supabaseAdmin.storage
    .from('dream-videos')
    .createSignedUrl(gen.storage_path, 60 * 60 * 24 * 7);

  return signedData?.signedUrl || null;
}

module.exports = {
  startVideoGeneration,
  getGenerationProgress,
  getDreamVideoStatus,
  getSceneVideos,
  cancelGeneration,
  refreshVideoUrl,
};
