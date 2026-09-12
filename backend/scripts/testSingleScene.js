/**
 * Single-scene video generation test.
 * Uses fal-ai/ltx-2.3/text-to-video/fast
 * FAL_KEY loaded from backend/.env — never printed.
 */
require('dotenv').config();
const { fal } = require('@fal-ai/client');

if (!process.env.FAL_KEY) {
  console.error('ERROR: FAL_KEY not found in .env');
  process.exit(1);
}

// Key is loaded but never printed — only confirm it's present
console.log('FAL_KEY loaded: YES (not printing value)');

fal.config({ credentials: process.env.FAL_KEY });

const MODEL = 'fal-ai/ltx-2.3/text-to-video/fast';

const TEST_PROMPT = `Cinematic wide shot of a magical forest at golden sunset. A person walks slowly along a glowing forest path surrounded by luminous flowers in soft purple and gold hues. Fireflies drift lazily through warm amber light between ancient towering trees. Volumetric rays of sunlight pierce through the canopy. Soft bokeh, dreamlike atmosphere, premium cinematic realism, 16:9 composition.`;

async function runTest() {
  console.log('\n=== FAL.AI SINGLE SCENE TEST ===');
  console.log('Model:', MODEL);
  console.log('Duration: 6s | Resolution: 1080p | Aspect: 16:9');
  console.log('Prompt:', TEST_PROMPT.substring(0, 80) + '...');
  console.log('\nStep 1: Submitting job to fal.ai queue...');

  let requestId;
  try {
    const { request_id } = await fal.queue.submit(MODEL, {
      input: {
        prompt: TEST_PROMPT,
        duration: 6,
        resolution: '1080p',
        aspect_ratio: '16:9',
        fps: 25,
        generate_audio: false,
      },
    });
    requestId = request_id;
    console.log('Job submitted. Request ID:', requestId);
  } catch (err) {
    console.error('SUBMIT FAILED:', err.message);
    if (err.message.includes('Forbidden') || err.message.includes('403')) {
      console.error('\nAccount has insufficient credits.');
      console.error('Add credits at: https://fal.ai/billing');
    }
    process.exit(1);
  }

  // Poll until done
  console.log('\nStep 2: Polling status...');
  const start = Date.now();
  const MAX_WAIT = 10 * 60 * 1000; // 10 minutes

  while (Date.now() - start < MAX_WAIT) {
    await new Promise(r => setTimeout(r, 8000));

    const elapsed = Math.round((Date.now() - start) / 1000);
    try {
      const status = await fal.queue.status(MODEL, { requestId, logs: false });
      console.log(`  [${elapsed}s] Status: ${status.status}`);

      if (status.status === 'COMPLETED') {
        console.log('\nStep 3: Fetching result...');
        const result = await fal.queue.result(MODEL, { requestId });
        const videoUrl = result?.data?.video?.url;

        if (!videoUrl) {
          console.error('ERROR: No video URL in result:', JSON.stringify(result?.data));
          process.exit(1);
        }

        console.log('\n=== SUCCESS ===');
        console.log('Video URL:', videoUrl);
        console.log('Duration:', result?.data?.video?.duration, 's');
        console.log('Resolution:', result?.data?.video?.width, 'x', result?.data?.video?.height);
        console.log('File size:', result?.data?.video?.file_size, 'bytes');
        console.log('\nTest the URL in browser: Open the URL above to verify MP4 plays.');
        return;
      }

      if (status.status === 'FAILED') {
        console.error('GENERATION FAILED:', JSON.stringify(status));
        process.exit(1);
      }
    } catch (pollErr) {
      console.log(`  [${elapsed}s] Poll error (will retry): ${pollErr.message}`);
    }
  }

  console.error('TIMEOUT: Generation took longer than 10 minutes.');
  process.exit(1);
}

runTest();
