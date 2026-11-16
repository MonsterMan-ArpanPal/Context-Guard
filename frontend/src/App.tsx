import { Header } from "@/components/dashboard/Header";
import { GuardView } from "@/views/GuardView";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">
        <GuardView />
      </div>
      <footer className="border-t border-white/[0.05]">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-1 px-5 py-4 font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-600 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <span>vector displacement scoring + dependency-parsing micro-sanitization</span>
          <span>only directive sentences are removed · facts stay intact</span>
        </div>
      </footer>
    </div>
  );
}
