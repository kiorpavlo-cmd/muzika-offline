'use strict';

const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const { randomUUID } = require('crypto');
const { Readable, Transform } = require('stream');
const { pipeline } = require('stream/promises');

const app = express();
const port = Number(process.env.PORT) || 3000;
const downloadsDir = path.join(os.homedir(), 'Downloads', 'AudioFiles');
const maxFileSize = 100 * 1024 * 1024;
const allowedHosts = new Set(
  (process.env.ALLOWED_AUDIO_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
);
const allowedOrigins = new Set([
  'https://kiorpavlo-cmd.github.io',
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)
]);

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  }
}));
app.use(express.json({ limit: '12kb' }));

const extensionsByMime = new Map([
  ['audio/aac', '.aac'],
  ['audio/flac', '.flac'],
  ['audio/mp4', '.m4a'],
  ['audio/mpeg', '.mp3'],
  ['audio/ogg', '.ogg'],
  ['audio/opus', '.opus'],
  ['audio/wav', '.wav'],
  ['audio/x-wav', '.wav']
]);
const allowedExtensions = new Set(extensionsByMime.values());

function safeBaseName(value) {
  return value
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 120) || 'audio';
}

function decodePathname(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/download', async (req, res) => {
  const { url } = req.body || {};
  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).send('URL не вказано');
  }

  let source;
  try {
    source = new URL(url);
  } catch {
    return res.status(400).send('Некоректний URL');
  }

  const host = source.hostname.toLowerCase();
  if (source.protocol !== 'https:' || source.username || source.password) {
    return res.status(400).send('Дозволені лише прямі HTTPS-посилання на аудіофайли');
  }

  if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be' || host.endsWith('.youtu.be')) {
    return res.status(403).send('Завантаження аудіо з YouTube через цей сервер недоступне.');
  }
  if (!allowedHosts.has(host)) {
    return res.status(403).send('Домен не дозволений. Додайте його до ALLOWED_AUDIO_HOSTS.');
  }

  let upstream;
  try {
    upstream = await fetch(source, {
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: 'audio/*, application/octet-stream;q=0.8' }
    });
  } catch {
    return res.status(502).send('Не вдалося отримати аудіофайл');
  }

  if (!upstream.ok || !upstream.body) {
    return res.status(502).send('Джерело не повернуло аудіофайл');
  }

  const mime = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const decodedPathname = decodePathname(source.pathname);
  const urlExtension = path.extname(decodedPathname).toLowerCase();
  const extension = extensionsByMime.get(mime) || urlExtension;
  if ((!mime.startsWith('audio/') && mime !== 'application/octet-stream') || !allowedExtensions.has(extension)) {
    return res.status(415).send('Посилання має вести безпосередньо на підтримуваний аудіофайл');
  }

  const declaredSize = Number(upstream.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > maxFileSize) {
    return res.status(413).send('Файл завеликий (ліміт 100 МБ)');
  }

  const rawName = path.basename(decodedPathname, path.extname(decodedPathname));
  const fileName = `${safeBaseName(rawName)}-${randomUUID().slice(0, 8)}${extension}`;
  const filePath = path.join(downloadsDir, fileName);
  let receivedSize = 0;
  const sizeLimit = new Transform({
    transform(chunk, _encoding, callback) {
      receivedSize += chunk.length;
      callback(receivedSize > maxFileSize ? new Error('File exceeds 100 MB limit') : null, chunk);
    }
  });

  try {
    await fs.mkdir(downloadsDir, { recursive: true });
    await pipeline(Readable.fromWeb(upstream.body), sizeLimit, createWriteStream(filePath, { flags: 'wx' }));
  } catch (error) {
    await fs.rm(filePath, { force: true }).catch(() => {});
    if (error.message.includes('100 MB')) return res.status(413).send('Файл завеликий (ліміт 100 МБ)');
    return res.status(500).send('Не вдалося зберегти аудіофайл');
  }

  res.download(filePath, fileName, (error) => {
    if (error && !res.headersSent) res.status(500).end('Не вдалося надіслати файл');
  });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Локальний сервер запущено: http://127.0.0.1:${port}`);
  console.log(`Файли зберігаються в: ${downloadsDir}`);
  if (!allowedHosts.size) console.log('Перед завантаженням задайте ALLOWED_AUDIO_HOSTS зі списком дозволених доменів.');
});
