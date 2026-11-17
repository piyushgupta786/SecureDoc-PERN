const { prisma } = require('../config/db');

async function createAuditLog({ action, details, ipAddress, userId, documentId }) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        details: details || null,
        ipAddress: ipAddress || null,
        userId: userId || null,
        documentId: documentId || null
      }
    });
  } catch (err) {
    console.error('[AUDIT ERROR]', err.message);
  }
}

module.exports = { createAuditLog };
