/**
 * SecureDoc End-to-End Test Script
 * Tests all major API endpoints in sequence.
 * Usage: node scripts/test-e2e.js
 * Requires the server to be running on http://localhost:8080
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
let adminToken = '';
let userToken = '';
let createdDocumentId = null;
let testUsername = `testuser_${Date.now()}`;
let testCaseNumber = `CASE-${Date.now()}`;

// ---- Minimal HTTP client (no extra deps) ----
function request(method, urlPath, body, token, isMultipart = false, boundary = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {}
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    let postData;
    if (isMultipart && boundary) {
      options.headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      postData = body;
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    } else if (body && !isMultipart) {
      postData = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString();
        let parsed;
        try { parsed = JSON.parse(rawBody); } catch { parsed = rawBody; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function buildMultipartBody(fields, file) {
  const boundary = `----SecureDocBoundary${Date.now()}`;
  const parts = [];

  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
      `${value}\r\n`
    );
  }

  if (file) {
    const { fieldName, fileName, mimeType, data } = file;
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    );
    const fileBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const closing = `\r\n--${boundary}--\r\n`;
    const header = Buffer.from(parts.join(''));
    return { boundary, body: Buffer.concat([header, fileBuffer, Buffer.from(closing)]) };
  }

  parts.push(`--${boundary}--\r\n`);
  return { boundary, body: Buffer.from(parts.join('')) };
}

// ---- Test helpers ----
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(50));
}

// ---- Tests ----

async function testAdminLogin() {
  section('1. Admin Login');
  const res = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.token, 'Received JWT token');
  assert(res.data.user && res.data.user.role === 'ADMIN', 'User role is ADMIN');
  adminToken = res.data.token || '';
  console.log('  Token:', adminToken ? adminToken.substring(0, 30) + '...' : 'NONE');
}

async function testCreateUser() {
  section('2. Create New User');
  const res = await request('POST', '/api/users', {
    username: testUsername,
    password: 'TestPass123!',
    email: `${testUsername}@test.com`,
    fullName: 'Test Investigator'
  });
  assert(res.status === 201, `Status 201 (got ${res.status})`);
  assert(res.data.role === 'VIEWER', 'New user has VIEWER role by default');
  console.log('  Created user:', testUsername);
}

async function testUpgradeUserRole() {
  section('3. Upgrade User Role to INVESTIGATOR');
  const res = await request('PUT', `/api/users/${testUsername}/role`, { role: 'INVESTIGATOR' }, adminToken);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.role === 'INVESTIGATOR', `Role updated to INVESTIGATOR (got ${res.data.role})`);
}

async function testUserLogin() {
  section('4. Upgraded User Login');
  const res = await request('POST', '/api/auth/login', { username: testUsername, password: 'TestPass123!' });
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.user && res.data.user.role === 'INVESTIGATOR', 'Token reflects INVESTIGATOR role');
  userToken = res.data.token || '';
}

async function testCreateCase() {
  section('5. Create Case');
  const res = await request('POST', '/api/cases', {
    caseNumber: testCaseNumber,
    title: 'E2E Test Investigation',
    description: 'Automated E2E test case'
  }, adminToken);
  assert(res.status === 201, `Status 201 (got ${res.status})`);
  assert(res.data.caseNumber === testCaseNumber, `Case number matches (${testCaseNumber})`);
  console.log('  Created case:', testCaseNumber);
}

async function testUploadDocument() {
  section('6. Upload Document');
  const fileContent = Buffer.from('This is a test document for SecureDoc E2E testing. Content: ORIGINAL');
  const { boundary, body } = buildMultipartBody(
    { title: 'E2E Test Document', caseNumber: testCaseNumber },
    { fieldName: 'file', fileName: 'test-document.txt', mimeType: 'text/plain', data: fileContent }
  );

  const res = await request('POST', '/api/documents', body, adminToken, true, boundary);
  assert(res.status === 201, `Status 201 (got ${res.status})`);
  assert(res.data.sha256Hash && res.data.sha256Hash.length === 64, 'SHA-256 hash present (64 chars)');
  assert(typeof res.data.blockchainRegistered === 'boolean', 'blockchainRegistered field present');
  createdDocumentId = res.data.id;
  console.log('  Document ID:', createdDocumentId);
  console.log('  SHA-256:', res.data.sha256Hash);
  console.log('  Blockchain registered:', res.data.blockchainRegistered);
}

async function testVerifyHash() {
  section('7. Verify SHA-256 Hash (Local)');
  const res = await request('GET', `/api/documents/${createdDocumentId}/verify`, null, adminToken);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.match === true, 'Hash MATCH (file not tampered)');
  assert(res.data.storedHash === res.data.currentHash, 'Stored hash == current hash');
  console.log('  Stored Hash:', res.data.storedHash);
  console.log('  Current Hash:', res.data.currentHash);
}

async function testBlockchainVerify() {
  section('8. Blockchain Verify');
  const res = await request('GET', `/api/documents/${createdDocumentId}/blockchain-verify`, null, adminToken);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert('localHash' in res.data, 'localHash present');
  assert('onChainHash' in res.data, 'onChainHash present');
  assert('match' in res.data, 'match field present');
  console.log('  Local Hash:', res.data.localHash);
  console.log('  On-Chain Hash:', res.data.onChainHash);
  console.log('  Match:', res.data.match);
  console.log('  Registered:', res.data.registered);
}

async function testCandidateVerifyTampered() {
  section('9. Candidate Upload Verification (TAMPERED)');
  // Upload a DIFFERENT/MODIFIED file
  const tamperedContent = Buffer.from('This is a TAMPERED document - content has been modified!');
  const { boundary, body } = buildMultipartBody(
    {},
    { fieldName: 'file', fileName: 'tampered-document.txt', mimeType: 'text/plain', data: tamperedContent }
  );

  const res = await request('POST', `/api/documents/${createdDocumentId}/blockchain-verify-upload`, body, adminToken, true, boundary);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.verificationStatus === 'TAMPERED', `verificationStatus is TAMPERED (got ${res.data.verificationStatus})`);
  assert(res.data.match === false, 'match is false for tampered doc');
  assert(res.data.aiAnalysisPerformed === false, 'aiAnalysisPerformed is false');
  console.log('  Verification Status:', res.data.verificationStatus);
  console.log('  Candidate Hash:', res.data.candidateHash);
}

async function testCandidateVerifyOriginal() {
  section('10. Candidate Upload Verification (VERIFIED)');
  // Upload the SAME content
  const originalContent = Buffer.from('This is a test document for SecureDoc E2E testing. Content: ORIGINAL');
  const { boundary, body } = buildMultipartBody(
    {},
    { fieldName: 'file', fileName: 'original-document.txt', mimeType: 'text/plain', data: originalContent }
  );

  const res = await request('POST', `/api/documents/${createdDocumentId}/blockchain-verify-upload`, body, adminToken, true, boundary);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.data.verificationStatus === 'VERIFIED', `verificationStatus is VERIFIED (got ${res.data.verificationStatus})`);
  assert(res.data.match === true, 'match is true for original doc');
}

async function testAuditTrail() {
  section('11. Fetch Audit Trail for Document');
  const res = await request('GET', `/api/audit/document/${createdDocumentId}`, null, adminToken);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(Array.isArray(res.data), 'Audit log is an array');
  assert(res.data.length > 0, `Has audit entries (${res.data.length} found)`);
  const actions = res.data.map(l => l.action);
  console.log('  Audit actions:', actions.join(', '));
  assert(actions.includes('DOCUMENT_UPLOADED'), 'Contains DOCUMENT_UPLOADED event');
}

async function testSearchDocuments() {
  section('12. Search Documents');
  const res = await request('GET', `/api/documents/search?query=E2E`, null, adminToken);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(Array.isArray(res.data) && res.data.length > 0, 'Search returned results');
}

async function testGetCases() {
  section('13. List Cases');
  const res = await request('GET', '/api/cases', null, adminToken);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(Array.isArray(res.data), 'Returns array of cases');
}

// ---- Main ----
async function main() {
  console.log('='.repeat(50));
  console.log('  SecureDoc E2E Test Suite');
  console.log(`  Target: ${BASE_URL}`);
  console.log('='.repeat(50));

  // Check server health first
  try {
    const health = await request('GET', '/health', null, null);
    if (health.status !== 200) {
      console.error('❌ Server is not running! Start it with: npm run dev');
      process.exit(1);
    }
    console.log('✅ Server health check passed:', health.data.status);
  } catch (err) {
    console.error('❌ Cannot connect to server:', err.message);
    console.error('   Make sure the server is running: npm run dev');
    process.exit(1);
  }

  try {
    await testAdminLogin();
    await testCreateUser();
    await testUpgradeUserRole();
    await testUserLogin();
    await testCreateCase();
    await testUploadDocument();
    await testVerifyHash();
    await testBlockchainVerify();
    await testCandidateVerifyTampered();
    await testCandidateVerifyOriginal();
    await testAuditTrail();
    await testSearchDocuments();
    await testGetCases();
  } catch (err) {
    console.error('\n❌ UNEXPECTED ERROR:', err.message);
    console.error(err.stack);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

main();
