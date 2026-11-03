FROM python:3.12-slim
WORKDIR /workspace
COPY --from=ghcr.io/astral-sh/uv:0.13.6 /uv /usr/local/bin/uv
COPY apps/api /workspace/apps/api
WORKDIR /workspace/apps/api
RUN uv sync --frozen --no-dev
RUN useradd --system --uid 10001 bluesteps
USER bluesteps
EXPOSE 8000
CMD [".venv/bin/python", "-m", "uvicorn", "bluesteps_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
