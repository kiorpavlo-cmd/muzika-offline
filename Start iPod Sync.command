#!/bin/bash
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
if ! command -v node >/dev/null 2>&1; then
  echo "Для синхронізації потрібен Node.js. Встановіть його з nodejs.org або через Homebrew: brew install node"
  read -r -p "Натисніть Enter, щоб закрити це вікно…" _
  exit 1
fi
echo "iPod Sync Server запускається. На iPhone відкрийте адресу, надруковану нижче."
exec node server.js
