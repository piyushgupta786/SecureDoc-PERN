const { prisma } = require('../config/db');
const { createAuditLog } = require('../utils/audit.util');

const getAllCases = async (req, res, next) => {
  try {
    const cases = await prisma.case.findMany({
      include: {
        createdBy: { select: { username: true } },
        _count: { select: { documents: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = cases.map(c => ({
      id: c.id,
      caseNumber: c.caseNumber,
      title: c.title,
      description: c.description,
      status: c.status,
      createdBy: c.createdBy.username,
      documentCount: c._count.documents,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getCaseByNumber = async (req, res, next) => {
  try {
    const { caseNumber } = req.params;
    const caseRecord = await prisma.case.findUnique({
      where: { caseNumber },
      include: {
        createdBy: { select: { username: true, role: true } },
        documents: {
          select: {
            id: true,
            title: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
            sha256Hash: true,
            blockchainRegistered: true,
            blockchainTxHash: true,
            uploadedBy: { select: { username: true } },
            createdAt: true
          }
        }
      }
    });

    if (!caseRecord) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    res.json(caseRecord);
  } catch (err) {
    next(err);
  }
};

const createCase = async (req, res, next) => {
  try {
    const { caseNumber, title, description } = req.body;
    if (!caseNumber || !title) {
      return res.status(400).json({ message: 'caseNumber and title are required.' });
    }

    const existing = await prisma.case.findUnique({ where: { caseNumber } });
    if (existing) {
      return res.status(409).json({ message: 'A case with this caseNumber already exists.' });
    }

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        title,
        description: description || null,
        createdById: req.user.id
      },
      include: {
        createdBy: { select: { username: true } }
      }
    });

    await createAuditLog({
      action: 'CASE_CREATED',
      details: `Case ${caseNumber} - "${title}" created by ${req.user.username}`,
      ipAddress: req.ip,
      userId: req.user.id
    });

    res.status(201).json(newCase);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllCases, getCaseByNumber, createCase };
