const { prisma } = require('../config/db');

const getDocumentAuditTrail = async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.documentId, 10);
    if (isNaN(documentId)) {
      return res.status(400).json({ message: 'Invalid documentId.' });
    }

    const logs = await prisma.auditLog.findMany({
      where: { documentId },
      include: {
        user: { select: { username: true, role: true } }
      },
      orderBy: { timestamp: 'asc' }
    });

    res.json(logs);
  } catch (err) {
    next(err);
  }
};

const getSystemAuditLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const logs = await prisma.auditLog.findMany({
      take: limit,
      include: {
        user: { select: { username: true, role: true } },
        document: { select: { title: true, fileName: true } }
      },
      orderBy: { timestamp: 'desc' }
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

module.exports = { getDocumentAuditTrail, getSystemAuditLogs };
