const express = require('express');
const router = express.Router();
const { getDocumentAuditTrail, getSystemAuditLogs } = require('../controllers/audit.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/rbac.middleware');

router.use(authMiddleware);

// GET /api/audit - ADMIN only
router.get('/', requireRole('ADMIN'), getSystemAuditLogs);

// GET /api/audit/document/:documentId - All roles
router.get('/document/:documentId', requireRole('ADMIN', 'INVESTIGATOR', 'VIEWER'), getDocumentAuditTrail);

module.exports = router;
