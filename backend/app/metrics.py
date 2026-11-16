"""Aggregated benchmark metrics with JSON persistence."""

from __future__ import annotations

import json
import threading
import time
from pathlib import Path

from .config import settings

MAX_RUNS = 200


class MetricsStore:
    def __init__(self, path: Path | None = None) -> None:
        self.path = path or settings.metrics_file
        self._lock = threading.Lock()
        self._runs: list[dict] = []
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            self._runs = json.loads(self.path.read_text())
        except Exception:
            self._runs = []

    def _persist(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self._runs[-MAX_RUNS:], indent=1))

    def record(self, result: dict) -> None:
        with self._lock:
            self._runs.append(result)
            if len(self._runs) > MAX_RUNS:
                self._runs = self._runs[-MAX_RUNS:]
            self._persist()

    def reset(self) -> None:
        with self._lock:
            self._runs = []
            self._persist()

    @property
    def runs(self) -> list[dict]:
        return list(self._runs)

    # -- aggregation -------------------------------------------------------
    def aggregate(self) -> dict:
        runs = self._runs
        attack_runs = [r for r in runs if r.get("attack")]
        benign_runs = [r for r in runs if not r.get("attack")]

        def system_stats(key: str) -> dict:
            latencies = [r[key]["latency_ms"] for r in runs]
            stages = {"retrieval": 0.0, "vds": 0.0, "sanitize": 0.0, "guard": 0.0, "llm": 0.0}
            for run in runs:
                for stage, value in run[key]["stages"].items():
                    stages[stage] = stages.get(stage, 0.0) + value
            count = len(runs) or 1
            attacks = [r for r in attack_runs]
            flagged_benign = [
                r for r in benign_runs if r[key]["chunks_flagged"] > 0
            ]
            return {
                "asr": round(
                    sum(1 for r in attacks if r[key]["attack_success"]) / len(attacks), 3
                )
                if attacks
                else 0.0,
                "utility": round(
                    sum(r[key]["utility_score"] for r in runs) / len(runs), 3
                )
                if runs
                else 0.0,
                "utility_attack_runs": round(
                    sum(r[key]["utility_score"] for r in attack_runs) / len(attack_runs), 3
                )
                if attack_runs
                else 0.0,
                "fpr": round(len(flagged_benign) / len(benign_runs), 3) if benign_runs else 0.0,
                "false_positives": len(flagged_benign),
                "refusal_rate": round(
                    sum(1 for r in runs if r[key]["refused"]) / len(runs), 3
                )
                if runs
                else 0.0,
                "avg_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else 0.0,
                "p95_latency_ms": round(
                    sorted(latencies)[max(0, int(len(latencies) * 0.95) - 1)], 2
                )
                if latencies
                else 0.0,
                "latency_breakdown": {
                    stage: round(value / count, 2) for stage, value in stages.items()
                },
                "wins": sum(1 for r in runs if r["winner"]["system"] == key),
            }

        timeline = [
            {
                "run": index + 1,
                "label": (r.get("prompt_label") or r["query"])[:38],
                "category": r.get("category", "custom"),
                "llama_guard": r["llama_guard"]["latency_ms"],
                "contextguard": r["contextguard"]["latency_ms"],
                "lg_stages": r["llama_guard"]["stages"],
                "cg_stages": r["contextguard"]["stages"],
            }
            for index, r in enumerate(runs)
        ]

        scatter = [
            {
                "run": index + 1,
                "label": (r.get("prompt_label") or r["query"])[:38],
                "llama_guard": {
                    "security": 0.0 if r["llama_guard"]["attack_success"] else 1.0,
                    "utility": r["llama_guard"]["utility_score"],
                },
                "contextguard": {
                    "security": 0.0 if r["contextguard"]["attack_success"] else 1.0,
                    "utility": r["contextguard"]["utility_score"],
                },
            }
            for index, r in enumerate(runs)
        ]

        return {
            "totals": {
                "runs": len(runs),
                "attack_runs": len(attack_runs),
                "benign_runs": len(benign_runs),
                "wins": {
                    "llama_guard": sum(1 for r in runs if r["winner"]["system"] == "llama_guard"),
                    "contextguard": sum(1 for r in runs if r["winner"]["system"] == "contextguard"),
                },
                "updated_at": time.time(),
            },
            "llama_guard": system_stats("llama_guard"),
            "contextguard": system_stats("contextguard"),
            "timeline": timeline,
            "scatter": scatter,
            "runs": [
                {
                    "run_id": r["run_id"],
                    "timestamp": r["timestamp"],
                    "query": r["query"],
                    "label": r.get("prompt_label"),
                    "category": r.get("category", "custom"),
                    "attack_type": r.get("attack_type"),
                    "winner": r["winner"],
                    "llama_guard": {
                        "attack_success": r["llama_guard"]["attack_success"],
                        "utility_score": r["llama_guard"]["utility_score"],
                        "latency_ms": r["llama_guard"]["latency_ms"],
                        "chunks_dropped": r["llama_guard"]["chunks_dropped"],
                    },
                    "contextguard": {
                        "attack_success": r["contextguard"]["attack_success"],
                        "utility_score": r["contextguard"]["utility_score"],
                        "latency_ms": r["contextguard"]["latency_ms"],
                        "sentences_removed": r["contextguard"]["sentences_removed"],
                    },
                }
                for r in reversed(runs[-12:])
            ],
        }


metrics_store = MetricsStore()
