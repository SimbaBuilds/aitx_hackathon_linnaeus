"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeatmapView } from "@/components/linnaeus/HeatmapView";
import { FindingsView } from "@/components/linnaeus/FindingsView";
import { DeltaView } from "@/components/linnaeus/DeltaView";
import { afterRun, org, surfaces } from "@/components/linnaeus/data";

// Linnaea borealis (the twinflower) — Linnaeus's namesake. Two nodding bells.
function Twinflower() {
  return (
    <svg
      className="h-[68px] w-[54px] flex-none text-[#2e5e9e]"
      viewBox="0 0 58 74"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M29 72 C29 58 29 44 29 34" />
      <path d="M29 40 C24 40 16 39 12 34" />
      <path d="M29 44 C34 44 42 43 46 38" />
      <path d="M12 34 C7 33 4 28 6 23 C8 19 13 18 16 21 C19 24 18 31 12 34 Z" />
      <path d="M8 24 L7 21 M11 22 L11 19 M14 23 L15 20" />
      <path d="M46 38 C51 37 54 32 52 27 C50 23 45 22 42 25 C39 28 40 35 46 38 Z" />
      <path d="M50 28 L52 25 M47 26 L48 23 M43 27 L43 24" />
      <path d="M29 60 C24 58 21 60 20 63 M29 60 C34 58 37 60 38 63" />
    </svg>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const prefers =
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(prefers);
    document.documentElement.classList.toggle("dark", prefers);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}

export function Dashboard() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      {/* ── Masthead (herbarium plate) ── */}
      <header className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-5">
        <div className="flex items-center gap-4">
          <Twinflower />
          <div>
            <h1 className="text-4xl leading-none">Linnaeus</h1>
            <p className="mt-1.5 font-serif text-sm italic text-muted-foreground">
              A field guide to agent operability
            </p>
          </div>
        </div>
        <div className="flex items-end gap-4">
          <div className="hidden text-right sm:block">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Agent Operability Audit
            </div>
            <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
              Specimen&nbsp;·&nbsp;<span className="font-semibold text-foreground">{org}</span>
            </div>
            {/* <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
              Surfaces&nbsp;·&nbsp;
              <span className="font-semibold text-foreground">
                {surfaces.map((s) => s.kind).join(" · ")}
              </span>
            </div> */}
            {afterRun && (
              <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                Candle&nbsp;·&nbsp;<span className="font-semibold text-foreground">{afterRun.candle.model}</span>
              </div>
            )}
          </div>
          <ThemeToggle />
        </div>
      </header>
      <div className="mb-8 mt-2.5 flex items-center justify-between font-mono text-[11px] tracking-[0.06em] text-muted-foreground">
        <span>Coll. 2026-07-18&nbsp;·&nbsp;Det. Linnaeus v0.4</span>
        <span>No. LIN—0417</span>
      </div>

      <Tabs defaultValue="delta" className="gap-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="delta">Deltas</TabsTrigger>
        </TabsList>
        <TabsContent value="heatmap">
          <HeatmapView />
        </TabsContent>
        <TabsContent value="findings">
          <FindingsView />
        </TabsContent>
        <TabsContent value="delta">
          <DeltaView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
