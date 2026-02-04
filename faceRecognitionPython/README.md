FastAPI Face Recognition Scaffold

Overview

This folder contains a minimal FastAPI scaffold that produces face embeddings and performs simple matching.
It's intentionally portable: if production libraries like `insightface`/`onnxruntime` are available, the service will use them; otherwise it falls back to a deterministic dummy embedder so you can develop and integrate the Node side immediately.

Files
- `app/main.py` - FastAPI app with `/health`, `/enroll`, `/recognize` endpoints.
- `app/model_utils.py` - abstraction to load a model and produce normalized embeddings.
- `app/embeddings_store.py` - simple on-disk JSON store and search helper (linear scan; swap to Faiss for scale).
- `requirements.txt` - minimal dependencies.

Quick start (development)

1. Create a virtualenv and install deps:

```bash
python -m venv venv
# Windows
venv\Scripts\activate
pip install -r faceRecognitionPython/requirements.txt
# Optionally install insightface/onnxruntime/faiss if you want real embeddings
pip install insightface onnxruntime faiss-cpu
```

2. Run service:
docker run --rm -p 8000:8000 narain-face-ai:latest
```bash
uvicorn faceRecognitionPython.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Docker (recommended for production / development to avoid Windows build issues)

1. Build and run using docker-compose (from repo root):

```bash
docker compose build face-ai
docker compose up -d face-ai
```

2. Verify service is up:

```bash
curl http://localhost:8000/health
# expect {"status":"ok"}
```

Notes:
- The Docker image installs system build tools and required native libraries so `insightface`, `onnxruntime`, and `faiss-cpu` can be installed inside the container without MSVC on Windows.
- InsightFace downloads large model files on first use by default. To avoid runtime downloads, this image attempts to fetch recommended models at BUILD TIME using `scripts/download_models.py` and places them in `/root/.insightface/models` inside the image.
  - This reduces startup latency and prevents repeated network downloads in production.
  - If your build environment is air-gapped or you want to skip build-time downloads, the script will be skipped (the image can still run and InsightFace will download models on demand at runtime).
- If you prefer a lighter setup and don't need insightface, run the Python venv approach and omit the heavy packages.

API
- POST `/enroll`  -> body: `{employeeId, images: ["data:image/jpeg;base64,..."], selectTop?: number, weights?: {frontalness, sharpness, area, quality}, preview?: bool, previewImages?: bool }` returns `{success, imagesProcessed, embedding, selectedIndices?, selectedScores?, selectedPreviews?}`
- POST `/recognize` -> body: `{image: "data:...base64", topK: 1}` returns `{success, matches: [{employeeId, score}]}`

Notes
- This scaffold is for development and integration testing. For production, run model loading with GPU/onnxruntime, use Faiss for vector search, secure endpoints, and add authentication, rate-limiting, and logging.
