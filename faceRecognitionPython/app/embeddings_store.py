"""
embeddings_store.py - DB-ONLY mode.

IMPORTANT: This module now ONLY works with MongoDB.
NO local file fallback (embeddings.json is NOT used).
All embeddings and recognition must come from the database.

If DB is empty, recognition MUST fail gracefully.
"""

import os
import threading
from math import sqrt

# REMOVED: Local file path and file I/O functions
# REMOVED: Faiss index building from local files

# Optional Faiss import
try:
    import faiss
    HAS_FAISS = True
except Exception:
    HAS_FAISS = False


_INDEX_LOCK = threading.Lock()
_FAISS_INDEX = None
_ID_MAP = []


def cosine_similarity(a, b):
    """Compute cosine similarity between two embedding vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x*y for x, y in zip(a, b))
    na = sqrt(sum(x*x for x in a))
    nb = sqrt(sum(x*x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def save_embedding(employee_id, embedding, version='v1'):
    """
    DEPRECATED: embeddings are now stored in MongoDB only.
    This function is a no-op for backward compatibility.
    """
    pass


def load_all():
    """
    Returns empty dict - embeddings are loaded from DB in the FastAPI routes.
    This is kept for backward compatibility but MUST NOT be used.
    """
    return {}


def find_top_k(query_emb, k=1):
    """
    IMPORTANT: This function is DEPRECATED and should NOT be used.
    All recognition must happen via the /recognize endpoint which loads
    embeddings directly from MongoDB.

    For backward compatibility, returns empty list (no local fallback).
    """
    return []


# Note: _build_index, _build_index_async functions removed - no longer needed
# All matching is done server-side with DB-loaded embeddings

