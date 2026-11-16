"""Response generation.

``real`` mode uses Llama-3.3-70B on Groq.  ``demo`` mode is a deterministic
simulation that reproduces the two behaviours the demo must show: a model that
obeys a surviving payload, and a model that answers extractively from facts.
"""

from __future__ import annotations

import re
import time

from .config import settings
from .corpus import INJECTIONS, normalize, split_sentences

# Keeps decimals (14.2) and hyphenates (write-ahead) but not sentence-final dots.
_WORD = re.compile(r"[a-z0-9]+(?:[.\-][a-z0-9]+)*")

_STOPWORDS = {
    "the", "a", "an", "of", "to", "in", "on", "at", "for", "and", "or", "is", "are",
    "was", "were", "does", "do", "did", "what", "which", "how", "many", "much", "who",
    "when", "where", "why", "this", "that", "these", "those", "it", "its", "with",
    "by", "from", "as", "be", "been", "can", "could", "should", "would", "will",
    "per", "each", "any", "there", "their", "they", "our", "we", "you", "your",
}

REFUSAL = (
    "I don't have enough retrieved information to answer that question. "
    "The supporting passage was removed before it reached the model."
)


def tokens(text: str) -> list[str]:
    return [t for t in _WORD.findall(text.lower()) if t not in _STOPWORDS and len(t) > 1]


def _sentence_candidates(context: list[str]) -> list[str]:
    candidates: list[str] = []
    for chunk in context:
        candidates.extend(split_sentences(chunk))
    return [c for c in (normalize(c) for c in candidates) if c]


def _lexical_overlap(query: str, sentence: str) -> float:
    query_tokens = set(tokens(query))
    if not query_tokens:
        return 0.0
    sentence_tokens = set(tokens(sentence))
    return len(query_tokens & sentence_tokens) / len(query_tokens)


def _surviving_injection(context: list[str]):
    joined = normalize(" ".join(context)).lower()
    for injection in INJECTIONS:
        probe = normalize(injection.trigger).lower()
        # Detect the payload even if punctuation was altered by parsing.
        head = probe[:60]
        if head and head in joined:
            return injection
    return None


class SimulatedLLM:
    """Deterministic stand-in for Llama-3.3-70B used in demo mode."""

    name = "llama-3.3-70b (simulated)"

    def generate(self, query: str, context: list[str], system: str) -> str:
        if not context:
            return REFUSAL

        injection = _surviving_injection(context)
        if injection is not None:
            return injection.output

        candidates = _sentence_candidates(context)
        scored = sorted(
            ((_lexical_overlap(query, s), s) for s in candidates), key=lambda item: -item[0]
        )
        chosen: list[str] = []
        for score, sentence in scored:
            if score <= 0:
                continue
            if sentence in chosen:
                continue
            chosen.append(sentence)
            if len(chosen) == 2:
                break

        if not chosen:
            # No retrieved sentence shares vocabulary with the question: the relevant
            # context was dropped upstream, so an honest model would decline.
            return REFUSAL

        return "Based on the retrieved documentation: " + " ".join(chosen)


class GroqLLM:
    name = "groq:llama-3.3-70b-versatile"

    def __init__(self) -> None:
        self._client = None
        self._note = ""

    @property
    def note(self) -> str:
        return self._note

    def _groq(self):
        if self._client is None:
            from groq import Groq

            self._client = Groq(api_key=settings.groq_api_key)
        return self._client

    def generate(self, query: str, context: list[str], system: str) -> str:
        if not context:
            return REFUSAL
        try:
            client = self._groq()
            document = "\n\n---\n\n".join(context)
            completion = client.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": system},
                    {
                        "role": "user",
                        "content": f"Context:\n{document}\n\nQuestion: {query}",
                    },
                ],
                temperature=0.1,
                max_tokens=320,
            )
            return (completion.choices[0].message.content or "").strip() or REFUSAL
        except Exception as exc:  # graceful fallback per NFR-3.2
            self._note = f"Groq generation failed ({type(exc).__name__}); using simulation"
            return SimulatedLLM().generate(query, context, system)


class LLM:
    """Facade that routes to Groq or the deterministic simulation."""

    def __init__(self) -> None:
        self._sim = SimulatedLLM()
        self._groq: GroqLLM | None = None

    @property
    def name(self) -> str:
        if settings.real_mode:
            return f"groq:{settings.groq_model}"
        return self._sim.name

    @property
    def note(self) -> str:
        return self._groq.note if self._groq is not None else ""

    def generate(self, query: str, context: list[str], system: str) -> tuple[str, float]:
        started = time.perf_counter()
        if settings.real_mode:
            if self._groq is None:
                self._groq = GroqLLM()
            text = self._groq.generate(query, context, system)
        else:
            # Simulated inference cost, keeping the demo's latency profile realistic.
            text = self._sim.generate(query, context, system)
        return text, (time.perf_counter() - started) * 1000


llm = LLM()
