import base64
import io
import os
import time
import logging
import numpy as np
from PIL import Image

# Try to import a production library, fallback gracefully
try:
    import insightface
    from insightface.app import FaceAnalysis
    HAS_INSIGHT = True
except Exception:
    HAS_INSIGHT = False


class Embedder:
    def __init__(self):
        self.model = None
        if HAS_INSIGHT:
            # Minimal insightface init - adjust providers/runtime as needed
            self.model = FaceAnalysis(providers=['CPUExecutionProvider'])
            self.model.prepare(ctx_id=0, det_size=(640, 640))

    def _load_image(self, data_url_or_b64):
        # Accept data URLs or raw base64 strings
        if data_url_or_b64.startswith('data:'):
            header, b64 = data_url_or_b64.split(',', 1)
        else:
            b64 = data_url_or_b64
        img_bytes = base64.b64decode(b64)
        return Image.open(io.BytesIO(img_bytes)).convert('RGB')

    def get_embedding(self, data_url_or_b64):
        img = self._load_image(data_url_or_b64)
        arr = np.asarray(img)

        if HAS_INSIGHT and self.model is not None:
            faces = self.model.get(arr)
            if not faces:
                # Save a debug image and log details so we can inspect failures
                try:
                    debug_dir = '/app/failed_images'
                    os.makedirs(debug_dir, exist_ok=True)
                    ts = int(time.time() * 1000)
                    debug_path = os.path.join(debug_dir, f'failed_{ts}.jpg')
                    Image.fromarray(arr).save(debug_path)
                    logging.warning('No face detected. Saved sample image to %s (shape=%s, min=%s, max=%s)', debug_path, arr.shape, arr.min() if hasattr(arr, 'min') else 'n/a', arr.max() if hasattr(arr, 'max') else 'n/a')
                except Exception as ex:
                    logging.warning('Failed to save debug image: %s', ex)
                raise ValueError('No face detected; saved sample image (check container logs)')
            # Use the first detected face
            face = faces[0]
            emb = face.embedding  # numpy array

            # Attempt to compute frontalness and eye openness if landmarks present
            frontalness = None
            eye_open = None
            det_score = None
            try:
                # detection score (if provided by insightface)
                det_score = float(getattr(face, 'det_score', getattr(face, 'score', 0.0)) or 0.0)
            except Exception:
                det_score = None

            # landmarks: try common attributes
            kps = None
            if hasattr(face, 'kps'):
                kps = np.asarray(face.kps)
            elif hasattr(face, 'landmark_2d_106'):
                kps = np.asarray(face.landmark_2d_106)
            elif hasattr(face, 'kps3d'):
                kps = np.asarray(face.kps3d)

            try:
                if kps is not None and kps.shape[0] >= 48:
                    # standard 68-point mapping available
                    # left eye: 36-41, right eye: 42-47, nose tip: 30 (0-based)
                    le = kps[36:42]
                    re = kps[42:48]
                    nose = kps[30]

                    # frontalness approx: symmetry of nose to eyes distances
                    dist_left = np.linalg.norm(nose - le.mean(axis=0))
                    dist_right = np.linalg.norm(nose - re.mean(axis=0))
                    denom = max(dist_left, dist_right, 1e-6)
                    frontalness = 1.0 - abs(dist_left - dist_right) / denom

                    # EAR (eye aspect ratio) for both eyes
                    def ear(eye):
                        # eye is 6 points
                        p1, p2, p3, p4, p5, p6 = eye
                        return (np.linalg.norm(p2 - p6) + np.linalg.norm(p3 - p5)) / (2.0 * (np.linalg.norm(p1 - p4) + 1e-6))
                    ear_l = ear(le)
                    ear_r = ear(re)
                    eye_open = float((ear_l + ear_r) / 2.0)
                else:
                    # Fallback: estimate frontalness using bbox symmetry
                    bbox = getattr(face, 'bbox', None)
                    if bbox is not None:
                        x1, y1, x2, y2 = bbox.astype(int).tolist() if hasattr(bbox, 'astype') else bbox
                        w = max(1, x2 - x1)
                        h = max(1, y2 - y1)
                        frontalness = 1.0 - abs((x1 + w/2.0) - (arr.shape[1]/2.0)) / (arr.shape[1]/2.0)
                        eye_open = None
            except Exception:
                frontalness = None
                eye_open = None

            # Return only normalized embedding for compatibility
            return self._normalize(emb)

        # Fallback deterministic embedder (NOT for production)
        # Resize + convert to float vector and hash
        img_small = img.resize((64, 64)).convert('L')
        v = np.asarray(img_small).astype(np.float32).flatten()
        # Reduce dimension to 128 by simple projection (deterministic)
        rng = np.random.RandomState(seed=42)
        proj = rng.randn(len(v), 128).astype(np.float32)
        emb = v.dot(proj)
        return self._normalize(emb)

    def analyze_image(self, data_url_or_b64):
        """Return embedding and face metadata (bbox area) for the first detected face.
        Returns None if no face detected.
        """
        img = self._load_image(data_url_or_b64)
        arr = np.asarray(img)

        if HAS_INSIGHT and self.model is not None:
            faces = self.model.get(arr)
            if not faces:
                return None
            face = faces[0]
            emb = self._normalize(face.embedding)

            # bbox is (x1, y1, x2, y2)
            try:
                bbox = face.bbox.astype(int).tolist()
                x1, y1, x2, y2 = bbox
                face_area = max(0, (x2 - x1) * (y2 - y1))
            except Exception:
                bbox = None
                face_area = None

            frontalness = None
            eye_open = None
            det_score = None
            landmarks = None

            try:
                det_score = float(getattr(face, 'det_score', getattr(face, 'score', 0.0)) or 0.0)
            except Exception:
                det_score = None

            if hasattr(face, 'kps'):
                landmarks = np.asarray(face.kps)
            elif hasattr(face, 'landmark_2d_106'):
                landmarks = np.asarray(face.landmark_2d_106)
            elif hasattr(face, 'kps3d'):
                landmarks = np.asarray(face.kps3d)

            try:
                if landmarks is not None and landmarks.shape[0] >= 48:
                    le = landmarks[36:42]
                    re = landmarks[42:48]
                    nose = landmarks[30]
                    dist_left = np.linalg.norm(nose - le.mean(axis=0))
                    dist_right = np.linalg.norm(nose - re.mean(axis=0))
                    denom = max(dist_left, dist_right, 1e-6)
                    frontalness = 1.0 - abs(dist_left - dist_right) / denom

                    def ear(eye):
                        p1, p2, p3, p4, p5, p6 = eye
                        return (np.linalg.norm(p2 - p6) + np.linalg.norm(p3 - p5)) / (2.0 * (np.linalg.norm(p1 - p4) + 1e-6))
                    ear_l = ear(le)
                    ear_r = ear(re)
                    eye_open = float((ear_l + ear_r) / 2.0)
                else:
                    if bbox is not None:
                        w = max(1, x2 - x1)
                        frontalness = 1.0 - abs((x1 + w/2.0) - (arr.shape[1]/2.0)) / (arr.shape[1]/2.0)
            except Exception:
                frontalness = None
                eye_open = None

            return {
                'embedding': emb,
                'bbox': bbox,
                'face_area': face_area,
                'raw_arr': arr,
                'frontalness': float(frontalness) if frontalness is not None else None,
                'eye_open': float(eye_open) if eye_open is not None else None,
                'det_score': float(det_score) if det_score is not None else None,
                'landmarks': landmarks.tolist() if landmarks is not None else None
            }

        # fallback: return embedding and treat whole image as "face area"
        emb = self.get_embedding(data_url_or_b64)
        h, w = arr.shape[0], arr.shape[1]
        return {
            'embedding': emb,
            'bbox': [0, 0, w, h],
            'face_area': w * h,
            'raw_arr': arr
        }

    def _normalize(self, emb):
        emb = np.array(emb, dtype=np.float32)
        norm = np.linalg.norm(emb)
        if norm == 0:
            return emb.tolist()
        return (emb / norm).tolist()


_global_embedder = None

def get_embedder():
    global _global_embedder
    if _global_embedder is None:
        _global_embedder = Embedder()
    return _global_embedder
