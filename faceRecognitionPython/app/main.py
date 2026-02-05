from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from .utils.model_utils import get_embedder
import uvicorn
import logging
import traceback

app = FastAPI(title='Face Recognition Scaffold')

class EnrollRequest(BaseModel):
    employeeId: str
    images: List[str]
    selectTop: Optional[int] = 10
    weights: Optional[dict] = None  # keys: frontalness, sharpness, area, quality
    preview: Optional[bool] = False
    previewImages: Optional[bool] = False

class RecognizeRequest(BaseModel):
    image: str
    topK: Optional[int] = 1

@app.get('/health')
async def health():
    return {'status': 'ok'}

@app.post('/enroll')
async def enroll(req: EnrollRequest):
    """Enroll using a large set of frames: analyze each frame, score by face area and sharpness,
    pick top candidates and fuse their embeddings.

    Request body: { employeeId: str, images: List[str], selectTop: Optional[int] }
    """
    if not req.images or len(req.images) < 3:
        raise HTTPException(status_code=400, detail='Provide at least 3 images for enrollment')

    # read options
    select_top = int(req.selectTop or 10)
    weights = req.weights or {}
    preview = bool(req.preview)
    preview_images = bool(req.previewImages)

    # default weights (frontalness, sharpness, area, quality)
    w_frontal = float(weights.get('frontalness', 0.4))
    w_sharp = float(weights.get('sharpness', 0.3))
    w_area = float(weights.get('area', 0.2))
    w_quality = float(weights.get('quality', 0.1))

    embedder = get_embedder()

    candidates = []  # each: {embedding, face_area, sharpness, frontalness, quality, idx, original}
    processed = 0

    # helper for sharpness
    def compute_sharpness(arr):
        try:
            import cv2
            gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
            lap = cv2.Laplacian(gray, cv2.CV_64F)
            return float(lap.var())
        except Exception:
            # fallback: variance of gradient using numpy
            g = np.abs(np.diff(arr.astype(np.float32), axis=0)).mean()
            return float(g)

    import numpy as np

    for idx, img in enumerate(req.images):
        try:
            info = embedder.analyze_image(img)
            if not info or not info.get('embedding'):
                logging.warning('Frame %d: no face found', idx)
                continue

            emb = info['embedding']
            face_area = info.get('face_area') or 0
            arr = info.get('raw_arr')
            sharpness = compute_sharpness(arr)
            frontalness = info.get('frontalness') if info.get('frontalness') is not None else 0.0
            quality = info.get('det_score') if info.get('det_score') is not None else 0.0

            candidate = {
                'embedding': emb,
                'face_area': float(face_area),
                'sharpness': float(sharpness),
                'frontalness': float(frontalness),
                'quality': float(quality),
                'idx': idx,
            }
            if preview_images:
                candidate['original'] = req.images[idx]

            candidates.append(candidate)
            processed += 1
        except Exception as e:
            logging.warning('Skipping image during enroll: %s', str(e))
            logging.debug(traceback.format_exc())
            continue

    if not candidates:
        raise HTTPException(status_code=400, detail='No usable face embeddings produced')

    # Normalize metrics
    areas = np.array([c['face_area'] for c in candidates], dtype=np.float32)
    sharp = np.array([c['sharpness'] for c in candidates], dtype=np.float32)
    frontal = np.array([c['frontalness'] for c in candidates], dtype=np.float32)
    qual = np.array([c['quality'] for c in candidates], dtype=np.float32)

    def norm_arr(a):
        if a.max() - a.min() > 0:
            return (a - a.min()) / (a.max() - a.min())
        return np.ones_like(a)

    areas_norm = norm_arr(areas)
    sharp_norm = norm_arr(sharp)
    frontal_norm = norm_arr(frontal)
    qual_norm = norm_arr(qual)

    # combined score
    scores = w_area * areas_norm + w_sharp * sharp_norm + w_frontal * frontal_norm + w_quality * qual_norm

    # pick top-k
    k = min(int(select_top), len(candidates))
    top_idx = np.argsort(scores)[-k:][::-1]
    selected = [candidates[int(i)] for i in top_idx]

    # Fuse selected embeddings
    arr = np.array([s['embedding'] for s in selected], dtype=np.float32)
    fused = arr.mean(axis=0)
    norm = np.linalg.norm(fused)
    if norm > 0:
        fused = (fused / norm).tolist()
    else:
        fused = fused.tolist()

    # NOTE: Embedding is returned to Node; Node saves it to MongoDB
    # No local file I/O here (DB-only mode)

    result = {'success': True, 'imagesProcessed': processed, 'selectedFrames': len(selected), 'embedding': fused, 'version': 'v1', 'selectedIndices': [s['idx'] for s in selected], 'selectedScores': [float(scores[int(i)]) for i in top_idx]}

    if preview and preview_images:
        result['selectedPreviews'] = [s.get('original') for s in selected]

    return result

@app.post('/recognize')
async def recognize(req: RecognizeRequest):
    embedder = get_embedder()
    try:
        qemb = embedder.get_embedding(req.image)
    except Exception as e:
        logging.error('Failed to extract embedding: %s', str(e))
        logging.debug(traceback.format_exc())
        raise HTTPException(status_code=400, detail='Failed to extract embedding: ' + str(e))

    # NOTE: Embedding is returned to Node; Node performs DB lookup and matching
    # No local embeddings_store access here (DB-only mode)
    return {'success': True, 'embedding': qemb}

if __name__ == '__main__':
    uvicorn.run('faceRecognitionPython.app.main:app', host='0.0.0.0', port=8000, reload=True)
