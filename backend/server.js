const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PORT = Number(process.env.PORT || 10000);
const HOST = process.env.HOST || '0.0.0.0';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_ALLOWED_EMAIL = (process.env.GOOGLE_ALLOWED_EMAIL || '').trim().toLowerCase();
const ALLOWED_ORIGIN = 'https://kiorpavlo-cmd.github.io';
const MAX_REQUEST_BYTES = 2048;
const MAX_AUDIO_BYTES = 120 * 1024 * 1024;
const MAX_MONTHLY_AUDIO_BYTES = 4_000_000_000;
const DOWNLOAD_TIMEOUT_MS = 8 * 60 * 1000;
const MAX_CONCURRENT_DOWNLOADS = 1;
const MAX_DOWNLOADS_PER_HOUR = 10;
const MAX_DOWNLOADS_PER_DAY = 30;

let googleKeys = [];
let googleKeysExpireAt = 0;
const usageByUser = new Map();
const activeUsers = new Set();
let monthlyAudioPeriod = new Date().toISOString().slice(0, 7);
let monthlyAudioBytes = 0;
const monthlyUsageFile = process.env.MUZIKA_USAGE_FILE || path.join(os.tmpdir(), 'muzika-monthly-usage.json');

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(payload));
}

function applyCors(req, res) {
  if (req.headers.origin !== ALLOWED_ORIGIN) return false;
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');
  res.setHeader('Vary', 'Origin');
  return true;
}

async function getGoogleKeys() {
  if (Date.now() < googleKeysExpireAt && googleKeys.length) return googleKeys;
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('google-keys-unavailable');
  const payload = await response.json();
  if (!Array.isArray(payload.keys)) throw new Error('google-keys-invalid');
  const maxAge = Number(/max-age=(\d+)/i.exec(response.headers.get('cache-control') || '')?.[1] || 300);
  googleKeys = payload.keys;
  googleKeysExpireAt = Date.now() + Math.max(60, Math.min(maxAge, 3600)) * 1000;
  return googleKeys;
}

async function verifyGoogleCredential(token) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_ALLOWED_EMAIL) throw new Error('auth-not-configured');
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) throw new Error('invalid-credential');

  let header;
  let claims;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new Error('invalid-credential');
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('invalid-credential');

  const key = (await getGoogleKeys()).find((candidate) => candidate.kid === header.kid);
  if (!key) throw new Error('invalid-credential');
  const signatureIsValid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    crypto.createPublicKey({ key, format: 'jwk' }),
    Buffer.from(parts[2], 'base64url')
  );
  if (!signatureIsValid) throw new Error('invalid-credential');

  const now = Math.floor(Date.now() / 1000);
  const issuerIsValid = claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com';
  const audienceIsValid = claims.aud === GOOGLE_CLIENT_ID || (Array.isArray(claims.aud) && claims.aud.includes(GOOGLE_CLIENT_ID));
  const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
  if (!issuerIsValid || !audienceIsValid || !Number.isFinite(claims.exp) || !Number.isFinite(claims.iat) || claims.exp <= now || claims.iat > now + 60 || claims.email_verified !== true || !claims.sub) {
    throw new Error('invalid-credential');
  }
  if (email !== GOOGLE_ALLOWED_EMAIL) throw new Error('account-not-allowed');
  return { id: claims.sub, email };
}

function authorizeUser(req, res) {
  const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1] || '';
  if (!bearer) {
    sendJson(res, 401, { error: 'Увійдіть у Muzika через Google, щоб завантажити аудіо.' });
    return Promise.resolve(null);
  }
  return verifyGoogleCredential(bearer).then((user) => user).catch((error) => {
    const status = error.message === 'account-not-allowed' ? 403 : error.message === 'invalid-credential' ? 401 : 503;
    const message = status === 403
      ? 'Цей акаунт Google не має доступу до завантаження.'
      : status === 401
        ? 'Сеанс Google завершився. Повторно увійдіть у застосунок.'
        : 'Не вдалося перевірити вхід Google. Спробуйте ще раз.';
    sendJson(res, status, { error: message });
    return null;
  });
}

