"use client";

import type { FrictionVector } from "@/lib/contracts";
import { probeDeltas, type ProbeDelta } from "@/components/linnaeus/data";
import { FRICTION_BAD, FRICTION_GOOD } from "@/components/linnaeus/colors";
import { RemediationBadge, StatusBadge } from "@/components/linnaeus/ui";

// Vector fields worth surfacing in the diff, higher = worse.
const METRICS: Array<{ key: keyof FrictionVector; label: string }> = [
  { key: "surfaces_opened", label: "surfaces opened" },
  { key: "tool_calls", label: "tool calls" },
  { key: "dead_ends", label: "dead ends" },
  { key: "retries", label: "retries" },
  { key: "hedging_count", label: "hedges" },
];

function num(v: FrictionVector, k: keyof FrictionVector): number {
  const x = v[k];
  return typeof x === "number" ? x : 0;
}

export function DeltaView() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-baseline gap-3 border-b border-border pb-2.5">
          <span className="font-serif text-lg italic text-muted-foreground">Plate III</span>
          <h2 className="text-2xl">Specimen Comparison</h2>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Before → After
          </span>
        </div>
        <p className="mt-2.5 max-w-2xl text-sm text-muted-foreground">
          Each probe is re-run before and after an org change on the same pinned candle.
          When friction rises, the swing is a regression the audit caught — attributable to
          the organizational change.
        </p>
      </div>

      <div className="space-y-5">
        {probeDeltas.map((d) => (
          <DeltaCard key={d.probe.id} d={d} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {probeDeltas.length} probe{probeDeltas.length === 1 ? "" : "s"} tracked across the
        change · more probes with a before/after pair appear here automatically.
      </p>
    </div>
  );
}

function DeltaCard({ d }: { d: ProbeDelta }) {
  const { probe, before, after, beforeScore, afterScore, delta } = d;
  const regressed = delta > 0;
  const accent = regressed ? FRICTION_BAD : FRICTION_GOOD;

  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      {/* ── probe identity header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-base font-semibold text-foreground">
              {probe.category}
            </span>
            <KindPill kind={probe.kind} />
          </div>
          {probe.instance_spec && (
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
              {probe.instance_spec}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <StatusBadge status={before.status} />
          <span className="text-muted-foreground">→</span>
          <StatusBadge status={after.status} />
        </div>
      </div>

      {/* ── before / Δ / after ────────────────────────────────────────────── */}
      <div className="grid gap-px bg-border sm:grid-cols-[1fr_auto_1fr]">
        <Side state="before" score={beforeScore} accent={FRICTION_GOOD} />
        <div className="flex flex-col items-center justify-center gap-1 bg-card px-6 py-6">
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            friction Δ
          </div>
          <div className="tabular-nums text-4xl font-bold" style={{ color: accent }}>
            {regressed ? "+" : ""}
            {delta.toFixed(1)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {regressed ? "caught regression" : "improved"}
          </div>
        </div>
        <Side state="after" score={afterScore} accent={accent} />
      </div>

      <div className="border-t border-border px-6">
        <Track before={beforeScore} after={afterScore} />
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-5">
        {METRICS.map((m) => {
          const b = num(before.friction_vector, m.key);
          const a = num(after.friction_vector, m.key);
          const worse = a > b;
          return (
            <div key={m.key} className="bg-card px-4 py-3">
              <div className="text-[11px] text-muted-foreground">{m.label}</div>
              <div className="mt-1 flex items-baseline gap-1.5 tabular-nums">
                <span className="text-sm text-muted-foreground">{b}</span>
                <span className="text-muted-foreground">→</span>
                <span
                  className="text-lg font-semibold"
                  style={{ color: worse ? FRICTION_BAD : "inherit" }}
                >
                  {a}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {after.remediation && (
        <div className="border-t border-border px-6 py-4">
          <div className="mb-2 flex items-center gap-2">
            <RemediationBadge type={after.remediation.type} />
            <span className="font-mono text-[11px] text-muted-foreground">
              {after.remediation.target}
            </span>
          </div>
          <p className="text-sm text-foreground/90">{after.remediation.content}</p>
        </div>
      )}
    </div>
  );
}

function Side({
  state,
  score,
  accent,
}: {
  state: string;
  score: number;
  accent: string;
}) {
  return (
    <div className="bg-card px-6 py-6">
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {state}
      </span>
      <div className="mt-3 tabular-nums text-5xl font-bold tracking-tight" style={{ color: accent }}>
        {score.toFixed(1)}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">friction score</div>
    </div>
  );
}

function Track({ before, after }: { before: number; after: number }) {
  const at = (s: number) => `${Math.max(0, Math.min(100, s))}%`;
  const lo = Math.min(before, after);
  const hi = Math.max(before, after);
  return (
    <div className="pt-8 pb-6">
      <div
        className="relative h-3 rounded-full"
        style={{ background: `linear-gradient(90deg, #dce6f4 0%, #4f84c4 55%, #123a6b 82%, ${FRICTION_BAD} 100%)` }}
      >
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground/20"
          style={{ left: at(lo), width: `${hi - lo}%` }}
        />
        <Marker pos={at(before)} color={FRICTION_GOOD} label="before" score={before} up />
        <Marker pos={at(after)} color={FRICTION_BAD} label="after" score={after} />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>0 · frictionless</span>
        <span>100 · illegible</span>
      </div>
    </div>
  );
}

function Marker({
  pos,
  color,
  label,
  score,
  up = false,
}: {
  pos: string;
  color: string;
  label: string;
  score: number;
  up?: boolean;
}) {
  return (
    <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pos }}>
      <div className="size-4 rounded-full border-[3px] border-background shadow" style={{ background: color }} />
      <div
        className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center ${up ? "bottom-5" : "top-5"}`}
      >
        <div className="tabular-nums text-sm font-semibold" style={{ color }}>
          {score.toFixed(1)}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function KindPill({ kind }: { kind: string }) {
  const synthesized = kind === "synthesized";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${
        synthesized
          ? "bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400"
          : "bg-muted text-muted-foreground ring-border"
      }`}
    >
      {kind}
    </span>
  );
}
