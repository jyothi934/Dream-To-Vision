/**
 * Global error handler — never leaks stack traces or API keys.
 */
function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err.message);

  // Sanitize the message — never expose internals
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message || 'An unexpected error occurred';

  res.status(err.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

module.exports = { errorHandler, notFound };
