import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, FileText, Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { fetchDocument } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { Badge } from "../ui/badge";

function Highlighted({
  text,
  spans,
}: {
  text: string;
  spans: { start: number; end: number; canary: string }[];
}) {
  if (!spans.length) return <>{text}</>;
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  sorted.forEach((span, index) => {
    if (span.start > cursor) parts.push(text.slice(cursor, span.start));
    parts.push(
      <mark
        key={`${span.start}-${index}`}
        title={`Injected payload · canary ${span.canary}`}
        className="rounded bg-danger-500/15 px-1 py-0.5 text-danger-300 decoration-danger-400/70 underline decoration-wavy underline-offset-4"
      >
        {text.slice(span.start, span.end)}
      </mark>,
    );
    cursor = span.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export function DocumentViewer() {
  const { activeDocument, setActiveDocument } = useStore();
  const { data, isLoading } = useQuery({
    queryKey: ["document", activeDocument],
    queryFn: () => fetchDocument(activeDocument as string),
    enabled: Boolean(activeDocument),
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveDocument(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setActiveDocument]);

  return (
    <AnimatePresence>
      {activeDocument && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 p-4 backdrop-blur-md sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setActiveDocument(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="glass relative w-full max-w-3xl overflow-hidden"
          >
            <div className="sticky top-0 z-10 flex items-start gap-4 border-b border-white/[0.07] bg-[#070a12]/85 px-6 py-5 backdrop-blur-xl">
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
                <FileText className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-white">
                    {data?.title ?? "Loading…"}
                  </h2>
                  {data && (
                    <Badge tone={data.kind === "poisoned" ? "danger" : "brand"}>
                      {data.kind}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  {data?.filename}
                </p>
              </div>
              <button
                onClick={() => setActiveDocument(null)}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
                aria-label="Close document"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {isLoading || !data ? (
                <div className="flex items-center gap-2 py-10 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Parsing PDF…
                </div>
              ) : (
                <>
                  {data.kind === "poisoned" && (
                    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger-400/20 bg-danger-500/[0.07] p-3.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-300" />
                      <p className="text-xs leading-relaxed text-danger-200/90">
                        This document carries <strong>hidden white-on-white payloads</strong>. A
                        human reading the PDF sees only the billing or safety text; a RAG parser
                        extracts the highlighted instructions and feeds them to the model.
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {data.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph.index}
                        className={cn(
                          "text-[13px] leading-7 text-zinc-300",
                          paragraph.poisoned && "rounded-lg bg-white/[0.015] p-2",
                        )}
                      >
                        <span className="mr-2.5 select-none font-mono text-[10px] text-zinc-600">
                          §{String(paragraph.index + 1).padStart(2, "0")}
                        </span>
                        <Highlighted text={paragraph.text} spans={paragraph.injection_spans} />
                      </p>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                    <span className="eyebrow">chunks</span>
                    {data.paragraphs.map((paragraph) => (
                      <Badge
                        key={paragraph.chunk_id}
                        tone={paragraph.poisoned ? "danger" : "muted"}
                        className="font-mono"
                      >
                        {paragraph.chunk_id}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
