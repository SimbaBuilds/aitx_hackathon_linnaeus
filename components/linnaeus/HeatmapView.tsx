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
  type HeatCell,
  type OrgProbe,
  type TraceStep,
} from "@/components/linnaeus/data";
import { heatFill, heatInk, frictionColor } from "@/components/linnaeus/colors";
import { StatusBadge, TagBadge, RemediationBadge } from "@/components/linnaeus/ui";

const base = (p: string) => p.split("/").pop() || p;
const dir = (p: string) => {
  const parts = p.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") + "/" : "";
};

function Cell({ c, onOpen }: { c: HeatCell; onOpen: () => void }) {
  const stalled = c.probe_stalled != null;
  const task = c.probe ? taskTextOf(c.probe) : "";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex min-h-[150px] cursor-pointer flex-col justify-between overflow-hidden rounded-xl p-3.5 text-left ring-1 ring-black/10 transition-transform duration-150 hover:-translate-y-0.5 hover:ring-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground dark:ring-white/10"
      style={{ background: heatFill(c.heat), color: heatInk(c.heat) }}
    >
      {stalled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ boxShadow: "inset 0 0 0 2.5px #c0392b, 0 0 0 1px #c0392b" }}
        />
      )}
      {/* details affordance */}
      <span
        aria-hidden
        className="absolute right-2.5 top-2.5 opacity-40 transition-opacity group-hover:opacity-90"
      >
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
          <path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="relative">
        <div className="font-mono text-[11px] leading-tight opacity-70">{dir(c.path)}</div>
        <div className="font-mono text-sm font-semibold leading-tight break-all">{base(c.path)}</div>
        {task && (
          <p className="mt-2 line-clamp-3 text-sm italic leading-snug opacity-95">
            &ldquo;{task}&rdquo;
          </p>
        )}
      </div>
      <div className="relative flex items-end justify-between gap-2">
        <div className="tabular-nums text-2xl font-semibold tracking-tight">
          {c.heat.toFixed(2)}
          <span className="ml-1 align-top text-[10px] font-normal uppercase tracking-wide opacity-70">heat</span>
        </div>
        {stalled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#c0392b] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            <span className="size-1.5 animate-pulse rounded-full bg-white" />
            STALLED
          </span>
        )}
      </div>
      <div className="relative mt-1 font-mono text-[11px] font-medium opacity-90">
        {c.probe ? `probe: ${c.probe}` : "unprobed · static prediction"}
      </div>
    </button>
  );
}

function num(v: Record<string, unknown>, k: string): number {
  const x = v[k];
  return typeof x === "number" ? x : 0;
}

