const router = require('express').Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { param } = require('express-validator');
const { validateRequest } = require('../utils/validateRequest');
const {
  uploadSceneVideoHandler,
  getSceneUploadStatusHandler,
  assembleVideoHandler,
  getDreamVideoHandler,
  refreshVideoUrlHandler,
} = require('../controllers/videoController');

// Multer — memory storage (buffer sent straight to Supabase)
// 200MB limit per upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'application/octet-stream'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only MP4, MOV, or WebM video files are accepted.'));
    }
  },
});

const uuidParam = (name) => param(name).isUUID().withMessage(`Invalid ${name}`);

// All video routes require authentication
router.use(authenticate);

// ── Google Flow Manual Upload Workflow ─────────────────────────
// Upload one MP4 for a specific scene
router.post(
  '/dreams/:dreamId/scenes/:sceneId/upload',
  uuidParam('dreamId'),
  uuidParam('sceneId'),
  validateRequest,
  upload.single('video'),
  uploadSceneVideoHandler
);

// Get upload status for all scenes of a dream
router.get(
  '/dreams/:dreamId/video-status',
  uuidParam('dreamId'),
  validateRequest,
  getSceneUploadStatusHandler
);

// Assemble all uploaded scene clips into final video via FFmpeg
router.post(
  '/dreams/:dreamId/assemble-video',
  uuidParam('dreamId'),
  validateRequest,
  assembleVideoHandler
);

// ── Backwards-compatible routes ────────────────────────────────
router.get('/dreams/:id/video',         uuidParam('id'), validateRequest, getDreamVideoHandler);
router.get('/dreams/:id/video/refresh', uuidParam('id'), validateRequest, refreshVideoUrlHandler);

module.exports = router;
