/**
 * videoService.js — Phase 2: Google Flow Manual Upload Workflow
 *
 * Flow:
 *  1. User copies cinematic prompts → generates clips in Google Flow (Veo)
 *  2. User downloads MP4 clips from Google Flow
 *  3. User uploads each MP4 clip via our upload endpoint
 *  4. Backend stores clips in Supabase Storage
 *  5. User triggers "Create Final Video"
 *  6. FFmpeg concatenates all uploaded clips in scene order
 *  7. Final MP4 is stored and returned as a playable URL
 *
 * fal.ai provider is kept but disabled. Only called if VIDEO_PROVIDER=fal-kling
 * is explicitly set in .env (requires paid credits — not used by default).
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
const { supabaseAdmin } = require('../config/supabase');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ─── Storage Helpers ──────────────────────────────────────────────────────────

/**
 * Upload a buffer to Supabase Storage.
 * Returns a 7-day signed URL and the storage path.
 */
async function uploadBufferToStorage(buffer, storagePath, mimeType = 'video/mp4') {
  const { error } = await supabaseAdmin.storage
    .from('dream-videos')
    .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from('dream-videos')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

  if (signErr) throw new Error(`Signed URL creation failed: ${signErr.message}`);

  return { url: signed.signedUrl, storagePath };
}

/**
 * Upload a local file path to Supabase Storage.
 */
async function uploadFileToStorage(localPath, storagePath) {
  const buffer = fs.readFileSync(localPath);
  return uploadBufferToStorage(buffer, storagePath);
}

// ─── FFmpeg Assembly ──────────────────────────────────────────────────────────

/**
 * Concatenate MP4 files using FFmpeg concat demuxer.
 * Normalises codec + pixel format for maximum browser compatibility.
 */
