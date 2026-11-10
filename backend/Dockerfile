FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV PORT=10000

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
    && python3 -m pip install --break-system-packages --no-cache-dir yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server.js ./server.js

EXPOSE 10000
CMD ["node", "server.js"]
