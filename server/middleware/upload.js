const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);

// Memory storage: Vercel functions have no writable persistent disk, so the
// file is held in req.file.buffer and uploaded straight to Supabase Storage
// by the route handler instead of being written to a local uploads/ dir.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      const err = new Error('Only JPG, PNG, or PDF files are accepted for ID uploads.');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

function storageObjectName(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  return `${uuidv4()}${ext}`;
}

module.exports = upload;
module.exports.storageObjectName = storageObjectName;
