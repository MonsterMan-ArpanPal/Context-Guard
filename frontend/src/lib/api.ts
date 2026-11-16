import axios from "axios";
import type {
  AllDocuments,
  DocumentDetail,
  DocumentSummary,
  Health,
  Metrics,
  QueryResult,
  SamplePrompt,
  UserDetail,
  UserSummary,
} from "./types";

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

const http = axios.create({ baseURL: API_BASE, timeout: 90_000 });

export async function fetchHealth(): Promise<Health> {
  const { data } = await http.get<Health>("/api/health");
  return data;
}

export async function fetchAllDocuments(): Promise<AllDocuments> {
  const { data } = await http.get<AllDocuments>("/api/documents/all");
  return data;
}

export type UploadResult = {
  filename: string;
  loaded: number;
  indexed: number;
  documents: UserSummary[];
};

/**
 * Sends the PDF as the raw request body. The file name travels as a query param
 * so the API needs no multipart parser.
 */
export async function uploadDocument(file: File): Promise<UploadResult> {
  const { data } = await http.post<UploadResult>("/api/documents/upload", file, {
    params: { filename: file.name },
    headers: { "Content-Type": "application/pdf" },
    timeout: 120_000,
  });
  return data;
}

export async function reindexFiles(): Promise<{ loaded: number; indexed: number }> {
  const { data } = await http.post<{ loaded: number; indexed: number }>("/api/documents/reindex");
  return data;
}

export async function fetchDocument(id: string): Promise<DocumentDetail | UserDetail> {
  const { data } = await http.get<DocumentDetail | UserDetail>(`/api/documents/${id}`);
  return data;
}

export async function fetchPrompts(): Promise<SamplePrompt[]> {
  const { data } = await http.get<SamplePrompt[]>("/api/prompts");
  return data;
}

export async function fetchMetrics(): Promise<Metrics> {
  const { data } = await http.get<Metrics>("/api/metrics");
  return data;
}

export type QueryPayload = {
  query: string;
  prompt_id?: string | null;
  top_k?: number;
  vds_threshold?: number;
};

export async function runQuery(payload: QueryPayload): Promise<QueryResult> {
  const { data } = await http.post<QueryResult>("/api/query", payload);
  return data;
}

export async function runBenchmark(): Promise<{ results: QueryResult[]; metrics: Metrics }> {
  const { data } = await http.post<{ results: QueryResult[]; metrics: Metrics }>("/api/benchmark");
  return data;
}

export async function resetDemo(): Promise<{ ok: boolean; message: string }> {
  const { data } = await http.post<{ ok: boolean; message: string }>("/api/demo/reset");
  return data;
}