function DetailModal({ cell, onClose }: { cell: HeatCell; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const finding = cell.probe ? afterFindingByProbe[cell.probe] : undefined;
  const task = cell.probe ? taskTextOf(cell.probe) : "";
  const metrics = [
    { label: "lines of code", value: cell.loc },
    { label: "cyclomatic", value: cell.cyclomatic },
    { label: "coupling", value: cell.coupling },
    { label: "DRY violations", value: cell.dry_violations },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border">
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="min-w-0">
            <div className="font-mono text-[11px] text-muted-foreground">{dir(cell.path)}</div>
            <div className="break-all font-mono text-base font-semibold">{base(cell.path)}</div>
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

        {/* heat + static metrics */}
        <div className="border-b border-border p-5">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="flex size-12 items-center justify-center rounded-lg font-mono text-lg font-bold tabular-nums"
              style={{ background: heatFill(cell.heat), color: heatInk(cell.heat) }}
            >
              {cell.heat.toFixed(2)}
            </div>
            <div>
              <div className="text-sm font-medium">Predicted friction</div>
              <div className="text-xs text-muted-foreground">
                cheap static pre-scan · never summed into the score
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border sm:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="bg-card px-3 py-2">
                <div className="tabular-nums text-lg font-semibold">{m.value}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* probe finding */}
        <div className="p-5">
          {!cell.probe || !finding ? (
            <p className="text-sm text-muted-foreground">
              No probe has exercised this module yet — the heat above is a static prediction only.
              A probe would confirm or clear it.
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{probeLabel(cell.probe)}</span>
                  <StatusBadge status={finding.status} />
                </div>
                <div className="text-right">
                  <span
                    className="tabular-nums text-xl font-bold"
                    style={{ color: frictionColor(scoreOf(finding)) }}
                  >
                    {scoreOf(finding).toFixed(1)}
                  </span>
                  <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">friction</span>
                </div>
              </div>

              {task && (
                <div className="mb-3 rounded-lg border-l-2 border-border bg-muted/30 px-3 py-2">
                  <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    the task the candle ran
                  </div>
                  <p className="text-sm italic leading-relaxed text-foreground/90">&ldquo;{task}&rdquo;</p>
                </div>
              )}

              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
                    {label} <span className="font-semibold text-foreground">{num(finding.friction_vector as unknown as Record<string, unknown>, key)}</span>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">root cause</span>
                <TagBadge tag={finding.root_cause_tag} />
              </div>

              {finding.remediation && (
                <div className="mt-4 rounded-lg bg-muted/40 p-3 ring-1 ring-border">
                  <div className="mb-1.5 flex items-center gap-2">
                    <RemediationBadge type={finding.remediation.type} />
                    <span className="break-all font-mono text-[11px] text-muted-foreground">
                      {finding.remediation.target}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90">{finding.remediation.content}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
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
        <span className="size-3 rounded-[3px] ring-2 ring-[#c0392b]" />
        <span>probe confirmed a stall</span>
      </div>
      <span className="text-muted-foreground/70">· click any module for details</span>
    </div>
  );
}

function OrgProbeCard({ p, onOpen }: { p: OrgProbe; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col gap-3 rounded-xl bg-card p-4 text-left ring-1 ring-border transition-transform duration-150 hover:-translate-y-0.5 hover:ring-foreground/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
    >
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
        <span className="font-mono text-sm font-semibold">{p.category}</span>
        <StatusBadge status={p.status} />
      </div>

      {p.task && (
        <p className="text-sm italic leading-relaxed text-foreground/90">&ldquo;{p.task}&rdquo;</p>
      )}

      {/* the cross-surface path the candle actually walked */}
      {p.surfacesHit.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">reached</span>
          {p.surfacesHit.map((s, i) => (
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
          <TagBadge tag={p.rootCause} />
        </div>
        <div>
          <span className="tabular-nums text-lg font-bold" style={{ color: frictionColor(p.score) }}>
            {p.score.toFixed(1)}
          </span>
          <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground">friction</span>
        </div>
      </div>
    </button>
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

function OrgProbeModal({ p, onClose }: { p: OrgProbe; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const remediation = p.finding.remediation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card shadow-2xl ring-1 ring-border">
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-mono text-base font-semibold">{p.category}</span>
            <StatusBadge status={p.status} />
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

        <div className="space-y-4 p-5">
          {p.task && (
            <div className="rounded-lg border-l-2 border-border bg-muted/30 px-3 py-2">
              <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                the task the candle ran
              </div>
              <p className="text-sm italic leading-relaxed text-foreground/90">&ldquo;{p.task}&rdquo;</p>
            </div>
          )}

          {/* the cross-surface trace */}
          <TracePanel probeId={p.probeId} />

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">root cause</span>
            <TagBadge tag={p.rootCause} />
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
        </div>
      </div>
    </div>
  );
}

export function HeatmapView() {
  const [selected, setSelected] = useState<HeatCell | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<OrgProbe | null>(null);
  const cells = [...heatCells].sort((a, b) => b.heat - a.heat);
  const confirmed = heatCells.filter((c) => c.probe_stalled).length;

  return (
    <div className="space-y-8">
      {/* ── Codebase heatmap ─────────────────────────────────────────────── */}
      <div className="space-y-5">
        <div>
          <div className="flex items-baseline gap-3 border-b border-border pb-2.5">
            <span className="font-serif text-lg italic text-muted-foreground">Plate I</span>
            <h2 className="text-2xl">Single Surface Probes</h2>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Codebase
            </span>
          </div>
          <p className="mt-2.5 max-w-2xl text-sm text-muted-foreground">
            A cheap static pre-scan of{" "}
            <span className="font-mono text-foreground">{target}</span> predicts where an
            agent will struggle. The darker the cell, the higher the predicted friction —
            and where a probe stalled, the
            prediction is confirmed. Each card shows the task the probe ran.
          </p>
        </div>

        <Legend />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {cells.map((c) => (
            <Cell key={c.path} c={c} onOpen={() => setSelected(c)} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {confirmed} of {heatCells.length} modules were confirmed by a probe stall.
        </p>
      </div>

      {/* ── Org-level probes (cross-surface, separate from the codebase map) ─ */}
      {orgProbes.length > 0 && (
        <div className="space-y-4 border-t border-border pt-6">
          <div>
            <div className="flex items-baseline gap-3 border-b border-border pb-2.5">
              <span className="font-serif text-lg italic text-muted-foreground">Plate II</span>
              <h3 className="text-2xl">Multi Surface Probes</h3>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Org level
              </span>
            </div>
            <p className="mt-2.5 max-w-2xl text-sm text-muted-foreground">
              These probes operate across the org&rsquo;s real surfaces (repo, email, notes). All probes below generated by the engine.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orgProbes.map((p) => (
              <OrgProbeCard key={p.probeId} p={p} onOpen={() => setSelectedOrg(p)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Org surfaces (folded in beneath the codebase map) ────────────── */}
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

      {selected && <DetailModal cell={selected} onClose={() => setSelected(null)} />}
      {selectedOrg && <OrgProbeModal p={selectedOrg} onClose={() => setSelectedOrg(null)} />}
    </div>
  );
}