async function concatenateVideos(inputFiles, outputPath) {
  return new Promise((resolve, reject) => {
    const listPath = path.join(os.tmpdir(), `concat_${Date.now()}.txt`);
    // Windows-safe path escaping for the concat file
    const listContent = inputFiles
      .map((f) => `file '${f.replace(/\\/g, '/').replace(/'/g, "\\'")}'`)
      .join('\n');
    fs.writeFileSync(listPath, listContent, 'utf8');

    ffmpeg()
      .input(listPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions([
        '-c:v', 'libx264',
        '-crf', '23',
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-an',  // no audio track
      ])
      .output(outputPath)
      .on('end', () => {
        try { fs.unlinkSync(listPath); } catch {}
        resolve(outputPath);
      })
      .on('error', (err) => {
        try { fs.unlinkSync(listPath); } catch {}
        reject(new Error(`FFmpeg error: ${err.message}`));
      })
      .run();
  });
}

// ─── Generation Record Helpers ────────────────────────────────────────────────

async function getOrCreateGeneration(dreamId, userId) {
  // Return existing non-failed generation or create a fresh one
  const { data: existing } = await supabaseAdmin
    .from('video_generations')
    .select('*')
    .eq('dream_id', dreamId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing && existing.status !== 'failed' && existing.status !== 'cancelled') {
    return existing;
  }

  const { data: scenes } = await supabaseAdmin
    .from('scenes')
    .select('id')
    .eq('dream_id', dreamId);

  const { data: gen, error } = await supabaseAdmin
    .from('video_generations')
    .insert({
      dream_id: dreamId,
      user_id: userId,
      status: 'pending',
      total_scenes: scenes?.length || 0,
      completed_scenes: 0,
      current_scene: 0,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create generation record: ${error.message}`);
  return gen;
}

// ─── Upload Scene Video ───────────────────────────────────────────────────────

/**
 * Upload a user-provided MP4 for one scene.
 * Called by POST /api/dreams/:dreamId/scenes/:sceneId/upload
 */
async function uploadSceneVideo(dreamId, sceneId, userId, fileBuffer, originalName) {
  // Verify dream + scene ownership
  const { data: dream } = await supabaseAdmin
    .from('dreams')
    .select('id, status')
    .eq('id', dreamId)
    .eq('user_id', userId)
    .single();

  if (!dream) {
    const e = new Error('Dream not found or access denied'); e.status = 404; throw e;
  }

  const { data: scene } = await supabaseAdmin
    .from('scenes')
    .select('id, scene_number, dream_id')
    .eq('id', sceneId)
    .eq('dream_id', dreamId)
    .single();

  if (!scene) {
    const e = new Error('Scene not found'); e.status = 404; throw e;
  }

  // Get or create the generation record
  const gen = await getOrCreateGeneration(dreamId, userId);

  // Storage path: userId/dreamId/scene-01.mp4
  const paddedNum = String(scene.scene_number).padStart(2, '0');
  const storagePath = `${userId}/${dreamId}/scene-${paddedNum}.mp4`;

  // Upload buffer to Supabase Storage
  const { url, storagePath: savedPath } = await uploadBufferToStorage(
    fileBuffer, storagePath, 'video/mp4'
  );

  // Upsert scene_videos record
  const { data: existing } = await supabaseAdmin
    .from('scene_videos')
    .select('id')
    .eq('scene_id', sceneId)
    .eq('generation_id', gen.id)
    .single();

  if (existing) {
    await supabaseAdmin
      .from('scene_videos')
      .update({
        status: 'completed',
        video_url: url,
        storage_path: savedPath,
        provider: 'google-flow-manual',
        duration: 6,
      })
      .eq('id', existing.id);
  } else {
    await supabaseAdmin
      .from('scene_videos')
      .insert({
        dream_id: dreamId,
        scene_id: sceneId,
        generation_id: gen.id,
        scene_number: scene.scene_number,
        status: 'completed',
        provider: 'google-flow-manual',
        video_url: url,
        storage_path: savedPath,
        duration: 6,
      });
  }

  // Count how many scenes are now uploaded
  const { data: completedScenes } = await supabaseAdmin
    .from('scene_videos')
    .select('id')
    .eq('generation_id', gen.id)
    .eq('status', 'completed');

  const completedCount = completedScenes?.length || 0;

  // Update generation progress
  await supabaseAdmin
    .from('video_generations')
    .update({
      status: completedCount >= gen.total_scenes ? 'pending' : 'pending',
      completed_scenes: completedCount,
    })
    .eq('id', gen.id);

  return {
    sceneNumber: scene.scene_number,
    videoUrl: url,
    storagePath: savedPath,
    completedScenes: completedCount,
    totalScenes: gen.total_scenes,
  };
}

// ─── Get Upload Status ────────────────────────────────────────────────────────

/**
 * Returns per-scene upload status for the current generation.
 */
async function getSceneUploadStatus(dreamId, userId) {
  const { data: dream } = await supabaseAdmin
    .from('dreams')
    .select('id')
    .eq('id', dreamId)
    .eq('user_id', userId)
    .single();

  if (!dream) {
    const e = new Error('Dream not found'); e.status = 404; throw e;
  }

  const { data: scenes } = await supabaseAdmin
    .from('scenes')
    .select('id, scene_number, title, visual_prompt')
    .eq('dream_id', dreamId)
    .order('scene_number');

  // Get latest generation
  const { data: gen } = await supabaseAdmin
    .from('video_generations')
    .select('*')
    .eq('dream_id', dreamId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get uploaded scene videos
  const uploadedMap = {};
  if (gen) {
    const { data: sceneVids } = await supabaseAdmin
      .from('scene_videos')
      .select('scene_id, status, video_url, scene_number')
      .eq('generation_id', gen.id)
      .eq('status', 'completed');

    (sceneVids || []).forEach((sv) => {
      uploadedMap[sv.scene_id] = sv;
    });
  }

  const sceneStatuses = (scenes || []).map((s) => ({
    sceneId: s.id,
    sceneNumber: s.scene_number,
    title: s.title,
    visualPrompt: s.visual_prompt,
    uploaded: !!uploadedMap[s.id],
    videoUrl: uploadedMap[s.id]?.video_url || null,
  }));

  return {
    generationId: gen?.id || null,
    finalVideoUrl: gen?.final_video_url || null,
    status: gen?.status || 'none',
    totalScenes: scenes?.length || 0,
    uploadedScenes: Object.keys(uploadedMap).length,
    scenes: sceneStatuses,
  };
}

// ─── Assemble Final Video ─────────────────────────────────────────────────────

/**
 * FFmpeg-assemble all uploaded scene clips into one final MP4.
 * Called by POST /api/dreams/:dreamId/assemble-video
 */
async function assembleFinalVideo(dreamId, userId) {
  // Verify ownership
  const { data: dream } = await supabaseAdmin
    .from('dreams')
    .select('id, title')
    .eq('id', dreamId)
    .eq('user_id', userId)
    .single();

  if (!dream) {
    const e = new Error('Dream not found or access denied'); e.status = 404; throw e;
  }

  // Get the active generation
  const { data: gen } = await supabaseAdmin
    .from('video_generations')
    .select('*')
    .eq('dream_id', dreamId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!gen) {
    const e = new Error('No video generation found. Upload scene videos first.'); e.status = 400; throw e;
  }

  // Get all completed scene videos, ordered by scene_number
  const { data: sceneVids } = await supabaseAdmin
    .from('scene_videos')
    .select('*')
    .eq('generation_id', gen.id)
    .eq('status', 'completed')
    .order('scene_number');

  if (!sceneVids?.length) {
    const e = new Error('No scene videos uploaded yet.'); e.status = 400; throw e;
  }

  // Mark assembling
  await supabaseAdmin
    .from('video_generations')
    .update({ status: 'processing' })
    .eq('id', gen.id);

  const tmpFiles = [];

  try {
    // Download each scene video to a temp file
    const localPaths = [];

    for (const sv of sceneVids) {
      // Get a fresh signed URL for download
      const { data: freshSigned } = await supabaseAdmin.storage
        .from('dream-videos')
        .createSignedUrl(sv.storage_path, 300); // 5 min for download

      if (!freshSigned?.signedUrl) throw new Error(`Could not get URL for scene ${sv.scene_number}`);

      // Download via Node fetch
      const resp = await fetch(freshSigned.signedUrl);
      if (!resp.ok) throw new Error(`Download failed for scene ${sv.scene_number}: ${resp.status}`);

      const arrayBuf = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      const tmpPath = path.join(os.tmpdir(), `scene_${sv.scene_number}_${Date.now()}.mp4`);
      fs.writeFileSync(tmpPath, buffer);
      tmpFiles.push(tmpPath);
      localPaths.push(tmpPath);
    }

    // FFmpeg concatenate
    const finalTmpPath = path.join(os.tmpdir(), `final_${dreamId}_${Date.now()}.mp4`);
    tmpFiles.push(finalTmpPath);

    await concatenateVideos(localPaths, finalTmpPath);

    // Upload final to Supabase Storage
    const finalStoragePath = `${userId}/${dreamId}/final.mp4`;
    const { url: finalUrl } = await uploadFileToStorage(finalTmpPath, finalStoragePath);

    // Calculate total duration
    const totalDuration = sceneVids.reduce((sum, s) => sum + (s.duration || 6), 0);

    // Mark generation complete
    await supabaseAdmin
      .from('video_generations')
      .update({
        status: 'completed',
        final_video_url: finalUrl,
        storage_path: finalStoragePath,
        duration: totalDuration,
        completed_scenes: sceneVids.length,
      })
      .eq('id', gen.id);

    return {
      finalVideoUrl: finalUrl,
      duration: totalDuration,
      scenesAssembled: sceneVids.length,
    };
  } catch (err) {
    await supabaseAdmin
      .from('video_generations')
      .update({ status: 'failed', error_message: err.message })
      .eq('id', gen.id);
    throw err;
  } finally {
    for (const f of tmpFiles) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
    }
  }
}

// ─── Existing helpers (kept for getDreamVideoStatus / refreshVideoUrl) ─────────

async function getDreamVideoStatus(dreamId, userId) {
  const { data } = await supabaseAdmin
    .from('video_generations')
    .select('*')
    .eq('dream_id', dreamId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    status: data.status,
    finalVideoUrl: data.final_video_url,
    duration: data.duration,
    totalScenes: data.total_scenes,
    completedScenes: data.completed_scenes,
    errorMessage: data.error_message,
    createdAt: data.created_at,
  };
}

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

  const { data: signed } = await supabaseAdmin.storage
    .from('dream-videos')
    .createSignedUrl(gen.storage_path, 60 * 60 * 24 * 7);

  return signed?.signedUrl || null;
}

module.exports = {
  uploadSceneVideo,
  getSceneUploadStatus,
  assembleFinalVideo,
  getDreamVideoStatus,
  refreshVideoUrl,
};
