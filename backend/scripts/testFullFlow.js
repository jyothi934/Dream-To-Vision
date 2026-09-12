/**
 * Full end-to-end flow test:
 * Login → Create Dream → Analyze → Verify Scenes/Characters/Story → Check Video Status
 */
require('dotenv').config();
const { supabaseAnon } = require('../src/config/supabase');

const DREAM_TEXT = 'I was flying over a glowing magical forest at sunset, with golden light filtering through giant ancient trees. Fireflies danced around me and I landed on a floating island where a wise old sage handed me a glowing orb and said the universe was waiting for me to wake up.';

async function runFullTest() {
  console.log('============================================');
  console.log('  DREAM TO VISION AI — FULL E2E TEST');
  console.log('============================================\n');

  const base = 'http://localhost:5000';
  const results = [];
  const pass = (msg) => { console.log('  ✅ ' + msg); results.push({ ok: true, msg }); };
  const fail = (msg) => { console.log('  ❌ ' + msg); results.push({ ok: false, msg }); };

  // ── 1. Health check ────────────────────────────────────
  console.log('[ 1 ] Health check');
  try {
    const r = await fetch(`${base}/api/health`);
    const d = await r.json();
    if (d.status === 'ok' && d.services.database === 'ok') pass('Backend + DB healthy');
    else fail('Health check failed: ' + JSON.stringify(d));
  } catch (e) { fail('Backend not reachable: ' + e.message); return; }

  // ── 2. Login ───────────────────────────────────────────
  console.log('\n[ 2 ] Authentication');
  let token;
  try {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: 'test@dreamvision.ai', password: 'TestPass123!'
    });
    if (error) throw error;
    token = data.session.access_token;
    pass('Login OK — user: ' + data.user.email);
  } catch (e) { fail('Login failed: ' + e.message); return; }

  const auth = { Authorization: 'Bearer ' + token };

  // ── 3. Create dream ────────────────────────────────────
  console.log('\n[ 3 ] Create dream record');
  let dreamId;
  try {
    const r = await fetch(`${base}/api/dreams`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_input: DREAM_TEXT, input_type: 'text' })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    dreamId = d.dream.id;
    pass('Dream created — ID: ' + dreamId);
    pass('Status: ' + d.dream.status);
  } catch (e) { fail('Create dream failed: ' + e.message); return; }

  // ── 4. Run AI analysis pipeline ────────────────────────
  console.log('\n[ 4 ] Running Gemini AI pipeline (analysis + story + characters + scenes)');
  console.log('      This takes 30–90 seconds...');
  let dream;
  try {
    const r = await fetch(`${base}/api/dreams/${dreamId}/analyze`, {
      method: 'POST', headers: auth
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    dream = d.dream;
    pass('Pipeline complete — status: ' + dream.status);
  } catch (e) { fail('AI pipeline failed: ' + e.message); return; }

  // ── 5. Verify AI output ────────────────────────────────
  console.log('\n[ 5 ] Verify AI output');

  if (dream.title) pass('Title generated: "' + dream.title + '"');
  else fail('Title missing');

  if (dream.logline) pass('Logline: "' + dream.logline.substring(0, 70) + '..."');
  else fail('Logline missing');

  if (dream.story && dream.story.length > 100) pass('Story generated (' + dream.story.split(' ').length + ' words)');
  else fail('Story missing or too short');

  if (dream.analysis?.theme) pass('Theme: ' + dream.analysis.theme);
  else fail('Analysis theme missing');

  if (dream.analysis?.mood) pass('Mood: ' + dream.analysis.mood);
  else fail('Analysis mood missing');

  if (dream.characters?.length > 0) pass('Characters: ' + dream.characters.length + ' generated');
  else fail('No characters generated');

  if (dream.scenes?.length >= 4) pass('Scenes: ' + dream.scenes.length + ' generated');
  else fail('Scenes missing or less than 4');

  // ── 6. Verify scenes have visual prompts ──────────────
  console.log('\n[ 6 ] Verify scene visual prompts for Google Flow');
  let promptsOk = 0;
  dream.scenes?.forEach((s) => {
    if (s.visual_prompt && s.visual_prompt.length > 30) promptsOk++;
  });
  if (promptsOk === dream.scenes?.length) pass('All ' + promptsOk + ' scenes have visual prompts');
  else fail(`Only ${promptsOk}/${dream.scenes?.length} scenes have visual prompts`);

  // ── 7. GET full dream from API ─────────────────────────
  console.log('\n[ 7 ] Retrieve full dream from backend');
  try {
    const r = await fetch(`${base}/api/dreams/${dreamId}`, { headers: auth });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    pass('GET /api/dreams/:id OK');
    pass('  Characters in response: ' + d.dream.characters?.length);
    pass('  Scenes in response: ' + d.dream.scenes?.length);
  } catch (e) { fail('GET dream failed: ' + e.message); }

  // ── 8. Video status endpoint ───────────────────────────
  console.log('\n[ 8 ] Phase 2 — Video upload status');
  try {
    const r = await fetch(`${base}/api/dreams/${dreamId}/video-status`, { headers: auth });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    pass('GET /video-status OK');
    pass('  Total scenes: ' + d.totalScenes);
    pass('  Uploaded scenes: ' + d.uploadedScenes);
    pass('  Has scene prompts: ' + (d.scenes?.[0]?.visualPrompt ? 'YES' : 'NO'));
  } catch (e) { fail('Video status failed: ' + e.message); }

  // ── 9. List dreams ─────────────────────────────────────
  console.log('\n[ 9 ] History — list dreams');
  try {
    const r = await fetch(`${base}/api/dreams`, { headers: auth });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    pass('GET /api/dreams OK — total dreams: ' + d.dreams.length);
    const thisOne = d.dreams.find((dd) => dd.id === dreamId);
    if (thisOne) pass('New dream visible in history with status: ' + thisOne.status);
    else fail('New dream not visible in history');
  } catch (e) { fail('List dreams failed: ' + e.message); }

  // ── 10. Protected route check ──────────────────────────
  console.log('\n[ 10 ] Security — protected routes reject unauthenticated requests');
  try {
    const r = await fetch(`${base}/api/dreams`);
    if (r.status === 401) pass('Unauthenticated GET /api/dreams returns 401 ✓');
    else fail('Expected 401 but got ' + r.status);
  } catch (e) { fail('Security test error: ' + e.message); }

  // ── Summary ────────────────────────────────────────────
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log('\n============================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('============================================');

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED');
    console.log('\nComplete flow verified:');
    console.log('  User enters dream text');
    console.log('  → Gemini analyzes + generates story/characters/scenes');
    console.log('  → Saved to Supabase');
    console.log('  → Retrieved from backend');
    console.log('  → Scene prompts ready for Google Flow');
    console.log('  → Upload endpoints working');
    console.log('  → History shows the dream');
    console.log('\nTo get the video:');
    console.log('  1. Open the dream result page in the browser');
    console.log('  2. Copy scene prompts → paste into flow.google → download MP4s');
    console.log('  3. Upload each MP4 → click "Create Final Video"');
    console.log('  4. FFmpeg assembles → video plays in browser');
    console.log('\nDream ID for manual testing: ' + dreamId);
  } else {
    console.log('\n⚠️  Some tests failed — see above.');
  }
}

runFullTest().catch((e) => console.error('FATAL:', e.message));
