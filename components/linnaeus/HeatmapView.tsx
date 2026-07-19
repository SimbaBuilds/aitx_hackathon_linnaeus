"use client";

import { useEffect, useState } from "react";
import {
  heatCells,
  surfaces,
  target,
  afterFindingByProbe,
  orgProbes,
  probeLabel,
  scoreOf,
  taskTextOf,
  traceOf,
  verdictOf,
  hasTrace,
  type OrgProbe,
  type TraceStep,
} from "@/components/linnaeus/data";
import { heatFill } from "@/components/linnaeus/colors";
import { StatusBadge, TagBadge, RemediationBadge } from "@/components/linnaeus/ui";

// ── Unified probe card view-model ──────────────────────────────────────────────
// Both groups (cross-surface org probes and codebase repo probes) render the same
// card. The VM is built locally from the already-exported primitives.
type Finding = OrgProbe["finding"];
type CodeMetrics = {
  loc: number;
  cyclomatic: number;
  coupling: number;
  dry_violations: number;
};
type ProbeCardVM = {
  group: "cross-surface" | "codebase";
  probeId: string;
  label: string;
  task: string;
  surfacesHit: string[];
  score: number;
  status: OrgProbe["status"];
  rootCause: OrgProbe["rootCause"];
  finding: Finding;
  metrics?: CodeMetrics; // codebase probes only
  path?: string; // codebase probes only
};

const base = (p: string) => p.split("/").pop() || p;
const dir = (p: string) => {
  const parts = p.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") + "/" : "";
};

function num(v: Record<string, unknown>, k: string): number {
  const x = v[k];
  return typeof x === "number" ? x : 0;
}

// ── Group VMs (local, derived from exported primitives) ────────────────────────
const crossSurfaceCards: ProbeCardVM[] = orgProbes
  .map((p) => ({
    group: "cross-surface" as const,
    probeId: p.probeId,
    label: p.category,
    task: p.task,
    surfacesHit: p.surfacesHit,
    score: p.score,
    status: p.status,
    rootCause: p.rootCause,
    finding: p.finding,
  }))
  .sort((a, b) => b.score - a.score);

// Keep a cross-surface probe out of the codebase group if it appears in both.
const crossSurfaceProbeIds = new Set(crossSurfaceCards.map((c) => c.probeId));

const codebaseCards: ProbeCardVM[] = heatCells
  .filter((c) => c.probe != null && !crossSurfaceProbeIds.has(c.probe))
  .map((c): ProbeCardVM | null => {
    const probeId = c.probe as string;
    const finding = afterFindingByProbe[probeId];
    if (!finding) return null; // probed cell missing a finding → skip defensively
    return {
      group: "codebase",
      probeId,
      label: probeLabel(probeId),
      task: taskTextOf(probeId),
      surfacesHit: ["repo"],
      score: scoreOf(finding),
      status: finding.status,
      rootCause: finding.root_cause_tag,
      finding,
      metrics: {
        loc: c.loc,
        cyclomatic: c.cyclomatic,
        coupling: c.coupling,
        dry_violations: c.dry_violations,
      },
      path: c.path,
    };
  })
  .filter((c): c is ProbeCardVM => c !== null)
  .sort((a, b) => b.score - a.score);

