"use client";

import { Fragment, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  afterFindings,
  hasTrace,
  probeLabel,
  scoreOf,
  target,
  traceOf,
  verdictOf,
  type TraceStep,
} from "@/components/linnaeus/data";
import { frictionColor } from "@/components/linnaeus/colors";
import { anonymize } from "@/components/linnaeus/anonymize";
import { RemediationBadge, StatusBadge, TagBadge } from "@/components/linnaeus/ui";

function FrictionCell({ score }: { score: number }) {
  const color = frictionColor(score);
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 tabular-nums text-sm font-semibold" style={{ color }}>
        {score.toFixed(1)}
      </span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, score)}%`, background: color }}
        />
      </div>
    </div>
  );
}

// Small colour-coded surface pill. Colour is backed by a label, never colour alone.
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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="11"
      height="11"
      fill="none"
      aria-hidden
      className="shrink-0 transition-transform"
      style={{ transform: open ? "rotate(90deg)" : "none" }}
    >
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FindingsView() {
  const rows = [...afterFindings].sort((a, b) => scoreOf(b) - scoreOf(a));
  const stalled = rows.filter((f) => f.status !== "completed").length;
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline gap-3 border-b border-border pb-2.5">
          <span className="font-serif text-lg italic text-muted-foreground">Plate II</span>
          <h2 className="text-2xl">Findings Catalog</h2>
        </div>
        <p className="mt-2.5 max-w-2xl text-sm text-muted-foreground">
          Every probe run against{" "}
          <span className="font-mono text-foreground">{target}</span> in its current
          (&ldquo;after&rdquo;) org state — {stalled} of {rows.length} stalled, each with a
          mechanically-observed friction score. Rows with a{" "}
          <span className="font-medium text-foreground">trace</span> expand to show the exact
          path the candle took.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="pl-4">Probe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Root cause</TableHead>
              <TableHead>Friction</TableHead>
              <TableHead className="pr-4">Remediation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((f) => {
              const isStalled = f.status !== "completed";
              const expandable = hasTrace(f.probe_id);
              const isOpen = open.has(f.probe_id);
              return (
                <Fragment key={f.probe_id}>
                  <TableRow className={isStalled ? "bg-[#c0392b]/[0.035]" : undefined}>
                    <TableCell className="pl-4">
                      {expandable ? (
                        <button
                          type="button"
                          onClick={() => toggle(f.probe_id)}
                          className="group flex items-start gap-1.5 text-left"
                          aria-expanded={isOpen}
                        >
                          <span className="mt-1 text-muted-foreground group-hover:text-foreground">
                            <Chevron open={isOpen} />
                          </span>
                          <span>
                            <span className="font-medium underline-offset-2 group-hover:underline">
                              {probeLabel(f.probe_id)}
                            </span>
                            <span className="block font-mono text-[11px] text-muted-foreground">
                              {anonymize(f.probe_id)}
                            </span>
                          </span>
                        </button>
                      ) : (
                        <>
                          <div className="font-medium">{probeLabel(f.probe_id)}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {anonymize(f.probe_id)}
                          </div>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={f.status} />
                    </TableCell>
                    <TableCell>
                      <TagBadge tag={f.root_cause_tag} />
                    </TableCell>
                    <TableCell>
                      <FrictionCell score={scoreOf(f)} />
                    </TableCell>
                    <TableCell className="pr-4">
                      {f.remediation ? (
                        <div className="flex items-center gap-2">
                          <RemediationBadge type={f.remediation.type} />
                          <span
                            className="hidden max-w-[22ch] truncate font-mono text-[11px] text-muted-foreground lg:inline"
                            title={f.remediation.target}
                          >
                            {f.remediation.target}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandable && isOpen && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="p-3">
                        <TracePanel probeId={f.probe_id} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
