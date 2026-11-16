"""Optional ingestion of user-supplied PDFs dropped into
``backend/data/uploaded/*.pdf``.

Dropped PDFs are parsed at startup and re-run through the same extract →
chunk → embed → index pipeline as the curated corpus, but they are marked as
``kind="user"``: ungraded, with no injected payload metadata and no expected
answer.  They show up in the library as a separate "Uploaded files" group and
participate in retrieval alongside the curated documents.

Changed or added files trigger a fresh index entry because each entry is keyed by
(filename, size, mtime).  The hot ``POST /api/documents/reindex`` endpoint rebuilds
the user section without restarting the service.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from .config import settings
from .corpus import extract_text, normalize, split_sentences
from .embeddings import embedder
from .vector_store import Chunk, vector_store

EXTRA_DIR = settings.data_dir / "uploaded"


def doc_key(path: Path) -> str:
    """Stable key that changes whenever the file contents or name change."""
    st = path.stat()
    blob = f"{path.name}|{st.st_size}|{st.st_mtime:.0f}".encode()
    return hashlib.sha1(blob).hexdigest()[:12]


def base_id(path: Path) -> str:
    return f"user-{doc_key(path)}"


def _ensure_collection() -> None:
    """Ensure the vector store collection is initialized."""
    vector_store._ensure()


def _already_indexed(base: str) -> bool:
    _ensure_collection()
    res = vector_store._collection.get(
        include=["metadatas"],
        where={"$and": [{"kind": {"$eq": "user"}}, {"document_id": {"$eq": base}}]},
    )
    return bool(res.get("ids") or [])


def _chunk_text(path: Path) -> tuple[str, list[Chunk]]:
    """Parse a PDF into one sentence per chunk, filtering out junk short lines."""
    _ensure_collection()
    text = extract_text(path)
    sentences = [s for s in split_sentences(text) if len(normalize(s)) > 30]
    if not sentences:
        return text, []
    base = base_id(path)
    chunks: list[Chunk] = []
    for i, sentence in enumerate(sentences):
        chunks.append(
            Chunk(
                id=f"{base}#{i}",
                document_id=base,
                document_title=path.stem,
                kind="user",
                index=i,
                text=normalize(sentence),
                embedding=None,  # type: ignore[arg-type]
                injections=[],
            )
        )
    return text, chunks


def extra_ingest() -> dict:
    """Index every user PDF in the drop folder that isn't already indexed."""
    _ensure_collection()
    EXTRA_DIR.mkdir(parents=True, exist_ok=True)
    indexed: list[dict] = []

    for path in sorted(EXTRA_DIR.glob("*.pdf")):
        base = base_id(path)
        if _already_indexed(base):
            continue
        _, chunks = _chunk_text(path)
        if not chunks:
            continue
        vecs = embedder.encode([c.text for c in chunks])
        for c, v in zip(chunks, vecs, strict=True):
            c.embedding = v
        vector_store.add(chunks)
        indexed.append({"path": str(path), "id": base, "chunks": len(chunks)})

    return {
        "loaded": len(list(EXTRA_DIR.glob("*.pdf"))),
        "indexed": len(indexed),
        "dir": str(EXTRA_DIR),
    }


def reindex() -> dict:
    """Clear the existing user section and re-parse everything in the drop folder.

    Old user chunks (including those belonging to removed files) are purged so the
    section reflects only what is actually on disk.
    """
    _ensure_collection()
    coll = vector_store._collection
    existing = coll.get(include=["metadatas"], where={"kind": {"$eq": "user"}})
    ids = existing.get("ids") or []
    if ids:
        coll.delete(ids=ids)
    return extra_ingest()


def user_documents_index() -> list[dict]:
    """Summarise every user document currently in the index."""
    _ensure_collection()
    coll = vector_store._collection
    res = coll.get(include=["documents", "metadatas"], where={"kind": {"$eq": "user"}})
    ids = res.get("ids") or []
    docs = res.get("documents") or []
    metas = res.get("metadatas") or []

    by_base: dict[str, dict] = {}
    for cid, text, meta in zip(ids, docs, metas, strict=False):
        base = cid.rsplit("#", 1)[0]
        entry = by_base.get(base)
        if entry is None:
            entry = {
                "id": base,
                "title": meta.get("document_title") or Path(text or "").stem or "uploaded.pdf",
                "filename": f"{base}.pdf",
                "source": "uploaded",
                "chunks": 0,
                "paragraphs": 0,
                "preview": "",
            }
            by_base[base] = entry
        entry["chunks"] += 1

    out: list[dict] = []
    for base in sorted(by_base):
        texts = [
            d
            for cid, d in zip(ids, docs, strict=False)
            if cid.rsplit("#", 1)[0] == base
        ]
        entry = by_base[base]
        entry["paragraphs"] = len(texts)
        entry["preview"] = normalize(" ".join(texts))[:260]
        out.append(entry)
    return out


def user_document_detail(base: str) -> dict | None:
    """Return the paragraph-by-paragraph content of a user document."""
    _ensure_collection()
    coll = vector_store._collection
    res = coll.get(
        include=["documents", "metadatas"],
        where={"kind": {"$eq": "user"}},
    )
    ids = res.get("ids") or []
    docs = res.get("documents") or []
    metas = res.get("metadatas") or []

    matched: list[tuple[str, str, dict]] = []
    for cid, text, meta in zip(ids, docs, metas, strict=False):
        if cid.rsplit("#", 1)[0] != base:
            continue
        matched.append((cid, text, meta))

    if not matched:
        return None

    paragraphs: list[dict] = []
    title = None
    for i, (cid, text, meta) in enumerate(matched):
        title = title or meta.get("document_title")
        paragraphs.append(
            {
                "index": i,
                "text": text,
                "chunk_id": cid,
                "poisoned": False,
                "injection_spans": [],
                "source": "uploaded",
            }
        )

    return {
        "id": base,
        "title": title or "uploaded document",
        "filename": f"{base}.pdf",
        "kind": "user",
        "summary": "User-supplied PDF, ungraded. No attack metadata and no expected answer are "
        "associated with it — the query simply retrieves its sentences.",
        "injections": [],
        "paragraphs": paragraphs,
        "source": "uploaded",
    }
