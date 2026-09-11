const FalKlingProvider = require('./FalKlingProvider');

/**
 * Factory — returns the active video provider based on env config.
 * Add new providers here without changing the pipeline.
 */
function getVideoProvider() {
  const provider = (process.env.VIDEO_PROVIDER || 'fal-kling').toLowerCase();
  switch (provider) {
    case 'fal-kling':
    default:
      return new FalKlingProvider();
  }
}

module.exports = { getVideoProvider };
