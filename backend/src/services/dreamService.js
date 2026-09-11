const { supabaseAdmin } = require('../config/supabase');
const { analyzeDream, generateStory, generateCharacters, generateScenes } = require('./geminiService');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// CREATE DREAM RECORD
// ============================================================
async function createDream(userId, rawInput, inputType = 'text') {
  const { data, error } = await supabaseAdmin
    .from('dreams')
    .insert({
      user_id: userId,
      raw_input: rawInput,
      input_type: inputType,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create dream: ${error.message}`);
  return data;
}

// ============================================================
// GET USER'S DREAMS (list)
// ============================================================
async function getUserDreams(userId) {
  const { data, error } = await supabaseAdmin
    .from('dreams')
    .select('id, title, status, input_type, logline, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch dreams: ${error.message}`);
  return data;
}

// ============================================================
// GET SINGLE DREAM (full detail)
// ============================================================
async function getDreamById(dreamId, userId) {
  // Verify ownership
  const { data: dream, error } = await supabaseAdmin
    .from('dreams')
    .select('*')
    .eq('id', dreamId)
    .eq('user_id', userId)
    .single();

  if (error || !dream) {
    const err = new Error('Dream not found or access denied');
    err.status = 404;
    throw err;
  }

  // Fetch related characters
  const { data: characters } = await supabaseAdmin
    .from('characters')
    .select('*')
    .eq('dream_id', dreamId)
    .order('created_at');

  // Fetch related scenes
  const { data: scenes } = await supabaseAdmin
    .from('scenes')
    .select('*')
    .eq('dream_id', dreamId)
    .order('scene_number');

  return { ...dream, characters: characters || [], scenes: scenes || [] };
}

// ============================================================
// DELETE DREAM
// ============================================================
async function deleteDream(dreamId, userId) {
  // Verify ownership before deleting
  const { data: dream } = await supabaseAdmin
    .from('dreams')
    .select('id')
    .eq('id', dreamId)
    .eq('user_id', userId)
    .single();

  if (!dream) {
    const err = new Error('Dream not found or access denied');
    err.status = 404;
    throw err;
  }

  const { error } = await supabaseAdmin
    .from('dreams')
    .delete()
    .eq('id', dreamId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete dream: ${error.message}`);
  return true;
}

// ============================================================
// FULL AI ANALYSIS PIPELINE
// ============================================================
async function runAnalysisPipeline(dreamId, userId) {
  // Fetch dream and verify ownership
  const { data: dream, error: fetchError } = await supabaseAdmin
    .from('dreams')
    .select('*')
    .eq('id', dreamId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !dream) {
    const err = new Error('Dream not found or access denied');
    err.status = 404;
    throw err;
  }

  // Set status to processing
  await supabaseAdmin
    .from('dreams')
    .update({ status: 'processing' })
    .eq('id', dreamId);

  // Create a generation job record
  const { data: job } = await supabaseAdmin
    .from('generation_jobs')
    .insert({
      dream_id: dreamId,
      job_type: 'full_analysis',
      status: 'processing',
      progress: 0,
    })
    .select()
    .single();

  try {
    // ── Step 1: Analyze dream ─────────────────────────────
    await updateJobProgress(job?.id, 10);
    const analysis = await analyzeDream(dream.raw_input);

    await supabaseAdmin
      .from('dreams')
      .update({ analysis, title: analysis.title })
      .eq('id', dreamId);

    // ── Step 2: Generate story ────────────────────────────
    await updateJobProgress(job?.id, 35);
    await sleep(3000); // brief pause between AI calls
    const storyData = await generateStory(dream.raw_input, analysis);

    await supabaseAdmin
      .from('dreams')
      .update({
        title: storyData.title || analysis.title,
        story: storyData.story,
        logline: storyData.logline,
      })
      .eq('id', dreamId);

    // ── Step 3: Generate characters ───────────────────────
    await updateJobProgress(job?.id, 60);
    await sleep(3000);
    const characters = await generateCharacters(dream.raw_input, analysis);

    // Delete previous characters for this dream (re-run scenario)
    await supabaseAdmin.from('characters').delete().eq('dream_id', dreamId);

    if (characters.length > 0) {
      const characterRows = characters.map((c) => ({
        dream_id: dreamId,
        name: c.name || 'Unknown',
        role: c.role || 'supporting',
        age_range: c.ageRange || c.age_range || '',
        appearance: c.appearance || '',
        personality: c.personality || '',
        clothing: c.clothing || '',
        visual_description: c.visualDescription || c.visual_description || '',
      }));

      const { error: charError } = await supabaseAdmin
        .from('characters')
        .insert(characterRows);

      if (charError) {
        console.error('Character insert error:', charError.message);
      }
    }

    // ── Step 4: Generate scenes ───────────────────────────
    await updateJobProgress(job?.id, 80);
    await sleep(3000);
    const scenes = await generateScenes(dream.raw_input, analysis, storyData);

    // Delete previous scenes
    await supabaseAdmin.from('scenes').delete().eq('dream_id', dreamId);

    if (scenes.length > 0) {
      const sceneRows = scenes.map((s) => ({
        dream_id: dreamId,
        scene_number: s.sceneNumber,
        title: s.title || `Scene ${s.sceneNumber}`,
        description: s.description || '',
        duration: s.duration || 5,
        visual_prompt: s.visualPrompt || s.visual_prompt || '',
        camera_movement: s.cameraMovement || s.camera_movement || '',
        camera_angle: s.cameraAngle || s.camera_angle || '',
        lighting: s.lighting || '',
        mood: s.mood || '',
        environment: s.environment || '',
        characters: s.characters || [],
      }));

      const { error: sceneError } = await supabaseAdmin
        .from('scenes')
        .insert(sceneRows);

      if (sceneError) {
        console.error('Scene insert error:', sceneError.message);
      }
    }

    // ── Step 5: Mark complete ─────────────────────────────
    await supabaseAdmin
      .from('dreams')
      .update({ status: 'completed' })
      .eq('id', dreamId);

    if (job?.id) {
      await supabaseAdmin
        .from('generation_jobs')
        .update({ status: 'completed', progress: 100 })
        .eq('id', job.id);
    }

    // Return full result
    return getDreamById(dreamId, userId);
  } catch (err) {
    console.error('Pipeline error:', err.message);

    // Mark as failed
    await supabaseAdmin
      .from('dreams')
      .update({ status: 'failed' })
      .eq('id', dreamId);

    if (job?.id) {
      await supabaseAdmin
        .from('generation_jobs')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', job.id);
    }

    throw err;
  }
}

async function updateJobProgress(jobId, progress) {
  if (!jobId) return;
  await supabaseAdmin
    .from('generation_jobs')
    .update({ progress })
    .eq('id', jobId);
}

module.exports = { createDream, getUserDreams, getDreamById, deleteDream, runAnalysisPipeline };
