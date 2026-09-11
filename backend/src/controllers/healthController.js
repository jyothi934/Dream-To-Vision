const { supabaseAdmin } = require('../config/supabase');

async function healthCheck(req, res) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      backend: 'ok',
      database: 'checking',
    },
  };

  try {
    // Quick DB ping — select a known system table
    const { error } = await supabaseAdmin.from('dreams').select('id').limit(1);
    health.services.database = error ? 'error' : 'ok';
  } catch {
    health.services.database = 'error';
  }

  const statusCode = health.services.database === 'error' ? 503 : 200;
  return res.status(statusCode).json(health);
}

module.exports = { healthCheck };
