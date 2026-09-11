const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { param } = require('express-validator');
const { validateRequest } = require('../utils/validateRequest');
const {
  generateVideoHandler,
  getProgressHandler,
  getDreamVideoHandler,
  getSceneVideosHandler,
  cancelGenerationHandler,
  refreshVideoUrlHandler,
} = require('../controllers/videoController');

const uuidParam = (name) => param(name).isUUID().withMessage(`Invalid ${name}`);

// All video routes require authentication
router.use(authenticate);

// Dream-scoped routes
router.post('/dreams/:id/generate-video',  uuidParam('id'), validateRequest, generateVideoHandler);
router.get('/dreams/:id/video',            uuidParam('id'), validateRequest, getDreamVideoHandler);
router.get('/dreams/:id/video/refresh',    uuidParam('id'), validateRequest, refreshVideoUrlHandler);

// Generation-scoped routes
router.get('/video-generations/:id',         uuidParam('id'), validateRequest, getProgressHandler);
router.get('/video-generations/:id/scenes',  uuidParam('id'), validateRequest, getSceneVideosHandler);
router.post('/video-generations/:id/cancel', uuidParam('id'), validateRequest, cancelGenerationHandler);

module.exports = router;
