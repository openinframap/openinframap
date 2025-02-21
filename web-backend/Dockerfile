FROM ghcr.io/astral-sh/uv:debian-slim

WORKDIR /app
COPY . /app
RUN uv sync --no-dev

EXPOSE 80
ENTRYPOINT uv run uvicorn main:app --host 0.0.0.0 --port 80 --proxy-headers --forwarded-allow-ips='*'
