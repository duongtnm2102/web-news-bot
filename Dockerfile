# ===============================
# E-con News Terminal - Production Dockerfile v2.024
# Multi-stage build for optimized production deployment
# Based on best practices from Docker official docs 2024
# ===============================

# ===== BUILD STAGE =====
FROM python:3.11-slim-bookworm as builder

# Metadata
LABEL maintainer="E-con News Terminal Team"
LABEL version="2.024.8"
LABEL description="AI-powered financial news portal with retro brutalism design"

# Set environment variables for build
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies for building
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libc6-dev \
    libffi-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ===== PRODUCTION STAGE =====
FROM python:3.11-slim-bookworm as production

# Security: Create non-root user
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Set environment variables for production
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    FLASK_ENV=production \
    FLASK_DEBUG=False \
    WORKERS=1 \
    TIMEOUT=120 \
    KEEP_ALIVE=2 \
    MAX_REQUESTS=1000 \
    MAX_REQUESTS_JITTER=100

# Set work directory
WORKDIR /app

# Copy application code
COPY --chown=appuser:appuser . .

# Create necessary directories
RUN mkdir -p /app/logs && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

# Expose port
EXPOSE 8080

# Default command - using gunicorn for production
CMD ["gunicorn", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "1", \
     "--worker-class", "eventlet", \
     "--timeout", "120", \
     "--keep-alive", "2", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "100", \
     "--preload", \
     "--log-level", "info", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "run:app"]

# ===== DEVELOPMENT STAGE (optional) =====
FROM production as development

# Switch back to root to install dev dependencies
USER root

# Install development tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    vim \
    htop \
    && rm -rf /var/lib/apt/lists/*

# Install development Python packages
RUN pip install --no-cache-dir \
    pytest \
    pytest-cov \
    black \
    flake8 \
    isort

# Switch back to app user
USER appuser

# Override command for development
CMD ["python", "run.py"]

# ===============================
# BUILD INSTRUCTIONS
# ===============================

# Build production image:
# docker build --target production -t econ-news-terminal:latest .

# Build development image:
# docker build --target development -t econ-news-terminal:dev .

# Run production container:
# docker run -d -p 8080:8080 \
#   -e GEMINI_API_KEY=your_api_key \
#   -e SECRET_KEY=your_secret_key \
#   --name econ-news \
#   econ-news-terminal:latest

# Run development container:
# docker run -d -p 8080:8080 \
#   -v $(pwd):/app \
#   -e FLASK_DEBUG=True \
#   -e GEMINI_API_KEY=your_api_key \
#   --name econ-news-dev \
#   econ-news-terminal:dev

# ===============================
# SECURITY FEATURES
# ===============================
# ✅ Non-root user execution
# ✅ Minimal base image (slim-bookworm)
# ✅ No cache directories
# ✅ Clean package lists
# ✅ Multi-stage build (smaller final image)
# ✅ Health checks
# ✅ Proper file permissions
# ✅ Production-ready gunicorn configuration

# ===============================
# OPTIMIZATION FEATURES
# ===============================
# ✅ Virtual environment isolation
# ✅ Layer caching optimization
# ✅ Minimal runtime dependencies
# ✅ Gunicorn with eventlet worker
# ✅ Memory-efficient configuration
# ✅ Proper signal handling
# ✅ Request limits and timeouts
