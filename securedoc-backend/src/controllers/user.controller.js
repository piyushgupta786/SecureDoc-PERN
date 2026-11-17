const bcrypt = require('bcrypt');
const { prisma } = require('../config/db');
const { createAuditLog } = require('../utils/audit.util');

const registerUser = async (req, res, next) => {
  try {
    const { username, password, email, fullName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null,
        fullName: fullName || null,
        role: 'VIEWER'
      }
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    next(err);
  }
};

const getUserByUsername = async (req, res, next) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        fullName: true,
        createdAt: true
      }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { role } = req.body;

    const validRoles = ['ADMIN', 'INVESTIGATOR', 'VIEWER'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updated = await prisma.user.update({
      where: { username },
      data: { role },
      select: { id: true, username: true, role: true }
    });

    await createAuditLog({
      action: 'ROLE_UPDATED',
      details: `User ${username} role changed to ${role} by ${req.user.username}`,
      ipAddress: req.ip,
      userId: req.user.id
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

module.exports = { registerUser, getUserByUsername, updateUserRole };
