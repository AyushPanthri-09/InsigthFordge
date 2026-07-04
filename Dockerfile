FROM node:22-bookworm-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    DEBUG=false \
    VITE_INSIGHTFORGE_API_URL=""

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        python-is-python3 \
        python3 \
        python3-pip \
        python3-venv \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN python -m venv /opt/venv \
    && pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r backend/requirements.txt

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build \
    && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm", "run", "start:railway"]