function reserveDownload(userId) {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const recent = (usageByUser.get(userId) || []).filter((timestamp) => timestamp > dayAgo);
  const hourly = recent.filter((timestamp) => timestamp > hourAgo).length;
  if (hourly >= MAX_DOWNLOADS_PER_HOUR || recent.length >= MAX_DOWNLOADS_PER_DAY) return false;
  recent.push(now);
  usageByUser.set(userId, recent);
  return true;
}

async function loadMonthlyAudioUsage() {
  await fs.promises.mkdir(path.dirname(monthlyUsageFile), { recursive: true });
  let stored;
  try {
    stored = JSON.parse(await fs.promises.readFile(monthlyUsageFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('monthly-usage-storage-unavailable');
    stored = { period: monthlyAudioPeriod, bytes: 0 };
    await fs.promises.writeFile(monthlyUsageFile, JSON.stringify(stored), { mode: 0o600 });
  }
  if (!/^\d{4}-\d{2}$/.test(stored.period) || !Number.isSafeInteger(stored.bytes) || stored.bytes < 0) {
    throw new Error('monthly-usage-storage-invalid');
  }
  monthlyAudioPeriod = stored.period;
  monthlyAudioBytes = stored.bytes;
}

async function reserveMonthlyAudio(size) {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const currentBytes = currentPeriod === monthlyAudioPeriod ? monthlyAudioBytes : 0;
  if (currentBytes + size > MAX_MONTHLY_AUDIO_BYTES) return false;
  const nextUsage = { period: currentPeriod, bytes: currentBytes + size };
  const tempPath = `${monthlyUsageFile}.tmp`;
  try {
    await fs.promises.writeFile(tempPath, JSON.stringify(nextUsage), { mode: 0o600 });
    await fs.promises.rename(tempPath, monthlyUsageFile);
  } catch {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    throw new Error('monthly-usage-storage-unavailable');
  }
  monthlyAudioPeriod = currentPeriod;
  monthlyAudioBytes = nextUsage.bytes;
  return true;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_REQUEST_BYTES) {
        reject(new Error('request-too-large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(new Error('invalid-json')); }
    });
    req.on('error', reject);
  });
}

function startDownload(videoId, outputDir) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const args = [
      '--no-playlist', '--no-write-thumbnail', '--no-write-info-json', '--no-write-description',
      '--no-embed-thumbnail', '--max-filesize', '120M', '--extract-audio', '--audio-format', 'mp3',
      '--audio-quality', '192K', '--js-runtimes', 'node',
      '-o', path.join(outputDir, '%(title).120B [%(id)s].%(ext)s'), url
    ];
    const child = spawn(process.env.YT_DLP_BIN || 'yt-dlp', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, DOWNLOAD_TIMEOUT_MS);
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-12000); });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(error.code === 'ENOENT' ? 'yt-dlp is unavailable' : 'yt-dlp could not start'));
    });
    child.on('close', async (code) => {
      clearTimeout(timeout);
      if (timedOut) return reject(new Error('Завантаження тривало занадто довго. Спробуйте ще раз.'));
      if (code !== 0) {
        if (/ffmpeg/i.test(stderr) && /not found|missing|failed/i.test(stderr)) return reject(new Error('На сервері не встановлено ffmpeg.'));
        return reject(new Error('YouTube не повернув аудіо. Спробуйте інше відео пізніше.'));
      }
      try {
        const files = await fs.promises.readdir(outputDir);
        const mp3 = files.find((file) => file.toLowerCase().endsWith('.mp3'));
        if (!mp3) return reject(new Error('Сервер не створив MP3-файл.'));
        const filePath = path.join(outputDir, mp3);
        const stats = await fs.promises.stat(filePath);
        if (!stats.size || stats.size > MAX_AUDIO_BYTES) return reject(new Error('Аудіофайл порожній або перевищує ліміт 120 МБ.'));
        resolve({ filePath, fileName: mp3, size: stats.size });
      } catch {
        reject(new Error('Не вдалося відкрити готовий MP3.'));
      }
    });
  });
}

