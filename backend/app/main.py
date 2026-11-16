"""ContextGuard HTTP API."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .config import settings
from .corpus import DOCUMENTS
from .embeddings import embedder
from .extra_ingest import (
    EXTRA_DIR,
    _ensure_collection,
    reindex,
    user_document_detail,
    user_documents_index,
)
from .guards import llama_guard
from .ingestion import document_index, ingest
from .llm import llm
from .metrics import metrics_store
from .pipeline import run_benchmark, run_query
from .sanitizer import sanitizer
from .schemas import (
    BenchmarkResponse,
    ConfigPatch,
    ConfigResponse,
    HealthResponse,
    QueryRequest,
    ResetResponse,
)
from .vds import S_CEIL, S_FLOOR, W_DISPLACEMENT, W_LEXICAL, directions, sentence_index
from .vector_store import vector_store

STATE: dict = {"ingest": None, "started_at": time.time()}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ingest the PDF library, then warm the NLP + embedding stacks so the first
    # query already meets the latency budget.
    STATE["ingest"] = await run_in_threadpool(ingest)
    await run_in_threadpool(embedder.encode, ["warmup"])
    await run_in_threadpool(sanitizer.sanitize, "The system is ready.")
    # Build the instruction/content centroid axes once, off the query path.
    await run_in_threadpool(directions)
    # Load sentence embeddings for any uploaded documents the startup ingest picked
    # up, so the first query that reaches one does not pay an embedding cost inside
    # the measured window.
    _ensure_collection()
    user_chunks = vector_store._collection.get(include=["documents"], where={"kind": {"$eq": "user"}}).get("documents") or []
    if user_chunks:
        await run_in_threadpool(sentence_index.warm, user_chunks)
    yield


app = FastAPI(
    title="ContextGuard",
    version=__version__,
    description=(
        "Inference-time security proxy for RAG pipelines. Scores retrieved chunks with "
        "Vector Displacement Scoring and surgically removes injected instructions before "
        "they reach the language model."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health / config
# ---------------------------------------------------------------------------


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    report = STATE.get("ingest")
    notes = [n for n in (embedder.note, llama_guard.note, llm.note) if n]
    if report is not None and report.note:
        notes.append(report.note)
    return HealthResponse(
        status="ok",
        mode="real" if settings.real_mode else "demo",
        real_mode=settings.real_mode,
        engine={
            "llm": llm.name,
            "guard": llama_guard.engine,
            "sanitizer": sanitizer.engine_name,
            "embeddings": embedder.name,
        },
        vector_store=vector_store.stats(),
        documents=len(DOCUMENTS),
        chunks=vector_store.stats().get("chunks", 0),
        notes=list(dict.fromkeys(notes)),
    )


@app.get("/api/config", response_model=ConfigResponse)
def get_config() -> ConfigResponse:
    return ConfigResponse(
        vds_threshold=settings.vds_threshold,
        top_k=settings.top_k,
        mode="real" if settings.mode == "real" else "demo",
        real_mode=settings.real_mode,
        vds_weights={
            "displacement": W_DISPLACEMENT,
            "lexical": W_LEXICAL,
            "floor": S_FLOOR,
            "ceil": S_CEIL,
        },
    )


@app.patch("/api/config", response_model=ConfigResponse)
def patch_config(patch: ConfigPatch) -> ConfigResponse:
    if patch.vds_threshold is not None:
        settings.vds_threshold = patch.vds_threshold
    if patch.top_k is not None:
        settings.top_k = patch.top_k
    if patch.mode is not None:
        settings.mode = patch.mode
    return get_config()


# ---------------------------------------------------------------------------
# Documents & prompts
# ---------------------------------------------------------------------------


@app.get("/api/documents")
def list_documents() -> list[dict]:
    return document_index()


@app.get("/api/prompts")
def list_prompts() -> list[dict]:
    from .pipeline import PROMPTS

    return list(PROMPTS)


@app.get("/api/documents/all")
def list_all_documents() -> dict:
    return {
        "documents": document_index(),
        "user_uploaded": user_documents_index(),
    }


MAX_UPLOAD_BYTES = 20 * 1024 * 1024


@app.post("/api/documents/upload")
async def upload_document(request: Request, filename: str) -> dict:
    """Accept a PDF sent as the raw request body and index it.

    The body is written to ``data/uploaded/`` and the user section is rebuilt so
    the new sentences join retrieval immediately. Raw bytes (rather than
    multipart) keep the service free of an extra form-parsing dependency; the
    client sends ``Content-Type: application/pdf`` and the name as a query param.
    """
    name = Path(filename).name
    if not name or Path(name).suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Only .pdf files are accepted")

    payload = await request.body()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="PDF is larger than 20 MB")

    EXTRA_DIR.mkdir(parents=True, exist_ok=True)
    destination = EXTRA_DIR / name
    destination.write_bytes(payload)

    try:
        result = await run_in_threadpool(reindex)
    except Exception as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Could not read that PDF ({exc})") from exc

    user_chunks = (
        vector_store._collection.get(include=["documents"], where={"kind": {"$eq": "user"}}).get(
            "documents"
        )
        or []
    )
    if user_chunks:
        await run_in_threadpool(sentence_index.warm, user_chunks)

    return {"filename": name, **result, "documents": user_documents_index()}


@app.post("/api/documents/reindex")
def reindex_documents() -> dict:
    result = reindex()
    result["warmed"] = True
    user_chunks = vector_store._collection.get(include=["documents"], where={"kind": {"$eq": "user"}}).get("documents") or []
    if user_chunks:
        sentence_index.warm(user_chunks)
    return result


@app.get("/api/documents/{document_id}")
def get_document(document_id: str) -> dict:
    user_detail = user_document_detail(document_id)
    if user_detail is not None:
        return user_detail
    raise HTTPException(status_code=404, detail="Document not found")


# ---------------------------------------------------------------------------
# Query, benchmark, metrics
# ---------------------------------------------------------------------------


@app.post("/api/query")
async def query(request: QueryRequest) -> dict:
    try:
        result = await run_in_threadpool(
            run_query,
            request.query,
            request.prompt_id,
            request.top_k,
            request.vds_threshold,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    metrics_store.record(result)
    return result


@app.post("/api/benchmark", response_model=BenchmarkResponse)
async def benchmark() -> BenchmarkResponse:
    results = await run_in_threadpool(run_benchmark)
    for result in results:
        metrics_store.record(result)
    return BenchmarkResponse(results=results, metrics=metrics_store.aggregate())


@app.get("/api/metrics")
def get_metrics() -> dict:
    return metrics_store.aggregate()


@app.post("/api/metrics/reset", response_model=ResetResponse)
def reset_metrics() -> ResetResponse:
    metrics_store.reset()
    return ResetResponse(ok=True, message="Benchmark history cleared.")


@app.post("/api/demo/reset", response_model=ResetResponse)
def reset_demo() -> ResetResponse:
    """Reset presentation state: metrics history and runtime overrides."""
    metrics_store.reset()
    settings.vds_threshold = 0.25
    settings.top_k = 3
    return ResetResponse(ok=True, message="Demo state cleared: metrics and tuning reset.")


@app.get("/")
def root() -> dict:
    return {
        "name": "ContextGuard",
        "version": __version__,
        "docs": "/docs",
        "ui": "http://localhost:5173",
    }