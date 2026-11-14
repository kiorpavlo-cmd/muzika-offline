const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

const ROOT = __dirname;
const CERT_DIR = path.join(ROOT, '.local-certs');
const HTTP_PORT = Number(process.env.MUZIKA_SETUP_PORT || 3000);
const HTTPS_PORT = Number(process.env.MUZIKA_PORT || 3443);
const HOST = process.env.MUZIKA_HOST || '0.0.0.0';
const MAX_REQUEST_BYTES = 2048;
const MAX_AUDIO_BYTES = 120 * 1024 * 1024;
const LIBRARY_AUDIO_EXTENSIONS = new Set([
  '.mp3', '.m4a', '.mp4', '.flac', '.ogg', '.oga', '.opus',
  '.wav', '.aiff', '.aif', '.wma', '.ape', '.wv', '.mpc', '.tta'
]);
let cachedLibrary = { root: '', savedAt: 0, tracks: [] };
const DOWNLOAD_TIMEOUT_MS = 8 * 60 * 1000;
const ALLOWED_CORS_ORIGINS = new Set((process.env.MUZIKA_ALLOWED_ORIGINS || 'https://kiorpavlo-cmd.github.io')
  .split(',').map((origin) => origin.trim()).filter(Boolean));

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.manifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function writeJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(payload));
}

function getLanAddresses() {
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) addresses.push(entry.address);
    }
  }
  return [...new Set(addresses)];
}

function runOpenSsl(args, label) {
  try {
    execFileSync('openssl', args, { stdio: 'ignore' });
  } catch (error) {
    throw new Error(`Не вдалося підготувати HTTPS-сертифікат (${label}). Перевірте, що встановлено OpenSSL.`);
  }
}

function safeHostname() {
  const rawHostname = os.hostname().toLowerCase();
  const hostname = rawHostname.endsWith('.local') ? rawHostname : `${rawHostname}.local`;
  return hostname.replace(/[^a-z0-9.-]/g, '-');
}

