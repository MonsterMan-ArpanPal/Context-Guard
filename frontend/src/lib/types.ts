export type PathKey = "llama_guard" | "contextguard";

export type VdsComponents = {
  score: number;
  displacement: number;
  displacement_norm: number;
  affinity: number;
  neutrality: number;
  lexical: number;
  lexical_hits: string[];
  query_drift: number;
  suspect_sentence: string;
};

export type GuardVerdict = {
  verdict: "safe" | "unsafe";
  score: number;
  category: string;
  reason: string;
  engine: string;
  latency_ms: number;
};

export type RemovedSentence = {
  text: string;
  reason: string;
  rule: string;
};

export type InjectionMeta = {
  trigger: string;
  canary: string;
  output: string;
  attack_type: string;
  description: string;
};

export type ChunkTrace = {
  chunk_id: string;
  document_id: string;
  document_title: string;
  kind: string;
  index: number;
  retrieval_score: number;
  text: string;
  vds: VdsComponents;
  hijacked: boolean;
  guard: GuardVerdict;
  removed: RemovedSentence[];
  sanitized_text: string;
  preserved_ratio: number;
  stage_ms: { retrieval: number; vds: number; sanitize: number; guard: number };
  injections: InjectionMeta[];
};

export type Stages = {
  retrieval: number;
  vds: number;
  sanitize: number;
  guard: number;
  llm: number;
};

export type PathResult = {
  chunks_flagged: number;
  chunks_dropped?: number;
  chunks_sanitized?: number;
  sentences_removed?: number;
  response: string;
  latency_ms: number;
  stages: Stages;
  attack_success: boolean;
  canary?: string | null;
  utility_score: number;
  utility_preserved: boolean;
  refused: boolean;
  score: number;
  vds_threshold?: number;
  preserved_ratio?: number;
};

export type QueryResult = {
  run_id: string;
  timestamp: number;
  query: string;
  prompt_id: string | null;
  prompt_label: string | null;
  target_document: string | null;
  attack_type: string;
  category: "benign" | "attack" | "custom";
  attack: boolean;
  expected_answer: string | null;
  expected_keywords: string[];
  threshold: number;
  top_k: number;
  chunks: ChunkTrace[];
  llama_guard: PathResult;
  contextguard: PathResult;
  winner: { system: PathKey | "tie"; reason: string };
  evidence: { llama_guard: string; contextguard: string };
  total_ms: number;
  engine: { llm: string; guard: string; sanitizer: string; embeddings: string; mode: string };
};

export type DocumentSummary = {
  id: string;
  title: string;
  filename: string;
  kind: "benign" | "poisoned";
  summary: string;
  preview: string;
  paragraphs: number;
  chunks: number;
  injections: { attack_type: string; canary: string; description: string }[];
};

export type DocumentDetail = {
  id: string;
  title: string;
  filename: string;
  kind: "benign" | "poisoned";
  summary: string;
  paragraphs: {
    index: number;
    text: string;
    chunk_id: string;
    poisoned: boolean;
    injection_spans: {
      start: number;
      end: number;
      canary: string;
      attack_type: string;
      description: string;
    }[];
  }[];
};

export type SamplePrompt = {
  id: string;
  label: string;
  query: string;
  target_document: string;
  category: "benign" | "attack";
  attack_type: string;
  expected_answer: string;
  expected_keywords: string[];
};

export type SystemMetrics = {
  asr: number;
  utility: number;
  utility_attack_runs: number;
  fpr: number;
  false_positives: number;
  refusal_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  latency_breakdown: Stages;
  wins: number;
};

export type Metrics = {
  totals: {
    runs: number;
    attack_runs: number;
    benign_runs: number;
    wins: { llama_guard: number; contextguard: number };
    updated_at: number;
  };
  llama_guard: SystemMetrics;
  contextguard: SystemMetrics;
  timeline: {
    run: number;
    label: string;
    category: string;
    llama_guard: number;
    contextguard: number;
    lg_stages: Stages;
    cg_stages: Stages;
  }[];
  scatter: {
    run: number;
    label: string;
    llama_guard: { security: number; utility: number };
    contextguard: { security: number; utility: number };
  }[];
  runs: {
    run_id: string;
    timestamp: number;
    query: string;
    label: string | null;
    category: string;
    attack_type: string | null;
    winner: { system: PathKey | "tie"; reason: string };
    llama_guard: {
      attack_success: boolean;
      utility_score: number;
      latency_ms: number;
      chunks_dropped: number;
    };
    contextguard: {
      attack_success: boolean;
      utility_score: number;
      latency_ms: number;
      sentences_removed: number;
    };
  }[];
};

export type UserSummary = {
  id: string;
  title: string;
  filename: string;
  source: "uploaded";
  chunks: number;
  paragraphs: number;
  preview: string;
};

export type UserDetail = {
  id: string;
  title: string;
  filename: string;
  kind: "user";
  summary: string;
  paragraphs: {
    index: number;
    text: string;
    chunk_id: string;
    poisoned: false;
    injection_spans: { start: number; end: number; canary: string; attack_type: string; description: string }[];
  }[];
  source: "uploaded";
};

export type AllDocuments = {
  documents: DocumentSummary[];
  user_uploaded: UserSummary[];
};

export type Health = {
  status: string;
  mode: string;
  real_mode: boolean;
  engine: { llm: string; guard: string; sanitizer: string; embeddings: string };
  vector_store: { backend: string; chunks: number };
  documents: number;
  chunks: number;
  notes: string[];
};
