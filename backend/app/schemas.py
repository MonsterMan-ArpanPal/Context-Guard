"""Pydantic schemas for the HTTP API."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    prompt_id: str | None = None
    top_k: int | None = Field(default=None, ge=1, le=10)
    vds_threshold: float | None = Field(default=None, ge=0.0, le=1.0)


class ConfigPatch(BaseModel):
    vds_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    top_k: int | None = Field(default=None, ge=1, le=10)
    mode: Literal["demo", "real"] | None = None


class ConfigResponse(BaseModel):
    vds_threshold: float
    top_k: int
    mode: Literal["demo", "real"]
    real_mode: bool
    vds_weights: dict[str, float]


class HealthResponse(BaseModel):
    status: str
    mode: str
    real_mode: bool
    engine: dict[str, str]
    vector_store: dict[str, Any]
    documents: int
    chunks: int
    notes: list[str]


class BenchmarkResponse(BaseModel):
    results: list[dict]
    metrics: dict


class ResetResponse(BaseModel):
    ok: bool
    message: str
