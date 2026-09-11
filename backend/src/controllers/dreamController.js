const {
  createDream,
  getUserDreams,
  getDreamById,
  deleteDream,
  runAnalysisPipeline,
} = require('../services/dreamService');

// POST /api/dreams
async function createDreamHandler(req, res, next) {
  try {
    const { raw_input, input_type = 'text' } = req.body;
    const userId = req.user.id; // Always from verified JWT, never body

    const dream = await createDream(userId, raw_input, input_type);
    return res.status(201).json({ dream });
  } catch (err) {
    next(err);
  }
}

// GET /api/dreams
async function getDreamsHandler(req, res, next) {
  try {
    const userId = req.user.id;
    const dreams = await getUserDreams(userId);
    return res.json({ dreams });
  } catch (err) {
    next(err);
  }
}

// GET /api/dreams/:id
async function getDreamHandler(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const dream = await getDreamById(id, userId);
    return res.json({ dream });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
}

// DELETE /api/dreams/:id
async function deleteDreamHandler(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await deleteDream(id, userId);
    return res.json({ message: 'Dream deleted successfully' });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
}

// POST /api/dreams/:id/analyze
async function analyzeDreamHandler(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Run the full AI pipeline (can take 15-30 seconds)
    const result = await runAnalysisPipeline(id, userId);
    return res.json({ dream: result });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
}

module.exports = {
  createDreamHandler,
  getDreamsHandler,
  getDreamHandler,
  deleteDreamHandler,
  analyzeDreamHandler,
};
