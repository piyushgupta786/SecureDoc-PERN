const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  searchDocuments,
  getDocumentsByCase,
  getDocumentById,
  verifyDocumentHash,
  downloadDocument,
  blockchainVerify,
  blockchainVerifyUpload
} = require('../controllers/document.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/rbac.middleware');
const { uploadDocument: uploadDocMiddleware, uploadCandidate } = require('../middlewares/upload.middleware');

router.use(authMiddleware);

const allRoles = requireRole('ADMIN', 'INVESTIGATOR', 'VIEWER');
const writeRoles = requireRole('ADMIN', 'INVESTIGATOR');

// POST /api/documents - upload
router.post('/', writeRoles, uploadDocMiddleware.single('file'), uploadDocument);

// GET /api/documents/search?query=...
router.get('/search', allRoles, searchDocuments);

// GET /api/documents/case/:caseNumber
router.get('/case/:caseNumber', allRoles, getDocumentsByCase);

// GET /api/documents/:id
router.get('/:id', allRoles, getDocumentById);

// GET /api/documents/:id/verify
router.get('/:id/verify', allRoles, verifyDocumentHash);

// GET /api/documents/:id/download
router.get('/:id/download', allRoles, downloadDocument);

// GET /api/documents/:id/blockchain-verify
router.get('/:id/blockchain-verify', allRoles, blockchainVerify);

// POST /api/documents/:id/blockchain-verify-upload
router.post('/:id/blockchain-verify-upload', allRoles, uploadCandidate.single('file'), blockchainVerifyUpload);

module.exports = router;
