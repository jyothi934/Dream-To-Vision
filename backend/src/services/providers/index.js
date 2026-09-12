const FalKlingProvider = require('./FalKlingProvider');

/**
 * Factory — returns the active video provider based on env config.
 *
 * IMPORTANT: fal-kling is DISABLED by default because it requires paid credits.
 * The Google Flow manual-upload workflow does NOT use this provider.
 * Keep this file so the provider can be re-enabled later by setting:
 *   VIDEO_PROVIDER=fal-kling
 *   FAL_KEY=your_key
 * in backend/.env
 */
function getVideoProvider() {
  const provider = (process.env.VIDEO_PROVIDER || 'disabled').toLowerCase();
  switch (provider) {
    case 'fal-kling':
      return new FalKlingProvider();
    default:
      throw new Error(
        'No video provider configured. Set VIDEO_PROVIDER=fal-kling in .env to enable automated generation.'
      );
  }
}

module.exports = { getVideoProvider };
