const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { prisma } = require('../config/db');
const { createAuditLog } = require('../utils/audit.util');
const { computeFileHash, computeBufferHash } = require('../utils/hash.util');
const { registerHashOnChain, getHashFromChain, isBlockchainReady } = require('../config/blockchain');

const STORAGE_LOCATION = process.env.STORAGE_LOCATION || './securedoc-storage/documents';
const ORIGINALS_DIR = path.join(STORAGE_LOCATION, 'originals');

// Ensure originals directory exists
if (!fs.existsSync(ORIGINALS_DIR)) {
  fs.mkdirSync(ORIGINALS_DIR, { recursive: true });
}

// POST /api/documents
const uploadDocument = async (req, res, next) => {
  let workingFilePath = null;
  let originalFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { title, caseNumber, caseId } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'title is required.' });
    }
    if (!caseNumber && !caseId) {
      return res.status(400).json({ message: 'caseNumber or caseId is required.' });
    }

    // Find the case
    let caseRecord;
    if (caseNumber) {
      caseRecord = await prisma.case.findUnique({ where: { caseNumber } });
    } else {
      caseRecord = await prisma.case.findUnique({ where: { id: parseInt(caseId, 10) } });
    }
    if (!caseRecord) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    workingFilePath = req.file.path;

    // Create immutable snapshot in originals
    const originalFileName = `orig-${req.file.filename}`;
    originalFilePath = path.join(ORIGINALS_DIR, originalFileName);
    await fsp.copyFile(workingFilePath, originalFilePath);

    // Compute SHA-256 of the original
    const sha256Hash = await computeFileHash(workingFilePath);

    // Save to DB
    let document = await prisma.document.create({
      data: {
        title,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: workingFilePath,
        originalFilePath,
        sha256Hash,
        caseId: caseRecord.id,
        uploadedById: req.user.id
      }
    });

    // Register on blockchain
    let blockchainError = null;
    if (process.env.BLOCKCHAIN_ENABLED === 'true' && isBlockchainReady()) {
      try {
        const chainResult = await registerHashOnChain(document.id, sha256Hash);
        document = await prisma.document.update({
          where: { id: document.id },
          data: {
            blockchainTxHash: chainResult.txHash,
            blockchainRegistered: true
          }
        });
      } catch (err) {
        blockchainError = err.message;
        console.warn('⚠️  Blockchain registration failed:', err.message);
      }
    }

    await createAuditLog({
      action: 'DOCUMENT_UPLOADED',
      details: `Document "${title}" (${req.file.originalname}) uploaded to case ${caseRecord.caseNumber}${blockchainError ? ' [blockchain error: ' + blockchainError + ']' : ''}`,
      ipAddress: req.ip,
      userId: req.user.id,
      documentId: document.id
    });

    res.status(201).json({
      id: document.id,
      title: document.title,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      sha256Hash: document.sha256Hash,
      blockchainRegistered: document.blockchainRegistered,
      blockchainTxHash: document.blockchainTxHash,
      caseId: document.caseId,
      uploadedById: document.uploadedById,
      createdAt: document.createdAt,
      ...(blockchainError && { blockchainError })
    });
  } catch (err) {
    // Clean up files on error
    if (workingFilePath && fs.existsSync(workingFilePath)) {
      fs.unlink(workingFilePath, () => {});
    }
    if (originalFilePath && fs.existsSync(originalFilePath)) {
      fs.unlink(originalFilePath, () => {});
    }
    next(err);
  }
};

