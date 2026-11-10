const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Путь к папке "Загрузки" на самом устройстве (или локальная папка app_downloads)
const downloadsDir = path.join(os.homedir?.() || __dirname, 'Downloads', 'YouTubeMusic');

app.post('/download', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).send('URL не вказано');
  }

  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  // Шаблон сохранения: сразу в папку Загрузки с оригинальным названием
  const outputTemplate = path.join(downloadsDir, '%(title)s.%(ext)s');

  // Команда yt-dlp для скачивания в MP3 320kbps
  const command = `yt-dlp -x --audio-format mp3 --audio-quality 320K -o "${outputTemplate}" "${url}"`;

  console.log(`⏳ Починаю завантаження: ${url}`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Помилка: ${error.message}`);
      return res.status(500).send('Помилка конвертації');
    }

    // Ищем последний созданный mp3 файл в папке
    fs.readdir(downloadsDir, (err, files) => {
      if (err || files.length === 0) {
        return res.status(500).send('Файл не знайдено');
      }

      // Сортируем по времени изменения, чтобы взять свежий скачанный файл
      const latestFile = files
        .map(file => ({ file, mtime: fs.statSync(path.join(downloadsDir, file)).mtime }))
        .sort((a, b) => b.mtime - a.mtime)[0]?.file;

      if (!latestFile) {
        return res.status(404).send('MP3 файл не створено');
      }

      const filePath = path.join(downloadsDir, latestFile);

      // Отправляем файл на скачивание в браузер
      res.download(filePath, latestFile, (err) => {
        if (err) console.error('Помилка відправки файлу:', err);
      });
    });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Локальний сервер запущено: http://localhost:${PORT}`);
});