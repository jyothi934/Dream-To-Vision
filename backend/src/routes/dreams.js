const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { createDreamValidator, dreamIdValidator } = require('../validators/dreamValidators');
const { validateRequest } = require('../utils/validateRequest');
const {
  createDreamHandler,
  getDreamsHandler,
  getDreamHandler,
  deleteDreamHandler,
  analyzeDreamHandler,
} = require('../controllers/dreamController');

// All dream routes require authentication
router.use(authenticate);

router.post('/', createDreamValidator, validateRequest, createDreamHandler);
router.get('/', getDreamsHandler);
router.get('/:id', dreamIdValidator, validateRequest, getDreamHandler);
router.delete('/:id', dreamIdValidator, validateRequest, deleteDreamHandler);

// AI analysis — apply stricter rate limit
router.post('/:id/analyze', aiLimiter, dreamIdValidator, validateRequest, analyzeDreamHandler);

module.exports = router;
