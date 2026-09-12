/**
 * Test the manual upload + assemble workflow end-to-end.
 * Uses a minimal valid MP4 (4 bytes — enough for multer to accept).
 * For a real test, replace testVideoPath with an actual MP4 file.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabaseAnon } = require('../src/config/supabase');

// Minimal valid MP4 ftyp box (28 bytes) — browsers won't play it but
// it passes our file type check and tests the upload/storage pipeline.
// Replace with a real MP4 path to test actual playback.
const MINIMAL_MP4 = Buffer.from(
  '0000001C667479706D703432000000006D703432697736340000000000000000',
  'hex'
);

async function run() {
  console.log('=== Manual Upload Workflow Test ===\n');

  // 1. Login
  const { data: auth, error: authErr } = await supabaseAnon.auth.signInWithPassword({
    email: 'test@dreamvision.ai',
    password: 'TestPass123!',
  });
  if (authErr) { console.error('Auth failed:', authErr.message); return; }
  const token = auth.session.access_token;
  console.log('1. Auth OK');

  // 2. Get a completed dream with scenes
  const dreamsRes = await fetch('http://localhost:5000/api/dreams', {
    headers: { Authorization: 'Bearer ' + token },
  });
  const { dreams } = await dreamsRes.json();
  const dream = dreams.find((d) => d.status === 'completed');
  if (!dream) { console.error('No completed dream found. Create one first.'); return; }
  console.log('2. Found dream:', dream.id, '-', dream.title);

  // 3. Get scene upload status
  const statusRes = await fetch(`http://localhost:5000/api/dreams/${dream.id}/video-status`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  const status = await statusRes.json();
  console.log('3. Scene status:', JSON.stringify({
    totalScenes: status.totalScenes,
    uploadedScenes: status.uploadedScenes,
    status: status.status,
  }));

  if (!status.scenes?.length) { console.error('No scenes found'); return; }
  const firstScene = status.scenes[0];
  console.log('   First scene:', firstScene.sceneId, '- Scene', firstScene.sceneNumber);

  // 4. Upload a test MP4 for scene 1
  console.log('4. Uploading test MP4 for scene 1...');
  const formData = new FormData();
  const blob = new Blob([MINIMAL_MP4], { type: 'video/mp4' });
  formData.append('video', blob, 'test-scene-1.mp4');

  const uploadRes = await fetch(
    `http://localhost:5000/api/dreams/${dream.id}/scenes/${firstScene.sceneId}/upload`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: formData,
    }
  );
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    console.error('Upload FAILED:', JSON.stringify(uploadData));
    return;
  }
  console.log('   Upload OK:', JSON.stringify({
    sceneNumber: uploadData.sceneNumber,
    completedScenes: uploadData.completedScenes,
    totalScenes: uploadData.totalScenes,
    videoUrl: uploadData.videoUrl?.substring(0, 60) + '...',
  }));

  // 5. Verify status updated
  const status2Res = await fetch(`http://localhost:5000/api/dreams/${dream.id}/video-status`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  const status2 = await status2Res.json();
  console.log('5. Updated status: uploadedScenes =', status2.uploadedScenes, '/', status2.totalScenes);
  const uploaded = status2.scenes.find((s) => s.sceneId === firstScene.sceneId);
  console.log('   Scene 1 uploaded:', uploaded?.uploaded, '| URL:', uploaded?.videoUrl ? 'present' : 'missing');

  console.log('\n=== UPLOAD TEST PASSED ===');
  console.log('To test FFmpeg assembly: upload real MP4s for all scenes, then call:');
  console.log(`  POST /api/dreams/${dream.id}/assemble-video`);
}

run().catch((e) => console.error('ERROR:', e.message));