function createCertificates() {
  fs.mkdirSync(CERT_DIR, { recursive: true, mode: 0o700 });
  const caKey = path.join(CERT_DIR, 'ipod-ca-key.pem');
  const caCert = path.join(CERT_DIR, 'ipod-ca.pem');
  const serverKey = path.join(CERT_DIR, 'ipod-server-key.pem');
  const serverCsr = path.join(CERT_DIR, 'ipod-server.csr');
  const serverCert = path.join(CERT_DIR, 'ipod-server.pem');
  const caConfig = path.join(CERT_DIR, 'ipod-ca.cnf');
  const serverExt = path.join(CERT_DIR, 'ipod-server.ext');
  const hostname = safeHostname();
  const lanAddresses = getLanAddresses();

  if (!fs.existsSync(caKey) || !fs.existsSync(caCert)) {
    fs.writeFileSync(caConfig, [
      '[req]',
      'distinguished_name = dn',
      'x509_extensions = v3_ca',
      'prompt = no',
      '[dn]',
      'CN = iPod Local Audio CA',
      '[v3_ca]',
      'basicConstraints = critical,CA:TRUE',
      'keyUsage = critical,keyCertSign,cRLSign',
      'subjectKeyIdentifier = hash'
    ].join('\n'));
    runOpenSsl([
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '3650',
      '-keyout', caKey, '-out', caCert, '-config', caConfig, '-extensions', 'v3_ca'
    ], 'root CA');
    fs.chmodSync(caKey, 0o600);
  }

  const sanEntries = [`DNS.1 = ${hostname}`, 'DNS.2 = localhost', 'IP.1 = 127.0.0.1'];
  lanAddresses.forEach((address, index) => sanEntries.push(`IP.${index + 2} = ${address}`));
  fs.writeFileSync(serverExt, [
    'basicConstraints = critical,CA:FALSE',
    'keyUsage = critical,digitalSignature,keyEncipherment',
    'extendedKeyUsage = serverAuth',
    'subjectKeyIdentifier = hash',
    'authorityKeyIdentifier = keyid,issuer',
    'subjectAltName = @alt_names',
    '[alt_names]',
    ...sanEntries
  ].join('\n'));

  runOpenSsl([
    'req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', serverKey,
    '-out', serverCsr, '-subj', `/CN=${hostname}`
  ], 'server key');
  runOpenSsl([
    'x509', '-req', '-in', serverCsr, '-CA', caCert, '-CAkey', caKey,
    '-CAcreateserial', '-out', serverCert, '-days', '825', '-sha256', '-extfile', serverExt
  ], 'server certificate');
  fs.chmodSync(serverKey, 0o600);

  let tokenPath = path.join(CERT_DIR, 'download-token');
  if (!fs.existsSync(tokenPath)) {
    fs.writeFileSync(tokenPath, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  }
  const token = fs.readFileSync(tokenPath, 'utf8').trim();

  const caDer = execFileSync('openssl', ['x509', '-in', caCert, '-outform', 'DER']).toString('base64');
  const profileUUID = crypto.randomUUID().toUpperCase();
  const certificateUUID = crypto.randomUUID().toUpperCase();
  const profile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>PayloadContent</key><array><dict>
    <key>PayloadCertificateFileName</key><string>iPod-Local-Audio-CA.cer</string>
    <key>PayloadContent</key><data>${caDer}</data>
    <key>PayloadDescription</key><string>Дозволяє iPhone довіряти локальному серверу iPod на цьому Mac.</string>
    <key>PayloadDisplayName</key><string>iPod Local Audio CA</string>
    <key>PayloadIdentifier</key><string>app.ipod.local.ca</string>
    <key>PayloadType</key><string>com.apple.security.root</string>
    <key>PayloadUUID</key><string>${certificateUUID}</string>
    <key>PayloadVersion</key><integer>1</integer>
  </dict></array>
  <key>PayloadDisplayName</key><string>iPod Local Audio Server</string>
  <key>PayloadIdentifier</key><string>app.ipod.local.profile</string>
  <key>PayloadOrganization</key><string>iPod</string>
  <key>PayloadRemovalDisallowed</key><false/>
  <key>PayloadType</key><string>Configuration</string>
  <key>PayloadUUID</key><string>${profileUUID}</string>
  <key>PayloadVersion</key><integer>1</integer>
</dict></plist>`;

  fs.writeFileSync(path.join(CERT_DIR, 'install-ca.mobileconfig'), profile, { mode: 0o600 });
  return { caCert, serverCert, serverKey, hostname, lanAddresses, token, profile };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_REQUEST_BYTES) {
        reject(new Error('Запит завеликий.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Некоректний формат запиту.'));
      }
    });
    req.on('error', reject);
  });
}

function cookieValue(req, key) {
  const cookies = (req.headers.cookie || '').split(';');
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === key) return cookie.slice(separator + 1).trim();
  }
  return '';
}

function sameToken(left, right) {
  const leftBuffer = Buffer.from(left || '');
  const rightBuffer = Buffer.from(right || '');
  return leftBuffer.length === rightBuffer.length && leftBuffer.length > 0 && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function applyApiCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (!ALLOWED_CORS_ORIGINS.has(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');
  res.setHeader('Vary', 'Origin');
  return true;
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

    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-12000);
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      if (error.code === 'ENOENT') reject(new Error('На Mac не встановлено yt-dlp. Запустіть: brew install yt-dlp'));
      else reject(new Error(`Не вдалося запустити yt-dlp: ${error.message}`));
    });
    child.on('close', async (code) => {
      clearTimeout(timeout);
      if (timedOut) return reject(new Error('Час завантаження вичерпано. Спробуйте ще раз.'));
      if (code !== 0) {
        if (/ffmpeg/i.test(stderr) && /not found|missing|failed/i.test(stderr)) {
          return reject(new Error('Для конвертації MP3 потрібен ffmpeg. Запустіть: brew install ffmpeg'));
        }
        const detail = stderr.trim().split('\n').filter(Boolean).slice(-2).join(' ').slice(-500);
        return reject(new Error(detail || `yt-dlp завершився з кодом ${code}.`));
      }

      try {
        const files = await fs.promises.readdir(outputDir);
        const mp3 = files.find((file) => file.toLowerCase().endsWith('.mp3'));
        if (!mp3) return reject(new Error('yt-dlp завершив роботу, але MP3-файл не створено.'));
        const filePath = path.join(outputDir, mp3);
        const stats = await fs.promises.stat(filePath);
        if (!stats.size || stats.size > MAX_AUDIO_BYTES) return reject(new Error('Аудіофайл порожній або завеликий для збереження.'));
        resolve({ filePath, fileName: mp3, size: stats.size });
      } catch (error) {
        reject(error);
      }
    });
  });
}

function isAuthorized(req, token) {
  const bearerToken = /^Bearer\s+([a-f0-9]{64})$/i.exec(req.headers.authorization || '')?.[1] || '';
  return sameToken(cookieValue(req, 'muzika_download'), token) || sameToken(bearerToken, token);
}

function configuredLibraryRoot() {
  let folder = process.env.MUZIKA_LIBRARY_ROOT || '';
  if (!folder) {
    try {
      const settingsPath = path.join(os.homedir(), 'Library', 'Application Support', 'Audio Library Tagger', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      folder = settings.folder || '';
    } catch {
      folder = '';
    }
  }
  if (!folder) throw new Error('Сначала откройте iPod на Mac, выберите музыкальную папку и запустите сканирование.');
  const root = path.resolve(folder);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error('Папка медиатеки недоступна. Выберите папку заново в iPod на Mac.');
  }
  return root;
}

function readCachedTrackTags(root) {
  const cachePath = path.join(os.homedir(), 'Library', 'Application Support', 'Audio Library Tagger', 'library_cache.json');
  try {
    const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const rows = payload?.libraries?.[root]?.rows;
    if (!Array.isArray(rows)) return new Map();
    return new Map(rows.filter((row) => row?.path).map((row) => [path.resolve(row.path), row]));
  } catch {
    return new Map();
  }
}

async function listLibraryTracks() {
  const root = configuredLibraryRoot();
  if (cachedLibrary.root === root && Date.now() - cachedLibrary.savedAt < 4000) return cachedLibrary.tracks;
  const tags = readCachedTrackTags(root);
  const tracks = [];
  async function walk(directory) {
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(candidate);
        continue;
      }
      if (!entry.isFile() || !LIBRARY_AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      let realPath;
      try { realPath = await fs.promises.realpath(candidate); } catch { continue; }
      if (realPath !== root && !realPath.startsWith(root + path.sep)) continue;
      const stat = await fs.promises.stat(realPath);
      const relative = path.relative(root, realPath);
      const row = tags.get(realPath) || {};
      const stem = path.basename(realPath, path.extname(realPath));
      const pieces = stem.split(/\s+[—–-]\s+/);
      const fallbackArtist = pieces.length > 1 ? pieces[0] : '';
      const fallbackTitle = pieces.length > 1 ? pieces.slice(1).join(' — ') : stem;
      const yearMatch = stem.match(/\b(?:19|20)\d{2}\b/);
      tracks.push({
        id: Buffer.from(relative).toString('base64url'),
        file: path.basename(realPath),
        size: stat.size,
        mtime: Math.trunc(stat.mtimeMs),
        artist: row.artist || fallbackArtist,
        title: row.title || fallbackTitle,
        album: row.album || '',
        year: row.year || (yearMatch ? yearMatch[0] : ''),
        genre: row.genre || ''
      });
    }
  }
  await walk(root);
  tracks.sort((a, b) => a.file.localeCompare(b.file, undefined, { sensitivity: 'base' }));
  cachedLibrary = { root, savedAt: Date.now(), tracks };
  return tracks;
}

function requestLibraryList(req, res, token) {
  if (!isAuthorized(req, token)) return writeJson(res, 401, { error: 'Невірний код доступу до сервера iPod.' });
  listLibraryTracks()
    .then((tracks) => writeJson(res, 200, { total: tracks.length, tracks }))
    .catch((error) => writeJson(res, 400, { error: error.message || 'Не вдалося прочитати медіатеку Mac.' }));
}

function requestLibraryAudio(req, res, token, url) {
  if (!isAuthorized(req, token)) return writeJson(res, 401, { error: 'Невірний код доступу до сервера iPod.' });
  const id = url.searchParams.get('id') || '';
  let relative;
  try {
    relative = Buffer.from(id, 'base64url').toString('utf8');
    if (!relative || Buffer.from(relative).toString('base64url') !== id) throw new Error('bad-id');
  } catch {
    return writeJson(res, 400, { error: 'Некоректний ідентифікатор аудіофайлу.' });
  }
  let root;
  try { root = configuredLibraryRoot(); } catch (error) {
    return writeJson(res, 400, { error: error.message || 'Папка медіатеки недоступна.' });
  }
  const candidate = path.resolve(root, relative);
  if (candidate === root || !candidate.startsWith(root + path.sep) ||
      !LIBRARY_AUDIO_EXTENSIONS.has(path.extname(candidate).toLowerCase())) {
    return writeJson(res, 403, { error: 'Доступ до цього файлу заборонено.' });
  }
  fs.promises.realpath(candidate).then(async (filePath) => {
    if (!filePath.startsWith(root + path.sep)) throw new Error('outside-library');
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) throw new Error('not-a-file');
    const extension = path.extname(filePath).toLowerCase();
    const contentType = {
      '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.mp4': 'audio/mp4',
      '.flac': 'audio/flac', '.ogg': 'audio/ogg', '.oga': 'audio/ogg',
      '.opus': 'audio/ogg', '.wav': 'audio/wav', '.aiff': 'audio/aiff',
      '.aif': 'audio/aiff', '.wma': 'audio/x-ms-wma', '.ape': 'audio/ape',
      '.wv': 'audio/wavpack', '.mpc': 'audio/x-musepack', '.tta': 'audio/x-tta'
    }[extension] || 'application/octet-stream';
    const fileName = path.basename(filePath);
    const safeName = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="' + safeName + '"; filename*=UTF-8\'\'' + encodeURIComponent(fileName),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    fs.createReadStream(filePath).on('error', () => res.destroy()).pipe(res);
  }).catch(() => writeJson(res, 404, { error: 'Файл не знайдено або він переміщений.' }));
}

function requestDownload(req, res, token) {
  if (!isAuthorized(req, token)) return writeJson(res, 401, { error: 'Невірний код доступу до сервера завантаження.' });

  readJsonBody(req).then(async ({ videoId }) => {
    if (typeof videoId !== 'string' || !/^[\w-]{11}$/.test(videoId)) {
      return writeJson(res, 400, { error: 'Некоректний ідентифікатор YouTube-відео.' });
    }

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'muzika-audio-'));
    try {
      const audio = await startDownload(videoId, tempDir);
      const asciiName = audio.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audio.size,
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(audio.fileName)}`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      const stream = fs.createReadStream(audio.filePath);
      stream.on('error', () => {
        if (!res.headersSent) writeJson(res, 500, { error: 'Не вдалося прочитати готовий MP3.' });
        else res.destroy();
      });
      stream.on('close', () => fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {}));
      stream.pipe(res);
    } catch (error) {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      if (!res.headersSent) writeJson(res, 502, { error: error.message || 'Не вдалося завантажити аудіо.' });
    }
  }).catch((error) => {
    if (!res.headersSent) writeJson(res, 400, { error: error.message || 'Некоректний запит.' });
  });
}

