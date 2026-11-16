"""Runtime configuration for the ContextGuard service."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # <repo>/backend
DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    """Settings are mutable at runtime so the demo UI can tune the cascade."""

    model_config = SettingsConfigDict(env_prefix="CONTEXTGUARD_", env_file=".env", extra="ignore")

    # --- Cascade -----------------------------------------------------------
    vds_threshold: float = 0.25
    top_k: int = 3

    # --- Modes -------------------------------------------------------------
    # "demo"  -> fully offline, Llama Guard 3 + Llama-3 are simulated
    # "real"  -> Groq API for generation and Llama Guard 3 classification
    mode: str = "demo"
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    llama_guard_model: str = "meta-llama/llama-guard-3-8b"

    # --- Storage -----------------------------------------------------------
    data_dir: Path = DATA_DIR

    @property
    def pdf_dir(self) -> Path:
        return self.data_dir / "pdfs"

    @property
    def chroma_dir(self) -> Path:
        return self.data_dir / "chroma"

    @property
    def metrics_file(self) -> Path:
        return self.data_dir / "metrics.json"

    @property
    def store_file(self) -> Path:
        return self.data_dir / "vector_store.json"

    @property
    def real_mode(self) -> bool:
        return self.mode == "real" and bool(self.groq_api_key)


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
