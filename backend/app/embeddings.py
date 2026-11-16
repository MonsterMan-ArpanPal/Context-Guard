"""Embedding backends.

Primary backend: ``sentence-transformers/all-MiniLM-L6-v2`` (384-d, cosine).
Fallback: a deterministic hashed n-gram encoder that needs no model download, so
the demo still runs on a machine with no cached weights and no network.
"""

from __future__ import annotations

import hashlib
import math
import re

import numpy as np

DIM = 384
MODEL_NAME = "all-MiniLM-L6-v2"

_TOKEN = re.compile(r"[a-z0-9]+")


def _l2(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=-1, keepdims=True)
    norms[norms == 0] = 1.0
    return matrix / norms


class HashingEmbedder:
    """Offline fallback: hashed character + word n-grams, L2 normalised."""

    name = "hashed-ngram-384"
    dim = DIM

    def encode(self, texts: list[str]) -> np.ndarray:
        out = np.zeros((len(texts), DIM), dtype=np.float32)
        for row, text in enumerate(texts):
            tokens = _TOKEN.findall(text.lower())
            for token in tokens:
                buckets = [token]
                buckets += [f"{token[i:i + 4]}" for i in range(0, max(len(token) - 3, 1), 2)]
                for n in range(len(tokens) - 1):
                    buckets.append(f"{tokens[n]}_{tokens[n + 1]}")
                for bucket in buckets:
                    digest = hashlib.blake2b(bucket.encode(), digest_size=8).digest()
                    value = int.from_bytes(digest, "little")
                    index = value % DIM
                    sign = 1.0 if (value >> 63) & 1 else -1.0
                    out[row, index] += sign * (1.0 + math.log1p(len(bucket)))
        return _l2(out)


class SentenceTransformerEmbedder:
    name = MODEL_NAME
    dim = DIM

    def __init__(self, model_name: str = MODEL_NAME) -> None:
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer(model_name)

    def encode(self, texts: list[str]) -> np.ndarray:
        vectors = self._model.encode(
            texts, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False
        )
        return np.asarray(vectors, dtype=np.float32)


class Embedder:
    """Lazily-initialised facade with a transparent degraded mode."""

    def __init__(self) -> None:
        self._backend = None
        self._note = ""

    def _load(self):
        if self._backend is not None:
            return self._backend
        try:
            self._backend = SentenceTransformerEmbedder()
        except Exception as exc:  # pragma: no cover - depends on host environment
            self._backend = HashingEmbedder()
            self._note = f"degraded embeddings ({type(exc).__name__}): using hashed n-grams"
        return self._backend

    @property
    def name(self) -> str:
        return self._load().name

    @property
    def note(self) -> str:
        return self._note

    def encode(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, DIM), dtype=np.float32)
        return _l2(np.asarray(self._load().encode(texts), dtype=np.float32))

    def encode_one(self, text: str) -> np.ndarray:
        return self.encode([text])[0]


embedder = Embedder()
