const path = require('path');

// Configurable via env so a deployment can point both at a mounted
// persistent volume (e.g. Fly.io) instead of the repo checkout itself.
const DATA_DIR = process.env.MKN_DATA_DIR || path.join(__dirname, '..', '..', 'data');
const UPLOAD_DIR = process.env.MKN_UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

module.exports = { DATA_DIR, UPLOAD_DIR };
