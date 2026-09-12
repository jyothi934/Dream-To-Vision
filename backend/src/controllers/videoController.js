const {
  uploadSceneVideo,
  getSceneUploadStatus,
  assembleFinalVideo,
  getDreamVideoStatus,
  refreshVideoUrl,
} = require('../services/videoService');

// POST /api/dreams/:dreamId/scenes/:sceneId/upload
// Accepts multipart/form-data with field "video"
async function uploadSceneVideoHandler(req, res, next) {
  try {
    const { dreamId, sceneId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded. Send a multipart/form-data request with field "video".' });
    }

    const allowedMimes = ['video/mp4', 'video/quicktime', 'video/webm', 'application/octet-stream'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only MP4, MOV, or WebM video files are accepted.' });
    }

    // 200MB max
    if (req.file.size > 200 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large. Maximum size is 200MB per scene.' });
    }

    const result = await uploadSceneVideo(
      dreamId,
      sceneId,
      userId,
      req.file.buffer,
      req.file.originalname
    );

    return res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// GET /api/dreams/:dreamId/video-status
async function getSceneUploadStatusHandler(req, res, next) {
  try {
    const { dreamId } = req.params;
    const userId = req.user.id;
    const status = await getSceneUploadStatus(dreamId, userId);
    return res.json(status);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// POST /api/dreams/:dreamId/assemble-video
async function assembleVideoHandler(req, res, next) {
  try {
    const { dreamId } = req.params;
    const userId = req.user.id;
    const result = await assembleFinalVideo(dreamId, userId);
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

// GET /api/dreams/:id/video  (kept for backwards compat)
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
  uploadSceneVideoHandler,
  getSceneUploadStatusHandler,
  assembleVideoHandler,
  getDreamVideoHandler,
  refreshVideoUrlHandler,
};
