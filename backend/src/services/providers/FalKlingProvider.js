const { fal } = require('@fal-ai/client');
const VideoProvider = require('./VideoProvider');

// LTX 2.3 Fast — 1080p, 6-20s, works with standard fal.ai keys
const MODEL_ID = 'fal-ai/ltx-2.3/text-to-video/fast';

/**
 * Concrete provider: fal.ai — LTX 2.3 Fast Text-to-Video
 * Free tier accessible, 1080p 16:9, 6-20 second clips
 * Docs: https://fal.ai/models/fal-ai/ltx-2.3/text-to-video/fast/api
 */
class FalKlingProvider extends VideoProvider {
  constructor() {
    super();
    if (!process.env.FAL_KEY) {
      throw new Error('Missing FAL_KEY environment variable');
    }
    fal.config({ credentials: process.env.FAL_KEY });
  }

  get name() { return 'fal-ltx'; }

  /**
   * Submit a generation job to fal.ai queue.
   * Returns immediately with a request_id.
   */
  async submitJob({ prompt, negativePrompt, duration, aspectRatio }) {
    // LTX 2.3 supports 6, 8, 10 for standard duration
    const dur = duration >= 10 ? 10 : duration >= 8 ? 8 : 6;

    const { request_id } = await fal.queue.submit(MODEL_ID, {
      input: {
        prompt,
        duration: dur,
        resolution: '1080p',
        aspect_ratio: aspectRatio || '16:9',
        fps: 25,
        generate_audio: false, // skip audio for faster generation
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

    const map = {
      IN_QUEUE:    { status: 'pending',    progress: 5  },
      IN_PROGRESS: { status: 'processing', progress: 50 },
      COMPLETED:   { status: 'completed',  progress: 100 },
      FAILED:      { status: 'failed',     progress: 0  },
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
