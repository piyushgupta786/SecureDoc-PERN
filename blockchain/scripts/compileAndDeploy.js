const solc = require('solc');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../securedoc-backend/.env') });

const CONTRACT_NAME = 'SecureDocRegistry';
const CONTRACT_PATH = path.join(__dirname, '../contracts/SecureDocRegistry.sol');
const ABI_OUTPUT_PATH = path.join(__dirname, '../abi/SecureDocRegistry.json');
const BACKEND_ENV_PATH = path.join(__dirname, '../../securedoc-backend/.env');

async function compileContract() {
  console.log('📦 Compiling SecureDocRegistry.sol...');
  const source = fs.readFileSync(CONTRACT_PATH, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'SecureDocRegistry.sol': { content: source }
    },
    settings: {
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode'] }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('Compilation errors:', errors);
      throw new Error('Contract compilation failed');
    }
    output.errors.forEach(w => console.warn('Warning:', w.formattedMessage));
  }

  const contractOutput = output.contracts['SecureDocRegistry.sol'][CONTRACT_NAME];
  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm.bytecode.object;

  // Ensure abi directory exists
  const abiDir = path.dirname(ABI_OUTPUT_PATH);
  if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });

  fs.writeFileSync(ABI_OUTPUT_PATH, JSON.stringify({ abi, bytecode }, null, 2));
  console.log('✅ ABI and bytecode saved to blockchain/abi/SecureDocRegistry.json');

  return { abi, bytecode };
}

async function deployContract(abi, bytecode) {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545';
  console.log(`🔗 Connecting to Ganache at ${rpcUrl}...`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  let signer;
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  if (privateKey && privateKey.trim() !== '') {
    signer = new ethers.Wallet(privateKey, provider);
    console.log(`🔑 Using provided private key. Address: ${signer.address}`);
  } else {
    console.log('🔑 No private key set - fetching first Ganache account...');
    const accounts = await provider.send('eth_accounts', []);
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts available from Ganache RPC');
    }
    signer = await provider.getSigner(accounts[0]);
    console.log(`🔑 Using Ganache account: ${accounts[0]}`);
  }

  console.log('🚀 Deploying SecureDocRegistry...');
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`✅ Contract deployed at: ${contractAddress}`);

  // Update .env BLOCKCHAIN_CONTRACT_ADDRESS
  let envContent = fs.readFileSync(BACKEND_ENV_PATH, 'utf8');
  if (envContent.includes('BLOCKCHAIN_CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(
      /BLOCKCHAIN_CONTRACT_ADDRESS=.*/,
      `BLOCKCHAIN_CONTRACT_ADDRESS="${contractAddress}"`
    );
  } else {
    envContent += `\nBLOCKCHAIN_CONTRACT_ADDRESS="${contractAddress}"`;
  }
  fs.writeFileSync(BACKEND_ENV_PATH, envContent);
  console.log(`✅ Updated securedoc-backend/.env with contract address`);

  if (!privateKey || privateKey.trim() === '') {
    console.log('\n⚠️  IMPORTANT: Set BLOCKCHAIN_PRIVATE_KEY in .env to one of your Ganache private keys!');
  }

  return contractAddress;
}

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('  SecureDoc Blockchain Setup');
    console.log('='.repeat(60));
    const { abi, bytecode } = await compileContract();
    const contractAddress = await deployContract(abi, bytecode);
    console.log('='.repeat(60));
    console.log('✅ BLOCKCHAIN SETUP COMPLETE');
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   RPC:      ${process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545'}`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('❌ Blockchain setup failed:', err.message);
    process.exit(1);
  }
}

main();