// ── Uniform probe card ─────────────────────────────────────────────────────────
function ProbeCard({ vm, onOpen }: { vm: ProbeCardVM; onOpen: () => void }) {
  // Friction lives on ONE channel: the blue heat ramp. The card body is washed
  // bluer as friction rises (20%→40% of the ramp over paper), and the left rail
  // carries the full-intensity anchor. Red is reserved for the stall STATUS badge
  // only — never on the friction channel — so the two never blend to purple.
  const t = vm.score / 100;
  const tint = `color-mix(in srgb, ${heatFill(t)} ${Math.round(20 + t * 20)}%, var(--card))`;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-xl p-4 pl-5 text-left ring-1 ring-border transition-transform duration-150 hover:-translate-y-0.5 hover:ring-foreground/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
      style={{ background: tint }}
    >
      {/* blue friction gradient rail — full-intensity anchor for the wash */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
        style={{ background: heatFill(t) }}
      />
      {/* details affordance */}
      <span
        aria-hidden
        className="absolute right-3 top-3 text-muted-foreground opacity-40 transition-opacity group-hover:opacity-90"
      >
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
          <path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <div className="flex items-start justify-between gap-2 pr-5">
        <span className="font-mono text-sm font-semibold">{vm.label}</span>
        <StatusBadge status={vm.status} />
      </div>

      {vm.task && (
        <p className="text-sm italic leading-relaxed text-foreground/90">&ldquo;{vm.task}&rdquo;</p>
      )}

      {/* surfaces the probe actually reached — the codebase-vs-cross-surface tell */}
      {vm.surfacesHit.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">reached</span>
          {vm.surfacesHit.map((s, i) => (
            <span key={`${s}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/60">→</span>}
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">{s}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">root cause</span>
          <TagBadge tag={vm.rootCause} />
        </div>
        <div>
          <span className="tabular-nums text-lg font-bold" style={{ color: "#0d366b" }}>
            {vm.score.toFixed(1)}
          </span>
          <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">friction</span>
        </div>
      </div>
    </button>
  );
}

function Legend() {
  const stops = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>friction</span>
        <div className="flex overflow-hidden rounded-md ring-1 ring-border">
          {stops.map((s) => (
            <span key={s} className="size-4" style={{ background: heatFill(s) }} />
          ))}
        </div>
        <span>low → high</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-3 rounded-[3px] ring-2 ring-[#c0392b]" />
        <span>probe stalled</span>
      </div>
      <span className="text-muted-foreground/70">· click any probe for the agent path</span>
    </div>
  );
}

// ── Cross-surface trace rendering (ported from FindingsView; kept local so the two
//    parallel sessions don't fight over shared exports) ─────────────────────────
const SURFACE_COLOR: Record<string, string> = {
  repo: "#6b7280",
  gmail: "#c0392b",
  drive: "#2f6fed",
  notion: "#111827",
  rds: "#0ca30c",
};
function SurfacePill({ surface }: { surface: string }) {
  const c = SURFACE_COLOR[surface] ?? "#6b7280";
  return (
    <span
      className="inline-flex min-w-[52px] justify-center rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide"
      style={{ background: `${c}1a`, color: c }}
    >
      {surface}
    </span>
  );
}

function TraceStepRow({ step }: { step: TraceStep }) {
  return (
    <li className="flex items-start gap-2 py-1">
      <SurfacePill surface={step.surface} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-mono text-[11px] text-foreground">{step.tool}</span>
          {step.query && (
            <span className="font-mono text-[11px] text-muted-foreground">
              · {step.query}
            </span>
          )}
          <span
            className="font-mono text-[10px]"
            style={{ color: step.ok ? "#0ca30c" : "#b06a00" }}
          >
            {step.ok ? "ok" : "no result"}
          </span>
          {step.isCrossSurfaceReach && (
            <span className="rounded bg-[#c0392b]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#c0392b]">
              ← reached {step.surface}
            </span>
          )}
        </div>
        {step.note && (
          <div className="truncate font-mono text-[10px] text-muted-foreground">{step.note}</div>
        )}
      </div>
    </li>
  );
}

function TracePanel({ probeId }: { probeId: string }) {
  const steps = traceOf(probeId);
  const verdict = verdictOf(probeId);
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No captured trace for this probe.</p>
    );
  }
  const repoSteps = steps.filter((s) => s.surface === "repo").length;
  const reachedNonRepo = steps.some((s) => s.isCrossSurfaceReach);
  return (
    <div className="space-y-3 rounded-lg bg-muted/30 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        What the candle did — {steps.length} tool calls
        {reachedNonRepo && `, reached beyond the repo (${repoSteps} repo searches first)`}
      </div>
      <ol className="divide-y divide-border/60">
        {steps.map((s, i) => (
          <TraceStepRow key={i} step={s} />
        ))}
      </ol>
      {verdict && (
        <div className="flex items-start gap-2 rounded-md border border-[#c0392b]/30 bg-[#c0392b]/[0.04] px-3 py-2">
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#c0392b]">
            verdict
          </span>
          <span className="font-mono text-[12px] text-foreground">{verdict}</span>
        </div>
      )}
    </div>
  );
}

// ── Friction-vector summary (shown when a probe has no captured trace) ──────────
function FrictionVectorSummary({ finding }: { finding: Finding }) {
  return (
    <div className="space-y-2 rounded-lg bg-muted/30 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        What the candle did
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(
          [
            ["tool calls", "tool_calls"],
            ["surfaces", "surfaces_opened"],
            ["dead ends", "dead_ends"],
            ["retries", "retries"],
            ["hedges", "hedging_count"],
          ] as const
        ).map(([label, key]) => (
          <span key={key} className="tabular-nums">
            {label}{" "}
            <span className="font-semibold text-foreground">
              {num(finding.friction_vector as unknown as Record<string, unknown>, key)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Unified modal (all cards) ──────────────────────────────────────────────────
function ProbeModal({ vm, onClose }: { vm: ProbeCardVM; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const remediation = vm.finding.remediation;
  const showTrace = hasTrace(vm.probeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card shadow-2xl ring-1 ring-border">
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-mono text-base font-semibold">{vm.label}</span>
            <StatusBadge status={vm.status} />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span
                className="tabular-nums text-xl font-bold"
                style={{ color: "#0d366b" }}
              >
                {vm.score.toFixed(1)}
              </span>
              <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">friction</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {vm.task && (
            <div className="rounded-lg border-l-2 border-border bg-muted/30 px-3 py-2">
              <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                the task the candle ran
              </div>
              <p className="text-sm italic leading-relaxed text-foreground/90">&ldquo;{vm.task}&rdquo;</p>
            </div>
          )}

          {/* agent path — captured trace when present, else the friction-vector summary */}
          {showTrace ? (
            <TracePanel probeId={vm.probeId} />
          ) : (
            <FrictionVectorSummary finding={vm.finding} />
          )}

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">root cause</span>
            <TagBadge tag={vm.rootCause} />
          </div>

          {remediation && (
            <div className="rounded-lg bg-muted/40 p-3 ring-1 ring-border">
              <div className="mb-1.5 flex items-center gap-2">
                <RemediationBadge type={remediation.type} />
                <span className="break-all font-mono text-[11px] text-muted-foreground">
                  {remediation.target}
                </span>
              </div>
              <p className="text-sm text-foreground/90">{remediation.content}</p>
            </div>
          )}

          {/* codebase probes: neutral module metrics footnote */}
          {vm.metrics && (
            <div className="border-t border-border pt-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>Module metrics</span>
                {vm.path && (
                  <span className="break-all font-mono normal-case tracking-normal text-muted-foreground/80">
                    {vm.path}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border sm:grid-cols-4">
                {[
                  { label: "lines of code", value: vm.metrics.loc },
                  { label: "cyclomatic", value: vm.metrics.cyclomatic },
                  { label: "coupling", value: vm.metrics.coupling },
                  { label: "DRY violations", value: vm.metrics.dry_violations },
                ].map((m) => (
                  <div key={m.label} className="bg-card px-3 py-2">
                    <div className="tabular-nums text-lg font-semibold">{m.value}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HeatmapView() {
  const [selected, setSelected] = useState<ProbeCardVM | null>(null);
  const stalls = [...crossSurfaceCards, ...codebaseCards].filter((c) => c.status === "stalled").length;
  const total = crossSurfaceCards.length + codebaseCards.length;

  return (
    <div className="space-y-8">
      {/* ── The probe battery — one board, two soft-split groups ─────────────── */}
      <div className="space-y-5">
        <div>
          <div className="flex items-baseline gap-3 border-b border-border pb-2.5">
            <span className="font-serif text-lg italic text-muted-foreground">Plate I</span>
            <h2 className="text-2xl">The Probe Battery</h2>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {target}
            </span>
          </div>
          <p className="mt-2.5 max-w-2xl text-sm text-muted-foreground">
            Each card is a probe the engine ran against{" "}
            <span className="font-mono text-foreground">{target}</span>. The measured friction
            is the signal — the deeper the blue, the harder the agent worked. Click any probe to
            replay the agent path it walked.
          </p>
        </div>

        <Legend />

        {/* Group 1 — Cross-surface (org level) */}
        {crossSurfaceCards.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="font-semibold">Cross-surface</span>
              <span className="text-muted-foreground/70">· org level</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {crossSurfaceCards.map((vm) => (
                <ProbeCard key={vm.probeId} vm={vm} onOpen={() => setSelected(vm)} />
              ))}
            </div>
          </div>
        )}

        {/* Group 2 — Codebase (repo scope) */}
        {codebaseCards.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="font-semibold">Codebase</span>
              <span className="text-muted-foreground/70">· repo scope</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {codebaseCards.map((vm) => (
                <ProbeCard key={vm.probeId} vm={vm} onOpen={() => setSelected(vm)} />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {stalls} of {total} probes stalled.
        </p>
      </div>

      {/* ── Org surfaces (unchanged, stays at the very bottom) ────────────────── */}
      <div className="space-y-4 border-t border-border pt-6">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Org surfaces</h3>
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
            The surfaces the audit can reach beyond the codebase. Access status gates what a
            probe can see — <span className="text-[#c0392b]">unauthorized</span> surfaces are
            intentionally walled off.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {surfaces.map((s) => {
            const ok = s.access_status === "connected";
            const color = ok ? "#0ca30c" : s.access_status === "unauthorized" ? "#c0392b" : "#ec835a";
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
      </div>

      {selected && <ProbeModal vm={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
