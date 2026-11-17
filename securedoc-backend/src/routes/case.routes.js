const express = require('express');
const router = express.Router();
const { getAllCases, getCaseByNumber, createCase } = require('../controllers/case.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/rbac.middleware');

router.use(authMiddleware);

// GET /api/cases
router.get('/', requireRole('ADMIN', 'INVESTIGATOR', 'VIEWER'), getAllCases);

// GET /api/cases/:caseNumber
router.get('/:caseNumber', requireRole('ADMIN', 'INVESTIGATOR', 'VIEWER'), getCaseByNumber);

// POST /api/cases
router.post('/', requireRole('ADMIN', 'INVESTIGATOR'), createCase);

module.exports = router;
