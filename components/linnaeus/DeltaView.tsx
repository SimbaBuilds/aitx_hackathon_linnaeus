"use client";

import type { FrictionVector } from "@/lib/contracts";
import { billingAfter, billingBefore, probeLabel, scoreOf } from "@/components/linnaeus/data";
import { FRICTION_BAD, FRICTION_GOOD } from "@/components/linnaeus/colors";
import { RemediationBadge, StatusBadge } from "@/components/linnaeus/ui";

const before = scoreOf(billingBefore);
const after = scoreOf(billingAfter);
const delta = after - before;

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

function Track() {
  // 0..100 friction axis; before (good) and after (critical) markers on it.
  const at = (s: number) => `${Math.max(0, Math.min(100, s))}%`;
  return (
    <div className="pt-8 pb-6">
      <div
        className="relative h-3 rounded-full"
        style={{ background: `linear-gradient(90deg, ${FRICTION_GOOD} 0%, #eda100 45%, ${FRICTION_BAD} 100%)` }}
      >
        {/* delta span */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground/20"
          style={{ left: at(before), width: `${after - before}%` }}
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

export function DeltaView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">The delta</h2>
        <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
          Same probe — <span className="font-mono text-foreground">{probeLabel(billingAfter.probe_id)}</span> —
          run before and after an org change (the new D2C clients). It used to complete;
          now it stalls. That swing is a regression the audit caught.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        <div className="grid gap-px bg-border sm:grid-cols-[1fr_auto_1fr]">
          <Side state="before" score={before} finding={billingBefore} accent={FRICTION_GOOD} />
          <div className="flex flex-col items-center justify-center gap-1 bg-card px-6 py-6">
            <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">friction Δ</div>
            <div className="tabular-nums text-4xl font-bold" style={{ color: FRICTION_BAD }}>
              +{delta.toFixed(1)}
            </div>
            <div className="text-[11px] text-muted-foreground">caught regression</div>
          </div>
          <Side state="after" score={after} finding={billingAfter} accent={FRICTION_BAD} />
        </div>

        <div className="border-t border-border px-6">
          <Track />
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-5">
          {METRICS.map((m) => {
            const b = num(billingBefore.friction_vector, m.key);
            const a = num(billingAfter.friction_vector, m.key);
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
      </div>

      {billingAfter.remediation && (
        <div className="rounded-xl bg-card p-4 ring-1 ring-border">
          <div className="mb-2 flex items-center gap-2">
            <RemediationBadge type={billingAfter.remediation.type} />
            <span className="font-mono text-[11px] text-muted-foreground">
              {billingAfter.remediation.target}
            </span>
          </div>
          <p className="text-sm text-foreground/90">{billingAfter.remediation.content}</p>
        </div>
      )}
    </div>
  );
}

function Side({
  state,
  score,
  finding,
  accent,
}: {
  state: string;
  score: number;
  finding: typeof billingBefore;
  accent: string;
}) {
  return (
    <div className="bg-card px-6 py-6">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{state}</span>
        <StatusBadge status={finding.status} />
      </div>
      <div className="mt-3 tabular-nums text-5xl font-bold tracking-tight" style={{ color: accent }}>
        {score.toFixed(1)}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">friction score</div>
    </div>
  );
}
