// Shared HTTP response helpers.
//
// Routes used to do `res.status(500).json({ error: error.message })`, which
// leaks raw DB/SQL/internal messages to clients in production. This helper
// logs the real error server-side and returns a safe, generic message in
// production while keeping detail in development for easier debugging.
const isProduction = process.env.NODE_ENV === 'production';

function sendServerError(res, error, status = 500) {
  console.error('[API error]', (error && (error.stack || error.message)) || error);
  const message = isProduction
    ? 'Internal server error'
    : ((error && error.message) || 'Internal server error');
  return res.status(status).json({ error: message });
}

module.exports = { sendServerError };
