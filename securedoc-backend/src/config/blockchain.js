const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const ABI_PATH = path.join(__dirname, '../../../blockchain/abi/SecureDocRegistry.json');

let provider = null;
let contract = null;
let signer = null;

function loadABI() {
  try {
    if (!fs.existsSync(ABI_PATH)) {
      console.warn('⚠️  Blockchain ABI not found. Run compile/deploy script first.');
      return null;
    }
    const data = JSON.parse(fs.readFileSync(ABI_PATH, 'utf8'));
    return data;
  } catch (err) {
    console.warn('⚠️  Failed to load blockchain ABI:', err.message);
    return null;
  }
}

function initBlockchain() {
  if (process.env.BLOCKCHAIN_ENABLED !== 'true') {
    console.log('ℹ️  Blockchain integration disabled (BLOCKCHAIN_ENABLED=false)');
    return false;
  }

  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545';
  const contractAddress = process.env.BLOCKCHAIN_CONTRACT_ADDRESS;
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

  if (!contractAddress || contractAddress.trim() === '') {
    console.warn('⚠️  BLOCKCHAIN_CONTRACT_ADDRESS not set. Blockchain features disabled.');
    return false;
  }

  const abiData = loadABI();
  if (!abiData) return false;

  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    if (privateKey && privateKey.trim() !== '') {
      signer = new ethers.Wallet(privateKey, provider);
    }
    contract = new ethers.Contract(contractAddress, abiData.abi, signer || provider);
    console.log(`✅ Blockchain initialized. Contract: ${contractAddress}`);
    return true;
  } catch (err) {
    console.warn('⚠️  Blockchain initialization failed:', err.message);
    return false;
  }
}

function hexToBytes32(hexString) {
  const clean = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  return '0x' + clean.padStart(64, '0');
}

function bytes32ToHex(bytes32) {
  const clean = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32;
  return clean.toLowerCase();
}

async function registerHashOnChain(documentId, sha256Hex) {
  if (!contract || !signer) {
    throw new Error('Blockchain not initialized or no signer available');
  }
  try {
    const bytes32Hash = hexToBytes32(sha256Hex);
    const tx = await contract.registerDocument(documentId, bytes32Hash);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      registeredBy: signer.address,
      registeredAt: Math.floor(Date.now() / 1000)
    };
  } catch (err) {
    if (err.message && err.message.includes('Document already registered')) {
      throw new Error('Document already registered on blockchain');
    }
    throw err;
  }
}

async function getHashFromChain(documentId) {
  if (!contract) {
    throw new Error('Blockchain not initialized');
  }
  try {
    const [fileHash, registeredBy, registeredAt, exists] = await contract.getDocument(documentId);
    return {
      exists,
      onChainHash: exists ? bytes32ToHex(fileHash) : null,
      registeredBy,
      registeredAt: exists ? Number(registeredAt) : null
    };
  } catch (err) {
    throw err;
  }
}

function isBlockchainReady() {
  return contract !== null && signer !== null;
}

module.exports = {
  initBlockchain,
  registerHashOnChain,
  getHashFromChain,
  isBlockchainReady
};
