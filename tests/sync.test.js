const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const root = path.resolve(__dirname, '..');
const serverPath = path.join(root, 'server.js');
let tempRoot;
let libraryRoot;
let child;
let port;
let token;
let endpoint;
let stdout = '';

async function unusedPort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => probe.once('error', reject).listen(0, '127.0.0.1', resolve));
  const address = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return address.port;
}

function waitForReady() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server did not become ready. Output:\n${stdout}`)), 20000);
    const onData = (chunk) => {
      stdout += chunk.toString();
      const errorLine = stdout.split(/\r?\n/).find((line) => line.startsWith('IPOD_SYNC_ERROR:'));
      if (errorLine) {
        clearTimeout(timeout);
        reject(new Error(errorLine));
        return;
      }
      const readyLine = stdout.split(/\r?\n/).find((line) => line.startsWith('IPOD_SYNC_READY:'));
      if (!readyLine) return;
      clearTimeout(timeout);
      child.stdout.off('data', onData);
      try { resolve(JSON.parse(readyLine.slice('IPOD_SYNC_READY:'.length))); }
      catch (error) { reject(error); }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (chunk) => {
      const message = chunk.toString();
      if (message.includes('IPOD_SYNC_ERROR:')) {
        clearTimeout(timeout);
        reject(new Error(message.trim()));
      }
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited early with code ${code}. Output:\n${stdout}`));
    });
  });
}

function httpsGet(requestPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = https.get({
      hostname: '127.0.0.1', port, path: requestPath, headers,
      rejectUnauthorized: false, agent: false
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8')
      }));
    });
    request.on('error', reject);
  });
}

function httpGet(requestPath) {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port, path: requestPath }, (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    request.on('error', reject);
  });
}

before(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ipod-sync-test-'));
  libraryRoot = path.join(tempRoot, 'music');
  await fs.mkdir(libraryRoot);
  await fs.writeFile(path.join(libraryRoot, 'Artist — Test Track.mp3'), Buffer.from('test audio'));
  port = await unusedPort();
  child = spawn(process.execPath, [serverPath], {
    cwd: root,
    env: {
      ...process.env,
      MUZIKA_DATA_DIR: path.join(tempRoot, 'server-data'),
      MUZIKA_LIBRARY_ROOT: libraryRoot,
      MUZIKA_HOST: '127.0.0.1',
      MUZIKA_PORT: String(port)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const endpoints = await waitForReady();
  assert.equal(endpoints.length, 1, 'the desktop app should publish exactly one sync endpoint');
  endpoint = endpoints[0];
  const connection = new URL(endpoint.connection);
  const params = new URLSearchParams(connection.hash.slice(1));
  token = params.get('muzika-download-token');
  assert.match(token || '', /^[a-f0-9]{64}$/);
});

after(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
  }
  if (tempRoot) await fs.rm(tempRoot, { recursive: true, force: true });
});

test('one HTTPS server exposes authenticated health and the music library', async () => {
  const unauthenticated = await httpsGet('/api/health');
  assert.equal(unauthenticated.status, 401);

  const health = await httpsGet('/api/health', { Authorization: `Bearer ${token}` });
  assert.equal(health.status, 200);
  const healthPayload = JSON.parse(health.body);
  assert.equal(healthPayload.service, 'ipod-sync');
  assert.equal(healthPayload.protocolVersion, 2);
  assert.equal(healthPayload.libraryReady, true);

  const library = await httpsGet('/api/library', { Authorization: `Bearer ${token}` });
  assert.equal(library.status, 200);
  const tracks = JSON.parse(library.body).tracks;
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].title, 'Test Track');
});

test('the same HTTPS server provides the AirDrop setup profile and saved connection', async () => {
  const profile = await httpsGet('/install-ca.mobileconfig');
  assert.equal(profile.status, 200);
  assert.match(profile.headers['content-type'], /application\/x-apple-aspen-config/);
  assert.match(profile.body, /com\.apple\.security\.root/);
  assert.match(profile.body, /com\.apple\.webClip\.managed/);
  assert.match(profile.body, /kiorpavlo-cmd\.github\.io\/muzika-offline/);
  assert.ok(profile.body.includes(token));
  assert.ok(profile.body.includes(String(port)));
  const profilePath = path.join(tempRoot, 'iPod-AirDrop-Setup.mobileconfig');
  await fs.writeFile(profilePath, profile.body);
  execFileSync('plutil', ['-lint', profilePath], { stdio: 'pipe' });

  const setup = await httpsGet('/setup', { Host: `${endpoint.address}:${port}` });
  assert.equal(setup.status, 200);
  assert.match(setup.body, /Відкрийте iPod/);
});

test('the sync port is HTTPS only; no second HTTP setup listener is required', async () => {
  await assert.rejects(httpGet('/api/health'));
  assert.equal((stdout.match(/IPOD_SYNC_READY:/g) || []).length, 1);
  assert.doesNotMatch(stdout, /:3000\//);
});