function handleHttps(req, res, token) {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);

  if (url.pathname.startsWith('/api/')) {
    const corsAllowed = applyApiCors(req, res);
    if (req.method === 'OPTIONS') {
      if (!corsAllowed) return writeJson(res, 403, { error: 'Джерело запиту не дозволене.' });
      res.writeHead(204, { 'Cache-Control': 'no-store' });
      return res.end();
    }
    if (!corsAllowed) return writeJson(res, 403, { error: 'Джерело запиту не дозволене.' });
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return writeJson(res, 200, {
      ok: true,
      ytDlpAvailable: process.env.YT_DLP_BIN ? fs.existsSync(process.env.YT_DLP_BIN) : Boolean(process.env.PATH?.split(path.delimiter).some((part) => fs.existsSync(path.join(part, 'yt-dlp')))),
      ffmpegAvailable: Boolean(process.env.PATH?.split(path.delimiter).some((part) => fs.existsSync(path.join(part, 'ffmpeg'))))
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/library') return requestLibraryList(req, res, token);
  if (req.method === 'GET' && url.pathname === '/api/library/audio') return requestLibraryAudio(req, res, token, url);
  if (req.method === 'POST' && url.pathname === '/api/download') return requestDownload(req, res, token);
  if (url.pathname.startsWith('/api/')) return writeJson(res, 404, { error: 'Невідома дія сервера.' });

  if (req.method !== 'GET' && req.method !== 'HEAD') return writeJson(res, 405, { error: 'Метод не підтримується.' });

  if (req.method === 'GET' && url.pathname === '/' && url.searchParams.get('token')) {
    if (!sameToken(url.searchParams.get('token'), token)) return writeJson(res, 403, { error: 'Невірний код налаштування.' });
    res.writeHead(303, {
      'Location': '/',
      'Set-Cookie': `muzika_download=${token}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Strict`,
      'Cache-Control': 'no-store'
    });
    return res.end();
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    return writeJson(res, 400, { error: 'Некоректна адреса.' });
  }
  const relativePath = path.normalize(decodedPath.replace(/^[/\\]+/, ''));
  let filePath = path.resolve(ROOT, relativePath || 'index.html');
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) return writeJson(res, 403, { error: 'Доступ заборонено.' });
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return writeJson(res, 404, { error: 'Файл не знайдено.' });

  const extension = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Cache-Control': extension === '.js' || path.basename(filePath) === 'sw.js' ? 'no-cache' : 'public, max-age=3600',
    'Content-Length': fs.statSync(filePath).size
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filePath).pipe(res);
}

