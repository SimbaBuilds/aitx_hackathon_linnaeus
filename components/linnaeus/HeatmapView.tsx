"use client";

import { useState } from "react";
import { heatCells, surfaces, target, type HeatCell } from "@/components/linnaeus/data";
import { heatFill, heatInk } from "@/components/linnaeus/colors";

const base = (p: string) => p.split("/").pop() || p;
const dir = (p: string) => {
  const parts = p.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") + "/" : "";
};

function Cell({ c }: { c: HeatCell }) {
  const stalled = c.probe_stalled != null;
  return (
    <div
      className="group relative flex min-h-[128px] flex-col justify-between overflow-hidden rounded-xl p-3.5 ring-1 ring-black/10 transition-transform duration-150 hover:-translate-y-0.5 dark:ring-white/10"
      style={{ background: heatFill(c.heat), color: heatInk(c.heat) }}
      title={`loc ${c.loc} · cyclomatic ${c.cyclomatic} · coupling ${c.coupling} · dry-violations ${c.dry_violations}`}
    >
      {stalled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ boxShadow: "inset 0 0 0 2.5px #d03b3b, 0 0 0 1px #d03b3b" }}
        />
      )}
      <div className="relative">
        <div className="font-mono text-[11px] leading-tight opacity-70">{dir(c.path)}</div>
        <div className="font-mono text-sm font-semibold leading-tight break-all">{base(c.path)}</div>
      </div>
      <div className="relative flex items-end justify-between gap-2">
        <div className="tabular-nums text-2xl font-semibold tracking-tight">
          {c.heat.toFixed(2)}
          <span className="ml-1 align-top text-[10px] font-normal uppercase tracking-wide opacity-70">heat</span>
        </div>
        {stalled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#d03b3b] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            <span className="size-1.5 animate-pulse rounded-full bg-white" />
            STALLED
          </span>
        )}
      </div>
      {stalled && (
        <div className="relative mt-1 font-mono text-[11px] font-medium opacity-90">
          probe: {c.probe_stalled}
        </div>
      )}
    </div>
  );
}

function Legend() {
  const stops = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>predicted friction</span>
        <div className="flex overflow-hidden rounded-md ring-1 ring-border">
          {stops.map((s) => (
            <span key={s} className="size-4" style={{ background: heatFill(s) }} />
          ))}
        </div>
        <span>low → high</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-3 rounded-[3px] ring-2 ring-[#d03b3b]" />
        <span>probe confirmed a stall</span>
      </div>
    </div>
  );
}

export function HeatmapView() {
  const [view, setView] = useState<"codebase" | "surfaces">("codebase");
  const cells = [...heatCells].sort((a, b) => b.heat - a.heat);
  const confirmed = heatCells.filter((c) => c.probe_stalled).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Operability heatmap</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
            A cheap static pre-scan of{" "}
            <span className="font-mono text-foreground">{target}</span> predicts where an
            agent will struggle. The darker the cell, the higher the predicted friction —
            and where a probe actually <span className="text-[#d03b3b]">stalled</span>, the
            prediction is confirmed.
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-muted p-0.5 text-sm">
          {(["codebase", "surfaces"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 font-medium capitalize transition-colors ${
                view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "codebase" ? "Codebase" : "Org surfaces"}
            </button>
          ))}
        </div>
      </div>

      {view === "codebase" ? (
        <>
          <Legend />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
            {cells.map((c) => (
              <Cell key={c.path} c={c} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {confirmed} of {heatCells.length} modules were confirmed by a probe stall.
          </p>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {surfaces.map((s) => {
            const ok = s.access_status === "connected";
            const color = ok ? "#0ca30c" : s.access_status === "unauthorized" ? "#d03b3b" : "#ec835a";
            return (
              <div
                key={s.id}
                className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-border"
              >
                <div className="text-sm font-semibold uppercase tracking-wide">{s.kind}</div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color }}>
                  <span className="size-2 rounded-full" style={{ background: color }} />
                  {s.access_status}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
