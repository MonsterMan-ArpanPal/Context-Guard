import { create } from "zustand";
import type { QueryResult } from "@/lib/types";

export type View = "library" | "compare" | "dashboard";
export type WizardStep = "input" | "processing" | "comparison" | "metrics";

 // Store initial state (keeps types happy)
const initialState = {
  view: "compare" as View,
  promptId: "kestrel-free-tier",
  query: "What does the Kestrel Cloud free tier include each month?",
  threshold: 0.25,
  topK: 3,
  result: null as QueryResult | null,
  activeDocument: null as string | null,
  wizardStep: "input" as WizardStep,
  stepData: {} as Record<string, unknown>,
};

type Store = {
  view: View;
  setView: (view: View) => void;

  promptId: string;
  query: string;
  threshold: number;
  topK: number;
  setPrompt: (id: string, query?: string) => void;
  setQuery: (query: string) => void;
  setThreshold: (threshold: number) => void;
  setTopK: (topK: number) => void;

  result: QueryResult | null;
  setResult: (result: QueryResult | null) => void;

  activeDocument: string | null;
  setActiveDocument: (id: string | null) => void;

  wizardStep: WizardStep;
  setWizardStep: (step: WizardStep) => void;
  stepData: Record<string, unknown>;
  setStepData: (key: string, value: unknown) => void;
};

export const useStore = create<Store>((set) => ({
  ...initialState,
  setView: (view) => set({ view }),
  setPrompt: (id: string, query?: string) =>
    set((state) => ({ promptId: id, query: query ?? state.query })),
  setQuery: (query: string) => set({ query }),
  setThreshold: (threshold: number) => set({ threshold }),
  setTopK: (topK: number) => set({ topK }),

  setResult: (result: QueryResult | null) => set({ result }),

  setActiveDocument: (id: string | null) => set({ activeDocument: id }),

  setWizardStep: (step: WizardStep) => set({ wizardStep: step }),
  setStepData: (key: string, value: unknown) =>
    set((state) => ({ stepData: { ...state.stepData, [key]: value } })),
}));