function handleSetup(req, res, profile, hostname, lanAddresses, token) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/install-ca.mobileconfig') {
    res.writeHead(200, {
      'Content-Type': 'application/x-apple-aspen-config',
      'Content-Disposition': 'attachment; filename="iPod-Local-Audio-CA.mobileconfig"',
      'Cache-Control': 'no-store'
    });
    return req.method === 'HEAD' ? res.end() : res.end(profile);
  }

  if (req.method === 'GET' && url.pathname === '/health') return writeJson(res, 200, { ok: true, hostname });
  const hostHeader = req.headers.host || hostname;
  const setupHost = hostHeader.replace(/:\d+$/, '').toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(setupHost) || (setupHost !== hostname && !lanAddresses.includes(setupHost))) {
    return writeJson(res, 400, { error: 'Відкрийте сторінку за адресою Mac у локальній мережі.' });
  }

  const secure = Boolean(req.socket.encrypted);
  const apiOrigin = `https://${setupHost}:${HTTPS_PORT}`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  if (!secure) {
    const secureSetupUrl = `${apiOrigin}/setup`;
    return res.end(`<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>iPod — підключення</title><main style="font:17px/1.5 system-ui,-apple-system,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;color:#222"><h1>iPod: передавання музики на iPhone</h1><p><strong>Під’єднайте iPhone і Mac до однієї мережі Wi‑Fi.</strong> Через 5G телефон не зможе під’єднатися до Mac.</p><ol><li><a href="/install-ca.mobileconfig">Завантажте та встановіть профіль сертифіката iPod.</a></li><li>У «Параметри» → «Загальні» → «Про пристрій» → «Параметри довіри сертифікатам» (Certificate Trust Settings) увімкніть повну довіру до «iPod Local Audio CA».</li><li>Після цього відкрийте <a href="${secureSetupUrl}">захищену сторінку продовження</a>.</li></ol><p>Профіль довіри й посилання підключення працюватимуть лише з цим Mac у тій самій Wi‑Fi мережі.</p></main></html>`);
  }

  const pwaUrl = new URL('https://kiorpavlo-cmd.github.io/muzika-offline/');
  pwaUrl.hash = new URLSearchParams({
    'muzika-download-server': apiOrigin,
    'muzika-download-token': token
  }).toString();
  const appUrl = pwaUrl.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  res.end(`<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>iPod — підключення</title><main style="font:17px/1.5 system-ui,-apple-system,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;color:#222"><h1>iPod: підключення завершено</h1><p>Натисніть, щоб відкрити GitHub-версію iPod з підключенням до локального сервера Mac:</p><p><a href="${appUrl}">Відкрити iPod</a></p><p>Якщо посилання відкрило Safari, а ви користуєтеся застосунком з іконки на екрані «Домівка»: скопіюйте посилання вище, відкрийте iPod з іконки → «Налаштування» → «Завантаження з Mac», вставте посилання та натисніть «Підключити сервер».</p><p>Залиште сервер iPod запущеним на Mac, поки триває завантаження. Після цього аудіо залишиться в медіатеці на iPhone і працюватиме офлайн.</p><p style="color:#666;font-size:14px">Адреса локального сервера: ${apiOrigin}</p></main></html>`);
}

