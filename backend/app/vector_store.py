"""Chunk store backed by ChromaDB, with an equally functional JSON fallback.

Only retrieval ordering is delegated to Chroma: cosine similarity is always
recomputed from the returned vectors, so both backends produce identical scores.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from .config import settings


@dataclass
class Chunk:
    id: str
    document_id: str
    document_title: str
    kind: str
    index: int
    text: str
    embedding: np.ndarray
    injections: list[dict] = field(default_factory=list)

    def metadata(self) -> dict:
        return {
            "document_id": self.document_id,
            "document_title": self.document_title,
            "kind": self.kind,
            "index": self.index,
            "text": self.text,
            "injections": json.dumps(self.injections),
        }


@dataclass
class Hit:
    chunk: Chunk
    similarity: float


class _JsonBackend:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.chunks: list[Chunk] = []
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            payload = json.loads(self.path.read_text())
            self.chunks = [
                Chunk(
                    id=row["id"],
                    document_id=row["document_id"],
                    document_title=row["document_title"],
                    kind=row["kind"],
                    index=row["index"],
                    text=row["text"],
                    embedding=np.asarray(row["embedding"], dtype=np.float32),
                    injections=row.get("injections", []),
                )
                for row in payload
            ]
        except Exception:
            self.chunks = []

    def reset(self) -> None:
        self.chunks = []
        if self.path.exists():
            self.path.unlink()

    def add(self, chunks: list[Chunk]) -> None:
        self.chunks.extend(chunks)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(
                [
                    {
                        "id": c.id,
                        "document_id": c.document_id,
                        "document_title": c.document_title,
                        "kind": c.kind,
                        "index": c.index,
                        "text": c.text,
                        "embedding": c.embedding.tolist(),
                        "injections": c.injections,
                    }
                    for c in self.chunks
                ]
            )
        )

    def search(self, vector: np.ndarray, k: int) -> list[Hit]:
        if not self.chunks:
            return []
        matrix = np.vstack([c.embedding for c in self.chunks])
        scores = matrix @ vector
        order = np.argsort(-scores)[:k]
        return [Hit(chunk=self.chunks[i], similarity=float(scores[i])) for i in order]


class VectorStore:
    """Persistent chunk index used by the retrieval stage."""

    def __init__(self, path: Path | None = None) -> None:
        self.path = path or settings.chroma_dir
        self.backend_name = "chromadb"
        self._client = None
        self._collection = None
        self._json: _JsonBackend | None = None

    # -- lifecycle ---------------------------------------------------------
    def _ensure(self) -> None:
        if self._collection is not None or self._json is not None:
            return
        try:
            import chromadb

            self.path.mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(path=str(self.path))
            self._collection = self._client.get_or_create_collection(
                name="contextguard_chunks", metadata={"hnsw:space": "l2"}
            )
            self.backend_name = "chromadb"
        except Exception:
            self._json = _JsonBackend(settings.store_file)
            self.backend_name = "json-fallback"

    @property
    def is_empty(self) -> bool:
        self._ensure()
        if self._collection is not None:
            return self._collection.count() == 0
        return self._json is None or not self._json.chunks

    def reset(self) -> None:
        self._ensure()
        if self._collection is not None:
            try:
                self._client.delete_collection("contextguard_chunks")
            except Exception:
                pass
            self._collection = self._client.get_or_create_collection(
                name="contextguard_chunks", metadata={"hnsw:space": "l2"}
            )
        if self._json is not None:
            self._json.reset()

    def add(self, chunks: list[Chunk]) -> None:
        self._ensure()
        if self._collection is not None:
            self._collection.add(
                ids=[c.id for c in chunks],
                embeddings=[c.embedding.tolist() for c in chunks],
                documents=[c.text for c in chunks],
                metadatas=[c.metadata() for c in chunks],
            )
        else:
            self._json.add(chunks)

    # -- retrieval ---------------------------------------------------------
    def search(self, vector: np.ndarray, k: int = 3) -> list[Hit]:
        self._ensure()
        if self._collection is None:
            return self._json.search(vector, k)

        total = self._collection.count()
        if total == 0:
            return []
        result = self._collection.query(
            query_embeddings=[vector.tolist()],
            n_results=min(k, total),
            include=["documents", "metadatas", "embeddings"],
        )
        ids = (result.get("ids") or [[]])[0]
        documents = (result.get("documents") or [[]])[0]
        metadatas = (result.get("metadatas") or [[]])[0]
        embeddings = (result.get("embeddings") or [[]])[0]

        hits: list[Hit] = []
        for i, chunk_id in enumerate(ids):
            meta = dict(metadatas[i] or {})
            vector_i = np.asarray(embeddings[i], dtype=np.float32)
            similarity = float(vector_i @ vector)
            hits.append(
                Hit(
                    chunk=Chunk(
                        id=chunk_id,
                        document_id=meta.get("document_id", ""),
                        document_title=meta.get("document_title", ""),
                        kind=meta.get("kind", "benign"),
                        index=int(meta.get("index", 0)),
                        text=documents[i],
                        embedding=vector_i,
                        injections=json.loads(meta.get("injections") or "[]"),
                    ),
                    similarity=similarity,
                )
            )
        hits.sort(key=lambda h: -h.similarity)
        return hits

    def stats(self) -> dict:
        self._ensure()
        if self._collection is not None:
            return {"backend": "chromadb", "chunks": self._collection.count()}
        return {"backend": "json-fallback", "chunks": len(self._json.chunks) if self._json else 0}


vector_store = VectorStore()
