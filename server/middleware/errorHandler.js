// Fields that must never reach stdout/stderr, even in an error path.
const SENSITIVE_KEYS = new Set(['idNumber', 'idImage', 'idImageUrl', 'id_number', 'id_image_path']);

function redact(value) {
  if (!value || typeof value !== 'object') return value;
  const clone = Array.isArray(value) ? [] : {};
  for (const [key, val] of Object.entries(value)) {
    clone[key] = SENSITIVE_KEYS.has(key) ? '[redacted]' : redact(val);
  }
  return clone;
}

function requestLogger(req, res, next) {
  const safeBody = redact(req.body);
  console.log(`${req.method} ${req.path}`, JSON.stringify(safeBody));
  next();
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || (typeof err.code === 'string' && err.code.startsWith('LIMIT_') ? 400 : 500);
  if (status >= 500) {
    console.error(err.message, { path: req.path });
  }
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = { requestLogger, notFoundHandler, errorHandler, redact };
