# MenuLens backend — FastAPI on Python 3.13
# Minimal single-stage image suitable for Render / Railway / Fly.io free tiers
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System deps (httpx http2 uses hpack, pandas needs libstdc++ which is in slim image already)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --upgrade pip && pip install -r backend/requirements.txt

COPY backend /app/backend
COPY tests/fixtures /app/tests/fixtures

ENV APP_PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -fsS http://localhost:${APP_PORT}/health || exit 1

# Render/Fly/Railway는 PORT 환경변수를 주입할 수도 있음
CMD ["sh", "-c", "uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
