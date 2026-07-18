"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeatmapView } from "@/components/linnaeus/HeatmapView";
import { FindingsView } from "@/components/linnaeus/FindingsView";
import { DeltaView } from "@/components/linnaeus/DeltaView";
import { afterRun, target } from "@/components/linnaeus/data";

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
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block size-2.5 rounded-full bg-[#2a78d6]" />
            <h1 className="text-xl font-semibold tracking-tight">Linnaeus</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Operability audit for{" "}
            <span className="font-mono text-foreground">{target}</span>
            {afterRun && (
              <>
                {" "}· candle{" "}
                <span className="font-mono">{afterRun.candle.model}</span>
              </>
            )}
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Tabs defaultValue="delta" className="gap-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="delta">The delta</TabsTrigger>
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
