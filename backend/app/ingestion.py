"""Startup ingestion: PDF -> text -> paragraph chunks -> embeddings -> index."""

from __future__ import annotations

from dataclasses import dataclass

from .config import settings
from .corpus import (
    DOCUMENT_BY_ID,
    DOCUMENTS,
    Document,
    Injection,
    ensure_pdf_library,
    extract_text,
    normalize,
    split_paragraphs,
)
from .embeddings import embedder
from .vds import sentence_index
from .vector_store import Chunk, vector_store


@dataclass
class IngestReport:
    documents: int
    chunks: int
    backend: str
    embeddings: str
    note: str = ""

    def as_dict(self) -> dict:
        return {
            "documents": self.documents,
            "chunks": self.chunks,
            "vector_backend": self.backend,
            "embeddings": self.embeddings,
            "note": self.note,
        }


def _chunk_payload(document: Document, injections: list[Injection]) -> list[dict]:
    return [
        {
            "trigger": inj.trigger,
            "canary": inj.canary,
            "output": inj.output,
            "attack_type": inj.attack_type,
            "description": inj.description,
        }
        for inj in injections
    ]


def build_chunks(document: Document, text: str) -> list[Chunk]:
    paragraphs = split_paragraphs(text, document)
    chunks: list[Chunk] = []
    for index, paragraph in enumerate(paragraphs):
        injections = [inj for inj in document.injections if normalize(inj.trigger) in paragraph]
        chunks.append(
            Chunk(
                id=f"{document.id}#{index}",
                document_id=document.id,
                document_title=document.title,
                kind=document.kind,
                index=index,
                text=paragraph,
                embedding=None,  # type: ignore[arg-type]
                injections=_chunk_payload(document, injections),
            )
        )
    return chunks


def ingest(force: bool = False) -> IngestReport:
    """Generate the PDF library, parse it, embed it and (re)build the index."""
    paths = ensure_pdf_library(settings.pdf_dir)

    if force:
        vector_store.reset()
    if not vector_store.is_empty:
        stats = vector_store.stats()
        return IngestReport(
            documents=len(DOCUMENTS),
            chunks=stats["chunks"],
            backend=stats["backend"],
            embeddings=embedder.name,
            note="index reused from disk",
        )

    all_chunks: list[Chunk] = []
    for document in DOCUMENTS:
        parsed = extract_text(paths[document.id])
        all_chunks.extend(build_chunks(document, parsed))

    vectors = embedder.encode([chunk.text for chunk in all_chunks])
    for chunk, vector in zip(all_chunks, vectors, strict=True):
        chunk.embedding = vector

    vector_store.add(all_chunks)
    # Precompute sentence embeddings so query-time VDS is pure vector math.
    sentence_index.warm([chunk.text for chunk in all_chunks])
    stats = vector_store.stats()
    return IngestReport(
        documents=len(DOCUMENTS),
        chunks=stats["chunks"],
        backend=stats["backend"],
        embeddings=embedder.name,
        note=embedder.note or "fresh index built",
    )


def document_index() -> list[dict]:
    """Library listing with per-document chunk statistics."""
    chunks = vector_store.search_all() if hasattr(vector_store, "search_all") else []
    counts: dict[str, int] = {}
    for chunk in chunks:
        counts[chunk.document_id] = counts.get(chunk.document_id, 0) + 1

    payload = []
    for document in DOCUMENTS:
        payload.append(
            {
                "id": document.id,
                "title": document.title,
                "filename": document.filename,
                "kind": document.kind,
                "summary": document.summary,
                "preview": document.plain_text[:220],
                "paragraphs": len(document.plain_paragraphs),
                "injections": [
                    {
                        "attack_type": inj.attack_type,
                        "canary": inj.canary,
                        "description": inj.description,
                    }
                    for inj in document.injections
                ],
                "chunks": counts.get(document.id, 0) or len(document.plain_paragraphs),
            }
        )
    return payload


def document_detail(document_id: str) -> dict | None:
    document = DOCUMENT_BY_ID.get(document_id)
    if document is None:
        return None

    paragraphs = []
    for index, paragraph in enumerate(document.plain_paragraphs):
        spans = []
        for injection in document.injections:
            trigger = normalize(injection.trigger)
            start = paragraph.find(trigger)
            if start == -1:
                continue
            spans.append(
                {
                    "start": start,
                    "end": start + len(trigger),
                    "canary": injection.canary,
                    "attack_type": injection.attack_type,
                    "description": injection.description,
                }
            )
        paragraphs.append(
            {
                "index": index,
                "text": paragraph,
                "chunk_id": f"{document.id}#{index}",
                "injection_spans": spans,
                "poisoned": bool(spans),
            }
        )

    return {
        "id": document.id,
        "title": document.title,
        "filename": document.filename,
        "kind": document.kind,
        "summary": document.summary,
        "paragraphs": paragraphs,
        "injections": document_index_entry(document)["injections"],
    }


def document_index_entry(document: Document) -> dict:
    return {
        "id": document.id,
        "title": document.title,
        "kind": document.kind,
        "injections": [
            {"attack_type": i.attack_type, "canary": i.canary} for i in document.injections
        ],
    }
