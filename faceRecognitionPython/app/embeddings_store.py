import json
import os
from math import sqrt
import threading

STORE_PATH = os.path.join(os.path.dirname(__file__), '..', 'embeddings.json')

# Optional Faiss import
try:
    import faiss
    HAS_FAISS = True
except Exception:
    HAS_FAISS = False


_INDEX_LOCK = threading.Lock()
_FAISS_INDEX = None
_ID_MAP = []


def _load():
    try:
        with open(STORE_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def _save(data):
    with open(STORE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f)


def save_embedding(employee_id, embedding, version='v1'):
    data = _load()
    data[str(employee_id)] = { 'embedding': embedding, 'version': version }
    _save(data)
    # rebuild index in background
    try:
        _build_index_async()
    except Exception:
        pass


def load_all():
    return _load()


def cosine_similarity(a, b):
    # a, b are lists
    dot = sum(x*y for x,y in zip(a,b))
    na = sqrt(sum(x*x for x in a))
    nb = sqrt(sum(x*x for x in b))
    if na == 0 or nb == 0:
        return 0
    return dot / (na * nb)


def _build_index():
    global _FAISS_INDEX, _ID_MAP
    data = _load()
    items = list(data.items())
    if not items:
        _FAISS_INDEX = None
        _ID_MAP = []
        return

    embs = []
    ids = []
    for emp_id, obj in items:
        emb = obj.get('embedding')
        if emb and isinstance(emb, list):
            embs.append(emb)
            ids.append(emp_id)

    if not embs:
        _FAISS_INDEX = None
        _ID_MAP = []
        return

    import numpy as np
    arr = np.array(embs).astype('float32')
    # Ensure vectors are L2-normalized for cosine search via inner product
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    arr = arr / norms

    if HAS_FAISS:
        dim = arr.shape[1]
        index = faiss.IndexFlatIP(dim)  # inner product on normalized vectors ~ cosine
        index.add(arr)
        _FAISS_INDEX = index
        _ID_MAP = ids
    else:
        _FAISS_INDEX = None
        _ID_MAP = ids


def _build_index_async():
    # spawn a thread to avoid blocking
    t = threading.Thread(target=_build_index, daemon=True)
    t.start()


def find_top_k(query_emb, k=1):
    # Prefer Faiss index if available
    if query_emb is None:
        return []

    if HAS_FAISS and _FAISS_INDEX is not None:
        try:
            import numpy as np
            q = np.array(query_emb, dtype='float32')
            norm = np.linalg.norm(q)
            if norm == 0:
                return []
            q = (q / norm).reshape(1, -1)
            D, I = _FAISS_INDEX.search(q, k)
            results = []
            for score, idx in zip(D[0], I[0]):
                if idx < 0 or idx >= len(_ID_MAP):
                    continue
                emp_id = _ID_MAP[idx]
                # score is inner product on normalized vectors ~ cosine
                results.append({'employeeId': emp_id, 'score': float(score), 'version': None})
            return results
        except Exception:
            pass

    # Fallback: compute linear cosine similarity
    data = _load()
    results = []
    for emp_id, obj in data.items():
        emb = obj.get('embedding')
        if not emb:
            continue
        score = cosine_similarity(query_emb, emb)
        results.append({'employeeId': emp_id, 'score': score, 'version': obj.get('version', 'v1')})
    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:k]


# Build index at import time
try:
    _build_index_async()
except Exception:
    pass
