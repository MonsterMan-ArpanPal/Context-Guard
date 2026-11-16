import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Plus } from "lucide-react";
import { fetchAllDocuments, uploadDocument } from "@/lib/api";
import type { QueryResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  title: string;
  filename: string;
  chunks: number;
  flagged: number;
  referenced: boolean;
};

export function DocumentSidebar({ result }: { result: QueryResult | null }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: corpus } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchAllDocuments,
    staleTime: 30_000,
  });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) await uploadDocument(file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
    },
  });

  const meta = new Map<string, { filename: string; chunks: number }>();
  for (const doc of corpus?.documents ?? []) {
    meta.set(doc.id, { filename: doc.filename, chunks: doc.chunks });
  }
  for (const doc of corpus?.user_uploaded ?? []) {
    meta.set(doc.id, { filename: doc.filename, chunks: doc.chunks });
  }

  const rows: Row[] = [];

  if (result) {
    const perDocument = new Map<string, Row>();
    for (const chunk of result.chunks) {
      const row =
        perDocument.get(chunk.document_id) ??
        ({
          id: chunk.document_id,
          title: chunk.document_title,
          filename: meta.get(chunk.document_id)?.filename ?? `${chunk.document_id}.pdf`,
          chunks: 0,
          flagged: 0,
          referenced: true,
        } satisfies Row);

      row.chunks += 1;
      if (chunk.hijacked) row.flagged += 1;
      perDocument.set(chunk.document_id, row);
    }
    rows.push(...perDocument.values());
  } else {
    for (const doc of corpus?.documents ?? []) {
      rows.push({
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        chunks: doc.chunks,
        flagged: 0,
        referenced: false,
      });
    }
    for (const doc of corpus?.user_uploaded ?? []) {
      rows.push({
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        chunks: doc.chunks,
        flagged: 0,
        referenced: false,
      });
    }
  }

  return (
    <aside className="card overflow-hidden lg:sticky lg:top-6">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <p className="eyebrow">{result ? "referenced" : "documents"}</p>
        <span className="font-mono text-[9px] text-zinc-600">{rows.length}</span>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) upload.mutate(files);
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="ml-auto flex items-center gap-1 rounded-md border border-white/[0.09] px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-100 disabled:opacity-50"
        >
          {upload.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          add pdf
        </button>
      </div>

      <ul className="max-h-[320px] overflow-y-auto py-1">
        {rows.length === 0 && (
          <li className="px-3 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-600">
            {corpus ? "no documents indexed" : "loading…"}
          </li>
        )}

        {rows.map((row) => (
          <li
            key={row.id}
            className={cn(
              "flex items-start gap-2 px-3 py-1.5",
              row.referenced ? "bg-white/[0.02]" : "",
            )}
          >
            <FileText className="mt-0.5 h-3 w-3 shrink-0 text-zinc-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] leading-tight text-zinc-300">{row.title}</p>
              <p className="mt-0.5 truncate font-mono text-[9px] text-zinc-600">
                {row.filename} · {row.chunks}
                {row.referenced ? " used" : " chunks"}
              </p>
            </div>
            {row.flagged > 0 ? (
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                title={`${row.flagged} flagged chunk${row.flagged === 1 ? "" : "s"}`}
              />
            ) : row.referenced ? (
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400/70"
                title="clean"
              />
            ) : null}
          </li>
        ))}
      </ul>

      <div className="border-t border-white/[0.06] px-3 py-2">
        {upload.isError ? (
          <p className="font-mono text-[9.5px] leading-relaxed text-danger-300">
            {upload.error instanceof Error ? upload.error.message : "upload failed"}
          </p>
        ) : (
          <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-zinc-600">
            {upload.isPending
              ? "indexing pdf…"
              : result
                ? "chunks retrieved for this query"
                : "pdfs join retrieval on upload"}
          </p>
        )}
      </div>
    </aside>
  );
}
