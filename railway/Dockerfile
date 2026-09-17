FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for ffmpeg and video processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY railway/requirements.txt .

# CPU-only torch first — keeps the image lean (~200MB) instead of the ~2.5GB CUDA
# build ultralytics would otherwise pull in. Railway has no GPU, so CPU is correct.
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install Python dependencies (ultralytics sees torch already satisfied)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY railway/main.py .

# Self-hosted fine-tuned ball model (v1). Loaded in-process by /track when
# USE_LOCAL_MODEL=1 (see main.py). ~19MB.
COPY railway/models/best.pt ./models/best.pt

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