function main() {
  const certs = createCertificates();
  const tlsOptions = {
    key: fs.readFileSync(certs.serverKey),
    cert: fs.readFileSync(certs.serverCert),
    ca: fs.readFileSync(certs.caCert)
  };

  const secureServer = https.createServer(tlsOptions, (req, res) => {
    const requestUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    if (requestUrl.pathname === '/setup' || requestUrl.pathname === '/install-ca.mobileconfig') {
      return handleSetup(req, res, certs.profile, certs.hostname, certs.lanAddresses, certs.token);
    }
    return handleHttps(req, res, certs.token);
  });
  secureServer.on('error', (error) => console.error(`Не вдалося відкрити HTTPS-порт ${HTTPS_PORT}: ${error.message}`));
  secureServer.listen(HTTPS_PORT, HOST, () => {
      console.log(`Налаштування iPod: https://${certs.hostname}:${HTTPS_PORT}/setup`);
      for (const address of certs.lanAddresses) {
        console.log(`Налаштування iPhone у Wi-Fi: https://${address}:${HTTPS_PORT}/setup`);
        console.log(`Початкова сторінка iPhone: http://${address}:${HTTP_PORT}/`);
        console.log(`Сертифікат в мережі: http://${address}:${HTTP_PORT}/install-ca.mobileconfig`);
      }
      console.log(`Встановлення сертифіката iPhone: http://${certs.hostname}:${HTTP_PORT}/install-ca.mobileconfig`);
      if (!process.env.PATH?.split(path.delimiter).some((part) => fs.existsSync(path.join(part, 'yt-dlp')))) {
        console.warn('Не знайдено yt-dlp. Встановіть його командою: brew install yt-dlp');
      }
      if (!process.env.PATH?.split(path.delimiter).some((part) => fs.existsSync(path.join(part, 'ffmpeg')))) {
        console.warn('Не знайдено ffmpeg. Встановіть його командою: brew install ffmpeg');
      }
      console.log('Завантажені аудіофайли зберігаються у локальній медіатеці застосунку на пристрої.');
    });

  const setupServer = http.createServer((req, res) => handleSetup(req, res, certs.profile, certs.hostname, certs.lanAddresses, certs.token));
  setupServer.on('error', (error) => console.error(`Не вдалося відкрити HTTP-порт ${HTTP_PORT}: ${error.message}`));
  setupServer.listen(HTTP_PORT, HOST, () => {
      console.log(`Сторінка встановлення сертифіката: http://${certs.hostname}:${HTTP_PORT}/`);
    });
}

main();
