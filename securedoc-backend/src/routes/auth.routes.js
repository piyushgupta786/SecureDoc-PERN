const express = require('express');
const router = express.Router();
const { login } = require('../controllers/auth.controller');
const { registerUser } = require('../controllers/user.controller');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/register (alias for user creation)
router.post('/register', registerUser);

module.exports = router;
