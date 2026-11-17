const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);
const STORAGE_LOCATION = process.env.STORAGE_LOCATION || './securedoc-storage/documents';
const WORKING_DIR = path.join(STORAGE_LOCATION, 'working');

if (!fs.existsSync(WORKING_DIR)) {
  fs.mkdirSync(WORKING_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, WORKING_DIR); },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${sanitized}`);
  }
});

const memoryStorage = multer.memoryStorage();

const uploadDocument = multer({
  storage: diskStorage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, true)
});

const uploadCandidate = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, true)
});

module.exports = { uploadDocument, uploadCandidate };
