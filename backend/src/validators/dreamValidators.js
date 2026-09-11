const { body, param } = require('express-validator');

const createDreamValidator = [
  body('raw_input')
    .trim()
    .notEmpty()
    .withMessage('Dream description is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Dream description must be between 10 and 5000 characters'),
  body('input_type')
    .optional()
    .isIn(['text', 'voice'])
    .withMessage('input_type must be "text" or "voice"'),
];

const dreamIdValidator = [
  param('id').isUUID().withMessage('Invalid dream ID'),
];

module.exports = { createDreamValidator, dreamIdValidator };
