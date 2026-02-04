# Dockerfile for Face Recognition AI service
FROM python:3.10-slim

# Install system dependencies needed for building native libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    wget \
    unzip \
    libgl1-mesa-dri \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libopencv-dev \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for layer caching
COPY requirements.txt /app/requirements.txt

# Upgrade pip and install Python deps
RUN python -m pip install --upgrade pip setuptools wheel
RUN pip install -r /app/requirements.txt

# Copy application code
COPY . /app

# Download recommended models at build time to avoid runtime downloads
# This will download the default set in scripts/download_models.py into /root/.insightface/models
RUN python /app/scripts/download_models.py --dest /root/.insightface/models || echo "Model download step failed; container can still run but insightface may download models at runtime"

# Ensure embeddings store exists
# Use a single-line Python invocation so the Dockerfile parser doesn't split on newlines
RUN python -c "import json,os; p='embeddings.json'; open(p,'w').write(json.dumps({})) if not os.path.exists(p) else None"

EXPOSE 8000

# Start the FastAPI app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
