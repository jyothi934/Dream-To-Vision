const {
  startVideoGeneration,
  getGenerationProgress,
  getDreamVideoStatus,
  getSceneVideos,
  cancelGeneration,
  refreshVideoUrl,
} = require('../services/videoService');

// POST /api/dreams/:id/generate-video
async function generateVideoHandler(req, res, next) {
  try {
    const { id: dreamId } = req.params;
    const userId = req.user.id;
    const result = await startVideoGeneration(dreamId, userId);
    return res.status(202).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// GET /api/video-generations/:id
async function getProgressHandler(req, res, next) {
  try {
    const { id: generationId } = req.params;
    const userId = req.user.id;
    const progress = await getGenerationProgress(generationId, userId);
    return res.json(progress);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// GET /api/dreams/:id/video
async function getDreamVideoHandler(req, res, next) {
  try {
    const { id: dreamId } = req.params;
    const userId = req.user.id;
    const video = await getDreamVideoStatus(dreamId, userId);
    if (!video) return res.json({ status: 'none' });
    return res.json(video);
  } catch (err) {
    next(err);
  }
}

// GET /api/video-generations/:id/scenes
async function getSceneVideosHandler(req, res, next) {
  try {
    const { id: generationId } = req.params;
    const userId = req.user.id;
    const scenes = await getSceneVideos(generationId, userId);
    return res.json({ scenes });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// POST /api/video-generations/:id/cancel
async function cancelGenerationHandler(req, res, next) {
  try {
    const { id: generationId } = req.params;
    const userId = req.user.id;
    const result = await cancelGeneration(generationId, userId);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// GET /api/dreams/:id/video/refresh
async function refreshVideoUrlHandler(req, res, next) {
  try {
    const { id: dreamId } = req.params;
    const userId = req.user.id;
    const url = await refreshVideoUrl(dreamId, userId);
    if (!url) return res.status(404).json({ error: 'No completed video found' });
    return res.json({ videoUrl: url });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateVideoHandler,
  getProgressHandler,
  getDreamVideoHandler,
  getSceneVideosHandler,
  cancelGenerationHandler,
  refreshVideoUrlHandler,
};
