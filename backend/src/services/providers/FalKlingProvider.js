const { fal } = require('@fal-ai/client');
const VideoProvider = require('./VideoProvider');

const MODEL_ID = 'fal-ai/kling-video/v1/standard/text-to-video';

/**
 * Concrete provider: fal.ai — Kling v1 Standard Text-to-Video
 * Docs: https://fal.ai/models/fal-ai/kling-video/v1/standard/text-to-video/api
 */
class FalKlingProvider extends VideoProvider {
  constructor() {
    super();
    if (!process.env.FAL_KEY) {
      throw new Error('Missing FAL_KEY environment variable');
    }
    fal.config({ credentials: process.env.FAL_KEY });
  }

  get name() { return 'fal-kling'; }

  /**
   * Submit a generation job to fal.ai queue.
   * Returns immediately with a request_id.
   */
  async submitJob({ prompt, negativePrompt, duration, aspectRatio }) {
    // Kling v1 duration must be '5' or '10' (string)
    const dur = duration >= 10 ? '10' : '5';

    const { request_id } = await fal.queue.submit(MODEL_ID, {
      input: {
        prompt,
        negative_prompt: negativePrompt || 'blur, distort, low quality, watermark, text, logo, subtitles, cartoon, anime, distorted anatomy, extra limbs',
        duration: dur,
        aspect_ratio: aspectRatio || '16:9',
        cfg_scale: 0.5,
      },
    });

    return request_id;
  }

  /**
   * Poll fal.ai queue status for a job.
   */
  async getStatus(jobId) {
    const status = await fal.queue.status(MODEL_ID, {
      requestId: jobId,
      logs: false,
    });

    // fal.ai statuses: IN_QUEUE, IN_PROGRESS, COMPLETED
    const map = {
      IN_QUEUE: { status: 'pending', progress: 5 },
      IN_PROGRESS: { status: 'processing', progress: 50 },
      COMPLETED: { status: 'completed', progress: 100 },
    };

    return map[status.status] || { status: 'processing', progress: 10 };
  }

  /**
   * Fetch the final video URL once completed.
   */
  async getVideoUrl(jobId) {
    const result = await fal.queue.result(MODEL_ID, { requestId: jobId });
    const url = result?.data?.video?.url;
    if (!url) throw new Error('fal.ai returned no video URL');
    return url;
  }

  async cancelJob(jobId) {
    try {
      await fal.queue.cancel(MODEL_ID, { requestId: jobId });
    } catch {
      // cancellation is best-effort
    }
  }
}

module.exports = FalKlingProvider;
