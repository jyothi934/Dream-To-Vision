/**
 * VideoProvider — abstract base class / interface.
 * Swap out the concrete provider without touching the pipeline.
 */
class VideoProvider {
  get name() { throw new Error('name not implemented'); }

  /**
   * Submit a video generation job.
   * @param {object} params - { prompt, negativePrompt, duration, aspectRatio }
   * @returns {Promise<string>} providerJobId
   */
  async submitJob(params) { throw new Error('submitJob not implemented'); }

  /**
   * Poll the job status.
   * @param {string} jobId
   * @returns {Promise<{status: 'pending'|'processing'|'completed'|'failed', progress: number}>}
   */
  async getStatus(jobId) { throw new Error('getStatus not implemented'); }

  /**
   * Get the video URL once completed.
   * @param {string} jobId
   * @returns {Promise<string>} video URL
   */
  async getVideoUrl(jobId) { throw new Error('getVideoUrl not implemented'); }

  /**
   * Cancel a running job (if supported).
   * @param {string} jobId
   */
  async cancelJob(jobId) { /* optional */ }
}

module.exports = VideoProvider;
