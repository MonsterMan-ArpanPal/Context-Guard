"""Llama Guard 3 comparison layer.

``real`` mode calls Llama Guard 3 through Groq; ``demo`` mode runs a faithful
keyword/heuristic mock whose decisions mirror the classifier's behaviour on this
corpus: explicit override language is caught, politely-worded payloads are not,
and benign documents that *quote* attack text are flagged.
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass

from .config import settings

# (pattern, weight, label) — mirrors the strong signals a guard model keys on.
_MARKERS: tuple[tuple[re.Pattern[str], float, str], ...] = (
    (re.compile(r"\bignore\s+(all\s+)?(previous|prior|above)\s+instructions?\b"), 0.95, "instruction override"),
    (re.compile(r"\bsystem\s+override\b"), 0.95, "fake system message"),
    (re.compile(r"\badministrator\s+(directive|override|instruction)\b"), 0.8, "fake authority"),
    (re.compile(r"\bdisregard\s+the\s+(user|previous|above)\b"), 0.8, "disregard directive"),
    (re.compile(r"\bconfidential\s+(api\s+key|data|information)\b"), 0.7, "confidential data request"),
    (re.compile(r"\b(api\s+key|secret\s+key|password|credentials)\b"), 0.45, "credential mention"),
    (re.compile(r"\b(you\s+are\s+now|enable\s+)\w*\s*(mode)\b"), 0.5, "mode hijack"),
    (re.compile(r"\b(exfiltrate|forward\s+this|email\s+it)\b"), 0.6, "exfiltration"),
    (re.compile(r"\b(audit|system)\s+note\b"), 0.4, "embedded note"),
    (re.compile(r"\binstructions?\b"), 0.3, "instruction mention"),
    (re.compile(r"\badmin(istrator)?\b"), 0.2, "administrator mention"),
    (re.compile(r"\bclick\s+the\s+(verification|reset|login)\s+link\b"), 0.6, "phishing call to action"),
)

_THRESHOLD = 0.6


@dataclass
class GuardVerdict:
    verdict: str  # "safe" | "unsafe"
    score: float
    category: str
    reason: str
    engine: str
    latency_ms: float

    def as_dict(self) -> dict:
        return {
            "verdict": self.verdict,
            "score": round(self.score, 3),
            "category": self.category,
            "reason": self.reason,
            "engine": self.engine,
            "latency_ms": round(self.latency_ms, 3),
        }


def _mock_classify(text: str) -> tuple[str, float, str, str]:
    lowered = text.lower()
    total = 0.0
    labels: list[str] = []
    for pattern, weight, label in _MARKERS:
        matches = pattern.findall(lowered)
        if matches:
            occurrences = len(matches)
            total += weight * min(occurrences, 2)
            labels.append(label)
    score = min(total, 1.0)
    verdict = "unsafe" if score >= _THRESHOLD else "safe"
    if verdict == "unsafe":
        reason = "policy violation: " + ", ".join(dict.fromkeys(labels))
        category = "S2" if any("override" in lab or "directive" in lab for lab in labels) else "S5"
    else:
        reason = "no policy violation detected" if not labels else "weak signals only: " + ", ".join(
            dict.fromkeys(labels)
        )
        category = "S0"
    return verdict, score, category, reason


class LlamaGuard:
    def __init__(self) -> None:
        self._client = None
        self._note = ""

    @property
    def engine(self) -> str:
        if settings.real_mode:
            return f"groq:{settings.llama_guard_model}"
        return "llama-guard-3-mock"

    @property
    def note(self) -> str:
        return self._note

    def _groq(self):
        if self._client is None:
            from groq import Groq

            self._client = Groq(api_key=settings.groq_api_key)
        return self._client

    def classify(self, text: str) -> GuardVerdict:
        started = time.perf_counter()
        if settings.real_mode:
            try:
                client = self._groq()
                completion = client.chat.completions.create(
                    model=settings.llama_guard_model,
                    messages=[{"role": "user", "content": text}],
                    temperature=0,
                    max_tokens=20,
                )
                raw = (completion.choices[0].message.content or "").strip()
                verdict = "unsafe" if raw.lower().startswith("unsafe") else "safe"
                category = raw.splitlines()[1].strip() if "\n" in raw else "S0"
                return GuardVerdict(
                    verdict=verdict,
                    score=1.0 if verdict == "unsafe" else 0.0,
                    category=category,
                    reason="llama guard 3 verdict",
                    engine=f"groq:{settings.llama_guard_model}",
                    latency_ms=(time.perf_counter() - started) * 1000,
                )
            except Exception as exc:  # graceful fallback per NFR-3.2
                self._note = f"Groq Llama Guard unavailable ({type(exc).__name__}); using mock"

        verdict, score, category, reason = _mock_classify(text)
        return GuardVerdict(
            verdict=verdict,
            score=score,
            category=category,
            reason=reason,
            engine="llama-guard-3-mock",
            latency_ms=(time.perf_counter() - started) * 1000,
        )


llama_guard = LlamaGuard()