// GET /api/documents/search?query=...
const searchDocuments = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'query parameter is required.' });
    }

    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { fileName: { contains: query, mode: 'insensitive' } },
          { case: { caseNumber: { contains: query, mode: 'insensitive' } } }
        ]
      },
      include: {
        case: { select: { caseNumber: true, title: true } },
        uploadedBy: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(documents);
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/case/:caseNumber
const getDocumentsByCase = async (req, res, next) => {
  try {
    const { caseNumber } = req.params;
    const caseRecord = await prisma.case.findUnique({ where: { caseNumber } });
    if (!caseRecord) {
      return res.status(404).json({ message: 'Case not found.' });
    }

    const documents = await prisma.document.findMany({
      where: { caseId: caseRecord.id },
      include: {
        uploadedBy: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(documents);
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id
const getDocumentById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid document ID.' });

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        case: { select: { caseNumber: true, title: true } },
        uploadedBy: { select: { username: true, role: true } }
      }
    });

    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    // Don't expose originalFilePath
    const { originalFilePath, ...safeDoc } = doc;
    res.json(safeDoc);
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id/verify
const verifyDocumentHash = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid document ID.' });

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ message: 'Working file not found on disk.' });
    }

    const currentHash = await computeFileHash(doc.filePath);
    const match = currentHash === doc.sha256Hash;

    await createAuditLog({
      action: 'HASH_VERIFIED',
      details: `Hash verification for document ${id}: ${match ? 'MATCH' : 'MISMATCH'}`,
      ipAddress: req.ip,
      userId: req.user.id,
      documentId: id
    });

    res.json({
      documentId: id,
      storedHash: doc.sha256Hash,
      currentHash,
      match,
      verifiedAt: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id/download
const downloadDocument = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid document ID.' });

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ message: 'File not found on disk.' });
    }

    await createAuditLog({
      action: 'DOCUMENT_DOWNLOADED',
      details: `Document "${doc.title}" (${doc.fileName}) downloaded`,
      ipAddress: req.ip,
      userId: req.user.id,
      documentId: id
    });

    res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
    res.setHeader('Content-Type', doc.mimeType);
    const stream = fs.createReadStream(doc.filePath);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id/blockchain-verify
const blockchainVerify = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid document ID.' });

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ message: 'Working file not found on disk.' });
    }

    const localHash = await computeFileHash(doc.filePath);

    let onChainHash = null;
    let registered = false;
    let transactionHash = doc.blockchainTxHash || null;

    if (process.env.BLOCKCHAIN_ENABLED === 'true' && isBlockchainReady()) {
      try {
        const chainData = await getHashFromChain(id);
        registered = chainData.exists;
        onChainHash = chainData.onChainHash;
      } catch (err) {
        console.warn('⚠️  Blockchain read failed:', err.message);
        // Fallback to DB hash
        onChainHash = doc.sha256Hash;
        registered = doc.blockchainRegistered;
      }
    } else {
      onChainHash = doc.sha256Hash;
      registered = doc.blockchainRegistered;
    }

    const match = localHash === onChainHash;

    await createAuditLog({
      action: 'BLOCKCHAIN_VERIFIED',
      details: `Blockchain verification for document ${id}: ${match ? 'MATCH' : 'MISMATCH'}`,
      ipAddress: req.ip,
      userId: req.user.id,
      documentId: id
    });

    res.json({
      documentId: id,
      localHash,
      onChainHash,
      registered,
      match,
      transactionHash
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/documents/:id/blockchain-verify-upload
const blockchainVerifyUpload = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid document ID.' });

    if (!req.file) {
      return res.status(400).json({ message: 'No candidate file uploaded.' });
    }

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    // Compute candidate hash from memory buffer (do NOT save to disk)
    const candidateHash = computeBufferHash(req.file.buffer);

    // Get the reference hash
    let onChainHash = null;
    let registered = false;

    if (process.env.BLOCKCHAIN_ENABLED === 'true' && isBlockchainReady()) {
      try {
        const chainData = await getHashFromChain(id);
        registered = chainData.exists;
        onChainHash = chainData.onChainHash;
      } catch (err) {
        console.warn('⚠️  Blockchain read failed, falling back to DB hash');
        onChainHash = doc.sha256Hash;
        registered = doc.blockchainRegistered;
      }
    } else {
      onChainHash = doc.sha256Hash;
      registered = doc.blockchainRegistered;
    }

    const match = candidateHash === onChainHash;
    const verificationStatus = match ? 'VERIFIED' : 'TAMPERED';

    await createAuditLog({
      action: 'CANDIDATE_VERIFIED',
      details: `Candidate verification for document ${id}: ${verificationStatus}`,
      ipAddress: req.ip,
      userId: req.user.id,
      documentId: id
    });

    res.json({
      documentId: id,
      verificationStatus,
      candidateHash,
      onChainHash,
      match,
      registered,
      aiAnalysisPerformed: false
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadDocument,
  searchDocuments,
  getDocumentsByCase,
  getDocumentById,
  verifyDocumentHash,
  downloadDocument,
  blockchainVerify,
  blockchainVerifyUpload
};
