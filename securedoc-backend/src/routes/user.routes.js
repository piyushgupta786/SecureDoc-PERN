const express = require('express');
const router = express.Router();
const { registerUser, getUserByUsername, updateUserRole } = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/rbac.middleware');

// POST /api/users - public registration
router.post('/', registerUser);

// GET /api/users/username/:username - ADMIN only
router.get('/username/:username', authMiddleware, requireRole('ADMIN'), getUserByUsername);

// PUT /api/users/:username/role - ADMIN only
router.put('/:username/role', authMiddleware, requireRole('ADMIN'), updateUserRole);

module.exports = router;
