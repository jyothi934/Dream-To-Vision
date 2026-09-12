require('dotenv').config();
const { fal } = require('@fal-ai/client');

fal.config({ credentials: process.env.FAL_KEY });

console.log('Testing FAL key with LTX 2.3 Fast model...');
console.log('FAL_KEY prefix:', process.env.FAL_KEY?.substring(0, 12) + '...');

fal.queue.submit('fal-ai/ltx-2.3/text-to-video/fast', {
  input: {
    prompt: 'A child floating on a soft glowing cloud above a magical sleeping town at twilight, cinematic wide shot, pastel colors',
    duration: 6,
    aspect_ratio: '16:9',
    resolution: '1080p',
    generate_audio: false,
  },
}).then(r => {
  console.log('SUCCESS! Job submitted.');
  console.log('request_id:', r.request_id);
  console.log('\nModel works with your FAL key. Video generation will work now.');
}).catch(e => {
  console.log('FAILED:', e.message);
  if (e.message.includes('Forbidden') || e.message.includes('403')) {
    console.log('\nThis key does not have access to this model either.');
    console.log('Try adding credits at: https://fal.ai/billing');
  } else if (e.message.includes('Unauthorized') || e.message.includes('401')) {
    console.log('\nInvalid FAL key. Check https://fal.ai/dashboard/keys');
  }
});
