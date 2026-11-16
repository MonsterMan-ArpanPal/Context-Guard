import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Database, FileText, ShieldCheck } from "lucide-react";
import { fetchAllDocuments, fetchHealth } from "@/lib/api";
import type { AllDocuments, DocumentSummary } from "@/lib/types";
import { useStore } from "@/store/useStore";
import { DocumentViewer } from "@/components/library/DocumentViewer";
import { Badge } from "@/components/ui/badge";

function DocumentCard({ document, index }: { document: DocumentSummary; index: number }) {
  const setActiveDocument = useStore((s) => s.setActiveDocument);
  const poisoned = document.kind === "poisoned";

  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      onClick={() => setActiveDocument(document.id)}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 text-left backdrop-blur-xl transition-colors hover:border-white/[0.16]"
    >
      <div
        className={
          "pointer-events-none absolute inset-x-0 -top-24 h-40 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 " +
          (poisoned ? "bg-danger-500/25" : "bg-brand-500/20")
        }
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={
            "grid h-9 w-9 place-items-center rounded-lg border " +
            (poisoned
              ? "border-danger-400/25 bg-danger-500/10 text-danger-300"
              : "border-brand-400/25 bg-brand-500/10 text-brand-300")
          }
        >
          {poisoned ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        </span>
        <Badge tone={poisoned ? "danger" : "brand"}>{document.kind}</Badge>
      </div>

      <h3 className="relative mt-4 text-[15px] font-semibold leading-snug tracking-tight text-zinc-100">
        {document.title}
      </h3>
      <p className="relative mt-1.5 text-xs leading-relaxed text-zinc-500">{document.summary}</p>

      <p className="relative mt-4 line-clamp-3 rounded-lg border border-white/[0.05] bg-black/25 p-3 font-mono text-[10.5px] leading-relaxed text-zinc-500">
        {document.preview}…
      </p>

      <div className="relative mt-auto flex items-center gap-2 pt-4">
        <Badge tone="muted">
          <Database className="h-2.5 w-2.5" />
          {document.chunks} chunks
        </Badge>
        {poisoned && (
          <Badge tone="danger">{document.injections.length} payloads</Badge>
        )}
        <span className="ml-auto flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition-colors group-hover:text-zinc-200">
          inspect
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </motion.button>
  );
}

export function LibraryView() {
  const { data: allDocuments, isLoading } = useQuery<AllDocuments>({ queryKey: ["documents"], queryFn: fetchAllDocuments });
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: 0 });

  const poisoned = allDocuments?.documents?.filter((d: any) => d.kind === "poisoned").length ?? 0;

  return (
    <div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow">01 · sample corpus</p>
          <h1 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-[40px]">
            Six documents.{" "}
            <span className="text-gradient-rose">Three of them are weapons.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Every PDF below is generated on startup, parsed, chunked and embedded into the vector
            store. The poisoned files hide imperative payloads as white-on-white text — invisible to
            a reader, perfectly legible to a retriever.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: "documents", value: allDocuments?.documents?.length ?? 0, icon: FileText },
            { label: "poisoned", value: poisoned, icon: AlertTriangle },
            { label: "indexed chunks", value: health?.chunks ?? 0, icon: Database },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex min-w-[118px] items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5"
            >
              <Icon className="h-3.5 w-3.5 text-zinc-500" />
              <div>
                <div className="font-mono text-base leading-none text-zinc-100">{value}</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[290px] animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.02]" />
            ))
          : allDocuments?.documents?.map((document: DocumentSummary, index: number) => (
              <DocumentCard key={document.id} document={document} index={index} />
            ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-[11px] text-zinc-500">
        <span className="font-mono uppercase tracking-[0.16em] text-zinc-600">corpus notes</span>
        <span>
          <span className="text-zinc-300">Kestrel</span> uses overt override language — caught by
          keyword guards.
        </span>
        <span>
          <span className="text-zinc-300">Meridian</span> uses polite policy phrasing — invisible to
          them.
        </span>
        <span>
          <span className="text-zinc-300">Security handbook</span> quotes attack text benignly —
          the false-positive trap.
        </span>
      </div>

      <DocumentViewer />
    </div>
  );
}
