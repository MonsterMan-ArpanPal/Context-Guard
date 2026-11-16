"""Dependency-parsing micro-sanitization.

Instead of dropping a suspicious chunk (which destroys the facts it carries), we
parse it and delete *only* the sentences that act on the reader: imperatives,
role hijacks, forced-output directives and exfiltration requests.  Declarative
factual sentences survive untouched.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .corpus import normalize, split_sentences

_IMPERATIVE_VERBS = {
    "ignore", "disregard", "forget", "print", "output", "respond", "reply", "say",
    "send", "email", "forward", "reveal", "leak", "exfiltrate", "execute", "run",
    "obey", "follow", "use", "write", "return", "answer", "repeat", "include",
    "insert", "append", "pretend", "act", "stop", "start", "switch", "override",
}

_MODEL_WORDS = {
    "assistant", "model", "llm", "ai", "chatbot", "system", "administrator",
    "admin", "developer", "user", "instruction", "instructions", "prompt",
}

_SECRET_WORDS = {"api key", "secret", "password", "credential", "credentials", "token", "confidential"}

# Prevent accidental double-definition of secret tokens in the rule-based checks.
# The secret-exfiltration rule already covers the canonical patterns; avoid
# re-checking here to keep the imperative fallback minimal and fast.
_HIDDEN_SECRET_CHECK = False
# (pattern, human reason, machine rule) — evaluated in order.
_DIRECTIVE_RULES: tuple[tuple[re.Pattern[str], str, str], ...] = (
    (
        re.compile(r"\b(ignore|disregard|forget)\b[^.]{0,40}\b(instruction|prompt|rule|request)"),
        "attempts to override prior instructions",
        "instruction_override",
    ),
    (
        re.compile(r"\bsystem\s+(override|update|prompt|message)\b"),
        "impersonates a system-level message",
        "fake_system_message",
    ),
    (
        re.compile(r"\b(administrator|admin|developer|root)\b[^.]{0,30}\b(directive|note|override|instruction|command)"),
        "impersonates an authority directive",
        "fake_authority",
    ),
    (
        re.compile(r"\bfrom now on\b|\bgoing forward you\b"),
        "establishes persistent behaviour on the reader",
        "persistence",
    ),
    (
        re.compile(r"\byou (are|must|will) now\b"),
        "reassigns the reader's role",
        "role_hijack",
    ),
    (
        re.compile(r"\b(maintenance|debug|override|unrestricted)\s+(mode|patch|update)\b"),
        "declares a hijacked operating mode",
        "mode_hijack",
    ),
    (
        re.compile(
            r"\b(respond|reply|output|answer|print|say)\b[^.]{0,40}\b(only|exactly|single word|nothing else)\b"
        ),
        "dictates the exact output of the model",
        "forced_output",
    ),
    (
        re.compile(
            r"\b(print|reveal|output|disclose|leak|email|send|forward|share)\b[^.]{0,40}"
            r"\b(api key|secret|password|credential|credential|confidential|token)\b"
        ),
        "requests disclosure of confidential data",
        "secret_exfiltration",
    ),
    (
        re.compile(r"\b(note|message|instruction)s?\s+(for|to)\s+the\s+(ai|assistant|model|llm)\b"),
        "is addressed to the assistant",
        "model_addressing",
    ),
    (
        re.compile(r"\bwhenever\b[^.]{0,40}\b(asked|question)"),
        "conditions future responses on the question",
        "conditioned_response",
    ),
    (
        re.compile(r"\b(this document|policy|handbook)\b[^.]{0,30}\bsupersed"),
        "instructs the reader to replace policy with document text",
        "policy_override",
    ),
)


@dataclass
class RemovedSentence:
    text: str
    reason: str
    rule: str


@dataclass
class SanitizeResult:
    sanitized: str
    removed: list[RemovedSentence] = field(default_factory=list)
    kept_sentences: int = 0
    total_sentences: int = 0
    engine: str = "spacy"
    elapsed_ms: float = 0.0

    @property
    def preserved_ratio(self) -> float:
        if not self.total_sentences:
            return 1.0
        return round(self.kept_sentences / self.total_sentences, 3)


class _SpacySanitizer:
    name = "spacy:en_core_web_sm"

    def __init__(self) -> None:
        import spacy

        self.nlp = spacy.load("en_core_web_sm", disable=["ner", "lemmatizer"])

    def is_imperative(self, sentence) -> bool:
        root = sentence.root
        if root.pos_ != "VERB":
            return False
        # spaCy tags bare English imperatives as VB with no subject.
        has_subject = any(child.dep_ in ("nsubj", "nsubjpass", "expl") for child in root.children)
        return root.tag_ == "VB" and not has_subject


class _RegexSanitizer:
    """Fallback used when the spaCy model cannot be loaded."""

    name = "regex-fallback"

    def is_imperative(self, sentence: str) -> bool:  # type: ignore[override]
        lowered = sentence.lower()
        first = re.findall(r"[a-z']+", lowered)[:1]
        return bool(first) and first[0] in _IMPERATIVE_VERBS and not lowered.startswith(
            ("the ", "a ", "an ", "this ", "it ", "they ", "we ")
        )


class MicroSanitizer:
    def __init__(self) -> None:
        self._engine = None
        self._cache: dict[str, SanitizeResult] = {}
        self._cache_limit = 512

    @property
    def engine_name(self) -> str:
        return self._load().name

    def _load(self):
        if self._engine is not None:
            return self._engine
        try:
            self._engine = _SpacySanitizer()
        except Exception:
            self._engine = _RegexSanitizer()
        return self._engine

    # -- rules -------------------------------------------------------------
    def _judge(self, sentence: str, parsed=None) -> tuple[bool, str, str] | None:
        lowered = sentence.lower()
        words = set(re.findall(r"[a-z]+", lowered))

        if parsed is not None:
            imperative = self._engine.is_imperative(parsed)
        else:
            imperative = self._engine.is_imperative(sentence)

        # 1. Model-directed or role-hijacking language.
        if words & {"assistant", "llm", "chatbot"} or "language model" in lowered:
            if words & _MODEL_WORDS and (
                imperative
                or any(pattern.search(lowered) for pattern, _, _ in _DIRECTIVE_RULES)
                or "mode" in lowered
            ):
                return True, "addresses the model directly with a directive", "model_addressing"

        # 2. Explicit override / persisted-instruction phrasing.
        for pattern, reason, rule in _DIRECTIVE_RULES:
            if pattern.search(lowered):
                return True, reason, rule

        # 3. Imperative sentence with no factual subject, aimed at the reader.
        if imperative:
            if any(word in lowered for word in _SECRET_WORDS):
                return True, "imperative request for a secret", "secret_request"
            if "you" in words or "your" in words or words & _MODEL_WORDS:
                return True, "second-person imperative aimed at the reader", "second_person_imperative"
            if any(marker in lowered for marker in ("email", "http://", "https://", "@")):
                return True, "imperative with an outbound channel", "exfiltration"

        return None

    def sanitize(self, text: str) -> SanitizeResult:
        import time

        # Chunks in the index are immutable, so a sanitized result can be reused
        # verbatim: a document is parsed once no matter how many queries hit it.
        cached = self._cache.get(text)
        if cached is not None:
            return SanitizeResult(
                sanitized=cached.sanitized,
                removed=cached.removed,
                kept_sentences=cached.kept_sentences,
                total_sentences=cached.total_sentences,
                engine=cached.engine,
                elapsed_ms=0.0,
            )

        started = time.perf_counter()
        engine = self._load()
        removed: list[RemovedSentence] = []

        if isinstance(engine, _SpacySanitizer):
            try:
                doc = engine.nlp(text)
                sentences: list[tuple[str, object | None]] = [
                    (s.text.strip(), s) for s in doc.sents
                ]
            except Exception:
                sentences = [(s, None) for s in split_sentences(text)]
        else:
            sentences = [(s, None) for s in split_sentences(text)]

        kept: list[str] = []
        for sentence_text, parsed in sentences:
            sentence_text = normalize(sentence_text)
            if not sentence_text:
                continue
            verdict = self._judge(sentence_text, parsed)
            if verdict is None:
                kept.append(sentence_text)
            else:
                _, reason, rule = verdict
                removed.append(RemovedSentence(text=sentence_text, reason=reason, rule=rule))

        total = len(sentences)
        elapsed = (time.perf_counter() - started) * 1000
        result = SanitizeResult(
            sanitized=" ".join(kept),
            removed=removed,
            kept_sentences=len(kept),
            total_sentences=total,
            engine=engine.name,
            elapsed_ms=round(elapsed, 3),
        )
        if len(self._cache) >= self._cache_limit:
            self._cache.pop(next(iter(self._cache)))
        self._cache[text] = result
        return result


sanitizer = MicroSanitizer()