async function handleDownload(req, res) {
  const user = await authorizeUser(req, res);
  if (!user) return;
  if (activeUsers.size >= MAX_CONCURRENT_DOWNLOADS || activeUsers.has(user.id)) {
    return sendJson(res, 429, { error: 'Зачекайте завершення поточного завантаження.' });
  }

  activeUsers.add(user.id);
  let tempDir;
  try {
    const { videoId } = await readJsonBody(req);
    if (typeof videoId !== 'string' || !/^[\w-]{11}$/.test(videoId)) {
      throw new Error('invalid-video-id');
    }
    if (!reserveDownload(user.id)) throw new Error('download-rate-limit');
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'muzika-audio-'));
    const audio = await startDownload(videoId, tempDir);
    if (!await reserveMonthlyAudio(audio.size)) throw new Error('monthly-audio-limit');
    const asciiName = audio.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': audio.size,
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(audio.fileName)}`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    const stream = fs.createReadStream(audio.filePath);
    stream.on('error', () => res.destroy());
    stream.on('close', () => {
      if (tempDir) fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      activeUsers.delete(user.id);
    });
    stream.pipe(res);
    tempDir = null;
  } catch (error) {
    if (tempDir) await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    activeUsers.delete(user.id);
    const status = error.message === 'request-too-large' ? 413
      : ['invalid-json', 'invalid-video-id'].includes(error.message) ? 400
          : ['download-rate-limit', 'monthly-audio-limit'].includes(error.message) ? 429
          : error.message === 'monthly-usage-storage-unavailable' ? 503
          : 502;
    const message = error.message === 'request-too-large' ? 'Запит завеликий.'
      : error.message === 'invalid-json' ? 'Некоректний формат запиту.'
        : error.message === 'invalid-video-id' ? 'Некоректний ідентифікатор відео.'
          : error.message === 'download-rate-limit' ? 'Досягнуто ліміт завантажень. Спробуйте пізніше.'
            : error.message === 'monthly-audio-limit' ? 'Досягнуто місячний ліміт завантаження аудіо. Спробуйте наступного місяця.'
              : error.message === 'monthly-usage-storage-unavailable' ? 'Ліміт завантаження тимчасово недоступний. Спробуйте пізніше.'
              : error.message || 'Не вдалося завантажити аудіо.';
    if (!res.headersSent) sendJson(res, status, { error: message });
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  let url;
  try { url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); }
  catch { return sendJson(res, 400, { error: 'Некоректна адреса.' }); }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    if (req.headers.origin && !applyCors(req, res)) return sendJson(res, 403, { error: 'Джерело запиту не дозволене.' });
    return sendJson(res, 200, { ok: true, downloadAvailable: Boolean(GOOGLE_CLIENT_ID && GOOGLE_ALLOWED_EMAIL) });
  }
  if (url.pathname.startsWith('/api/')) {
    if (!applyCors(req, res)) return sendJson(res, 403, { error: 'Джерело запиту не дозволене.' });
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Cache-Control': 'no-store' });
      return res.end();
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/download') return handleDownload(req, res);
  if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Невідома дія сервера.' });
  return sendJson(res, 404, { error: 'Не знайдено.' });
});

server.headersTimeout = 30_000;
server.requestTimeout = DOWNLOAD_TIMEOUT_MS + 30_000;
loadMonthlyAudioUsage().then(() => {
  server.listen(PORT, HOST, () => {
    console.log(`Muzika remote API listening on port ${PORT}`);
    if (!GOOGLE_CLIENT_ID || !GOOGLE_ALLOWED_EMAIL) console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_ALLOWED_EMAIL.');
  });
}).catch((error) => {
  console.error(`Could not load monthly usage guard: ${error.message}`);
  process.exitCode = 1;
});
