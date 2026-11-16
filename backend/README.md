# ContextGuard backend

FastAPI service that ingests the sample PDF library, retrieves chunks, scores them
with VDS, sanitizes suspicious chunks and runs the Llama Guard 3 comparison path.

```bash
uv sync
uv run uvicorn app.main:app --port 8000 --reload
```

Interactive API docs: <http://localhost:8000/docs>

## Layout

| Module | Responsibility |
|--------|----------------|
| `corpus.py` | Sample documents, PDF generation (`fpdf2`), PDF parsing (`pypdf`) |
| `ingestion.py` | Chunk + embed + index the PDF library at startup |
| `embeddings.py` | `all-MiniLM-L6-v2` with an offline hashed fallback |
| `vector_store.py` | ChromaDB persistent index (+ JSON fallback) |
| `vds.py` | Vector Displacement Scoring |
| `sanitizer.py` | spaCy dependency-parsing micro-sanitization |
| `guards.py` | Llama Guard 3 (real via Groq, or faithful keyword mock) |
| `llm.py` | Llama-3.3-70B via Groq, or deterministic simulation |
| `pipeline.py` | The cascade: retrieve → score → sanitize → generate → grade |
| `metrics.py` | Aggregated benchmark metrics (`data/metrics.json`) |
| `main.py` | HTTP API |

## Environment

| Variable | Default | Meaning |
|----------|---------|---------|
| `CONTEXTGUARD_MODE` | `demo` | `demo` = fully offline; `real` = Groq |
| `CONTEXTGUARD_GROQ_API_KEY` | — | Required for `real` mode |
| `CONTEXTGUARD_GROQ_MODEL` | `llama-3.3-70b-versatile` | Generation model |
| `CONTEXTGUARD_LLAMA_GUARD_MODEL` | `meta-llama/llama-guard-3-8b` | Judge model |
| `CONTEXTGUARD_VDS_THRESHOLD` | `0.25` | Flag threshold |
| `CONTEXTGUARD_TOP_K` | `3` | Retrieved chunks per query |

Demo mode is the default and never touches the network; if a model or the
vector index cannot be loaded, the service degrades gracefully and reports the
degradation in `/api/health`.
