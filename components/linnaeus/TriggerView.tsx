"use client";

import { triggerEvents, type TriggerEvent } from "@/components/linnaeus/data";
import { FRICTION_BAD, FRICTION_GOOD } from "@/components/linnaeus/colors";

// A small clock label (HH:MM) from an ISO timestamp — the "field observation" time.
function clock(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function SourcePill({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      {source}
    </span>
  );
}

// Classifier verdict = the always-on triage decision. Blue = relevant (act),
// muted = noise (ignore). Never colour alone — the YES/NO word carries it too.
function VerdictBadge({ relevant }: { relevant: boolean }) {
  const color = relevant ? FRICTION_GOOD : "var(--muted-foreground)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        color,
        backgroundColor: relevant ? `color-mix(in srgb, ${FRICTION_GOOD} 14%, transparent)` : "transparent",
        boxShadow: relevant ? `inset 0 0 0 1px color-mix(in srgb, ${FRICTION_GOOD} 30%, transparent)` : "inset 0 0 0 1px var(--border)",
      }}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: relevant ? FRICTION_GOOD : "var(--muted-foreground)" }} />
      {relevant ? "operability-relevant" : "not relevant"}
    </span>
  );
}

export function TriggerView() {
  const fired = triggerEvents.filter((e) => e.dispatched).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-baseline gap-3 border-b border-border pb-2.5">
          <span className="font-serif text-lg italic text-muted-foreground">Plate V</span>
          <h2 className="text-2xl">Field Log</h2>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Event-driven re-audits
          </span>
        </div>
        <p className="mt-2.5 max-w-2xl text-sm text-muted-foreground">
          Linnaeus doesn&rsquo;t wait to be asked. An always-on classifier watches the org&rsquo;s
          event surfaces; when a change could alter how legibly an agent can operate, it
          <span className="text-foreground"> wakes and re-audits</span> — and catches the regression
          the change introduced.
        </p>
      </div>

      {/* ── the heartbeat feed ── */}
      <ol className="relative space-y-3 border-l border-border pl-6">
        {triggerEvents.map((e, i) => (
          <TriggerRow key={`${e.ts}-${i}`} e={e} />
        ))}
      </ol>

      <p className="text-xs text-muted-foreground">
        {triggerEvents.length} event{triggerEvents.length === 1 ? "" : "s"} observed ·{" "}
        {fired} dispatched a re-audit · the rest correctly ignored as noise.
      </p>
    </div>
  );
}

function TriggerRow({ e }: { e: TriggerEvent }) {
  const regressed = (e.delta ?? 0) > 0;
  const accent = regressed ? FRICTION_BAD : FRICTION_GOOD;

  return (
    <li className="relative">
      {/* heartbeat node on the timeline */}
      <span
        aria-hidden
        className="absolute -left-[27px] top-4 size-2.5 rounded-full ring-4 ring-background"
        style={{ background: e.relevant ? FRICTION_GOOD : "var(--muted-foreground)" }}
      />
      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          <SourcePill source={e.source} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{e.subject}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{clock(e.ts)}</span>
        </div>

        <div className="space-y-3 px-5 py-4">
          {/* classifier decision */}
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
            <VerdictBadge relevant={e.relevant} />
            <span className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
                {e.classifierModel} ·{" "}
              </span>
              {e.reason}
            </span>
          </div>

          {/* dispatch outcome */}
          <div className="flex items-center gap-2 border-t border-dashed border-border pt-3 text-sm">
            {e.dispatched ? (
              <>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="font-medium text-foreground">
                  {e.dispatchKind === "drift-sweep" ? "drift sweep" : "re-audit"} dispatched
                </span>
                {e.delta !== null && e.deltaProbe && regressed && (
                  <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-xs">
                    <span className="text-muted-foreground">{e.deltaProbe}</span>
                    <span className="font-semibold tabular-nums" style={{ color: accent }}>
                      +{e.delta.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">friction · regression caught</span>
                  </span>
                )}
                {e.delta !== null && !regressed && (
                  <span className="ml-auto font-mono text-xs text-muted-foreground">no regression</span>
                )}
              </>
            ) : (
              <>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="text-muted-foreground">ignored &mdash; no re-audit (not operability-relevant)</span>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
