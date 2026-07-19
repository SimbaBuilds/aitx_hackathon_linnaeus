"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  triggerEvents,
  runnableProbes,
  type TriggerEvent,
  type RunnableProbe,
  type OperatorRunProbe,
} from "@/components/linnaeus/data";
import { FRICTION_BAD, FRICTION_GOOD, frictionColor, chip } from "@/components/linnaeus/colors";
import { anonymize } from "@/components/linnaeus/anonymize";

// A compact Central-Time date+time label from an ISO timestamp — the "field
// observation" time. Explicitly rendered in America/Chicago (never the runtime's
// local zone) with a short tz abbreviation, e.g. "Jul 19, 4:14 AM CDT".
function clock(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
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

// Operator-triggered runs persist in the browser (localStorage) so they survive a
// refresh and accumulate across the demo — no database needed. Keyed + versioned.
const MANUAL_RUNS_KEY = "linnaeus.manualRuns.v1";

function loadManualRuns(): TriggerEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MANUAL_RUNS_KEY);
    const parsed = raw ? (JSON.parse(raw) as TriggerEvent[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveManualRuns(events: TriggerEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MANUAL_RUNS_KEY, JSON.stringify(events));
  } catch {
    /* quota / privacy mode — non-fatal, runs just won't persist */
  }
}

export function TriggerView() {
  // Operator runs persist across refresh via localStorage. Start empty (matches the
  // server render), then hydrate on mount to avoid an SSR/hydration mismatch.
  const [manualEvents, setManualEvents] = useState<TriggerEvent[]>([]);
  useEffect(() => setManualEvents(loadManualRuns()), []);

  const addManualEvent = (e: TriggerEvent) =>
    setManualEvents((prev) => {
      const next = [e, ...prev];
      saveManualRuns(next);
      return next;
    });
  const clearManualEvents = () => {
    setManualEvents([]);
    saveManualRuns([]);
  };

  const events = [...manualEvents, ...triggerEvents];
  const fired = events.filter((e) => e.dispatched).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 border-b border-border pb-2.5">
          <span className="font-serif text-lg italic text-muted-foreground">Plate IV</span>
          <h2 className="text-2xl">Field Log</h2>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Cron baseline · targeted events
          </span>
        </div>
        <p className="mt-2.5 max-w-2xl text-sm text-muted-foreground">
          <span className="text-foreground">Cron is the baseline engine</span> — it runs the full
          battery on a schedule, so operability is always freshly measured.{" "}
          <span className="text-foreground">Event triggers are targeted</span>: a change on an org
          surface fires just the affected probe group for that org group, catching the regression it
          introduced.
        </p>
      </div>

      {/* ── operator-triggered battery ── */}
      <RunNowPanel onComplete={addManualEvent} />

      {/* ── the heartbeat feed ── */}
      <ol className="relative space-y-3 border-l border-border pl-6">
        {events.map((e, i) => (
          <TriggerRow key={`${e.ts}-${i}`} e={e} />
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          {events.length} event{events.length === 1 ? "" : "s"} observed ·{" "}
          {fired} dispatched a re-audit · the rest correctly ignored as noise.
        </span>
        {manualEvents.length > 0 && (
          <>
            <span className="text-muted-foreground/60">
              · {manualEvents.length} operator run{manualEvents.length === 1 ? "" : "s"} saved (persist across refresh)
            </span>
            <button
              onClick={clearManualEvents}
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              clear saved runs
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Run Now — operator selects any subset of the codebase / org batteries and fires
// them sequentially or concurrently. The concurrent path mirrors the measured
// vLLM batching result (1.77× wall-clock at --max-num-seqs 8) rather than a naïve
// N× so the number stays honest against the A/B slide.
// ─────────────────────────────────────────────────────────────────────────────

type Mode = "sequential" | "concurrent";
type RunStatus = "queued" | "running" | "done";

function StatusDot({ status }: { status: RunStatus | undefined }) {
  if (status === "running")
    return <span className="size-2.5 animate-pulse rounded-full" style={{ background: FRICTION_GOOD }} aria-label="running" />;
  if (status === "done")
    return (
      <span className="flex size-2.5 items-center justify-center rounded-full" style={{ background: FRICTION_GOOD }} aria-label="done">
        <span className="size-1 rounded-full bg-background" />
      </span>
    );
  return <span className="size-2.5 rounded-full ring-1 ring-border" aria-label="queued" />;
}

function RunNowPanel({ onComplete }: { onComplete: (e: TriggerEvent) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("concurrent");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(runnableProbes.map((p) => p.id)));
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [status, setStatus] = useState<Record<string, RunStatus>>({});
  const [revealed, setRevealed] = useState<Record<string, number>>({});
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ wall: number; seqWall: number; mode: Mode; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
  };
  useEffect(() => clearTimers, []);

  const groups = useMemo(
    () => ({
      codebase: runnableProbes.filter((p) => p.set === "codebase"),
      org: runnableProbes.filter((p) => p.set === "org"),
    }),
    []
  );

  const running = phase === "running";
  const selectedList = runnableProbes.filter((p) => selected.has(p.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const setGroup = (set: "codebase" | "org", on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      groups[set].forEach((p) => (on ? next.add(p.id) : next.delete(p.id)));
      return next;
    });
  const allSelected = selected.size === runnableProbes.length;
  const setAll = (on: boolean) => setSelected(on ? new Set(runnableProbes.map((p) => p.id)) : new Set());

  // Fire a REAL battery against the pinned candle via /api/run-battery. The route
  // runs the probes server-side (same engine/surfaces/candle as run-audit.ts), so
  // a click genuinely hits the vLLM endpoint — watch `Running: N reqs` in the log.
  async function run() {
    if (selectedList.length === 0 || running) return;
    clearTimers();
    setError(null);
    setPhase("running");
    setResult(null);
    setRevealed({});
    // Concurrent → all in flight at once; sequential → all "in progress" (we can't
    // stream per-probe completion over a single request, so they resolve together).
    setStatus(Object.fromEntries(selectedList.map((p) => [p.id, "running" as RunStatus])));

    const start = performance.now();
    setElapsed(0);
    ticker.current = setInterval(() => setElapsed(performance.now() - start), 50);

    try {
      const res = await fetch("/api/run-battery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probeIds: selectedList.map((p) => p.id), mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      if (ticker.current) clearInterval(ticker.current);
      ticker.current = null;

      const wall = (typeof data.wall_s === "number" ? data.wall_s : (performance.now() - start) / 1000) * 1000;
      type ApiTraceStep = { surface: string; tool: string; ok: boolean; query?: string; note?: string };
      type ApiFinding = {
        probe_id: string;
        status: string;
        score: number;
        root_cause_tag: string;
        trace?: ApiTraceStep[];
        verdict?: string;
      };
      const apiFindings = (data.findings ?? []) as ApiFinding[];
      const byId = new Map(apiFindings.map((f) => [f.probe_id, f]));
      const scores: Record<string, number> = {};
      const done: Record<string, RunStatus> = {};
      for (const f of apiFindings) {
        scores[f.probe_id] = f.score;
        done[f.probe_id] = "done";
      }
      selectedList.forEach((p) => { if (!(p.id in done)) done[p.id] = "done"; });
      // Real per-probe results, in the operator's selected order — the card detail.
      const probeResults: OperatorRunProbe[] = selectedList.map((p) => {
        const f = byId.get(p.id);
        return {
          id: p.id,
          label: p.label,
          status: f?.status ?? "stalled",
          score: typeof f?.score === "number" ? f.score : (scores[p.id] ?? 0),
          rootCause: f?.root_cause_tag ?? "none",
          trace: (f?.trace ?? []).map((s) => ({
            surface: s.surface,
            tool: s.tool,
            ok: s.ok,
            query: s.query ?? "",
            note: s.note ?? "",
          })),
          verdict: f?.verdict ?? "",
        };
      });
      setStatus(done);
      setRevealed(scores);
      setElapsed(wall);
      setResult({ wall, seqWall: 0, mode, count: selectedList.length });
      setPhase("done");
      onComplete(makeManualEvent(mode, wall, probeResults, data.model ?? "nemotron"));
    } catch (e) {
      if (ticker.current) clearInterval(ticker.current);
      ticker.current = null;
      setError((e as Error).message || "run failed");
      setStatus({});
      setPhase("idle");
    }
  }

  const reset = () => {
    clearTimers();
    setPhase("idle");
    setStatus({});
    setRevealed({});
    setElapsed(0);
    setResult(null);
    setError(null);
  };

  return (
    <div className="rounded-2xl bg-card ring-1 ring-border">
      {/* header row + trigger */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">Run battery now</div>
          <div className="font-mono text-[11px] text-muted-foreground">
            Operator-triggered · pick probes &amp; execution mode
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="ml-auto inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: FRICTION_GOOD }}
          aria-expanded={open}
        >
          <span aria-hidden>▸</span> Run Now
          <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
            {selected.size}
          </span>
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-5 py-4">
          {/* mode + select-all controls */}
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="inline-flex overflow-hidden rounded-md ring-1 ring-border">
              {(["sequential", "concurrent"] as Mode[]).map((m) => (
                <button
                  key={m}
                  disabled={running}
                  onClick={() => setMode(m)}
                  className="px-3 py-1.5 text-xs font-medium capitalize transition-colors disabled:opacity-50"
                  style={
                    mode === m
                      ? { background: FRICTION_GOOD, color: "#fff" }
                      : { color: "var(--muted-foreground)" }
                  }
                >
                  {m}
                </button>
              ))}
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              {mode === "concurrent"
                ? "batched · --max-num-seqs 8 · ~1.77× wall-clock"
                : "one probe in flight at a time"}
            </span>
            <button
              onClick={() => setAll(!allSelected)}
              disabled={running}
              className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>

          {/* the two selectable batteries */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ProbeGroup
              title="Codebase probes"
              subtitle="universal set"
              probes={groups.codebase}
              set="codebase"
              selected={selected}
              status={status}
              revealed={revealed}
              running={running || phase === "done"}
              onToggle={toggle}
              onGroup={setGroup}
            />
            <ProbeGroup
              title="Org-level probes"
              subtitle="cross-surface"
              probes={groups.org}
              set="org"
              selected={selected}
              status={status}
              revealed={revealed}
              running={running || phase === "done"}
              onToggle={toggle}
              onGroup={setGroup}
            />
          </div>

          {/* run bar / live readout */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-dashed border-border pt-4">
            {phase === "idle" && (
              <>
                <button
                  onClick={run}
                  disabled={selected.size === 0}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: FRICTION_GOOD }}
                >
                  Run {selected.size} probe{selected.size === 1 ? "" : "s"} · {mode}
                </button>
                {error && (
                  <span className="font-mono text-xs" style={{ color: FRICTION_BAD }}>
                    ✗ {error}
                  </span>
                )}
              </>
            )}

            {running && (
              <>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="size-2 animate-pulse rounded-full" style={{ background: FRICTION_GOOD }} />
                  Running {selectedList.length} probe{selectedList.length === 1 ? "" : "s"} · {mode}
                </span>
                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                  {(elapsed / 1000).toFixed(1)}s
                </span>
              </>
            )}

            {phase === "done" && result && (
              <>
                <span className="text-sm font-medium" style={{ color: FRICTION_GOOD }}>
                  ✓ {result.count} probe{result.count === 1 ? "" : "s"} complete
                </span>
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {(result.wall / 1000).toFixed(1)}s wall-clock
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {result.mode === "concurrent"
                    ? "measured · batched (--max-num-seqs 8) on the Nemotron candle"
                    : "measured · sequential on the Nemotron candle"}
                </span>
                <button
                  onClick={reset}
                  className="ml-auto rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
                >
                  Run again
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProbeGroup({
  title,
  subtitle,
  probes,
  set,
  selected,
  status,
  revealed,
  running,
  onToggle,
  onGroup,
}: {
  title: string;
  subtitle: string;
  probes: RunnableProbe[];
  set: "codebase" | "org";
  selected: Set<string>;
  status: Record<string, RunStatus>;
  revealed: Record<string, number>;
  running: boolean;
  onToggle: (id: string) => void;
  onGroup: (set: "codebase" | "org", on: boolean) => void;
}) {
  const allOn = probes.every((p) => selected.has(p.id));
  const someOn = probes.some((p) => selected.has(p.id));
  return (
    <fieldset className="rounded-xl border border-border p-3">
      <legend className="flex w-full items-center gap-2 px-1">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={allOn}
            ref={(el) => {
              if (el) el.indeterminate = someOn && !allOn;
            }}
            disabled={running}
            onChange={(e) => onGroup(set, e.target.checked)}
            className="accent-[#2e5e9e]"
          />
          {title}
        </label>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{subtitle}</span>
      </legend>
      <ul className="mt-1 space-y-0.5">
        {probes.map((p) => {
          const st = status[p.id];
          const score = revealed[p.id];
          return (
            <li key={p.id}>
              <label
                className={`flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm ${
                  running ? "" : "cursor-pointer hover:bg-muted/40"
                }`}
              >
                {running ? (
                  <StatusDot status={st} />
                ) : (
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => onToggle(p.id)}
                    className="accent-[#2e5e9e]"
                  />
                )}
                <span
                  className={`min-w-0 flex-1 truncate ${
                    running && st === "queued" ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {p.label}
                </span>
                {score !== undefined ? (
                  <span className="font-mono text-xs tabular-nums" style={{ color: frictionColor(score) }}>
                    {score.toFixed(1)}
                  </span>
                ) : running && st === "running" ? (
                  <span className="font-mono text-[11px] text-muted-foreground">…</span>
                ) : (
                  p.expectedScore !== null && (
                    <span className="rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums" style={chip(frictionColor(p.expectedScore))}>
                      {p.expectedScore.toFixed(0)}
                    </span>
                  )
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function makeManualEvent(
  mode: Mode,
  wall: number,
  probes: OperatorRunProbe[],
  model: string,
): TriggerEvent {
  const count = probes.length;
  // Name the probe(s) so the card says WHAT ran, not just how many.
  const subject =
    count === 1
      ? `Manual run — ${probes[0].label}`
      : count <= 3
        ? `Manual run — ${probes.map((p) => p.label).join(", ")}`
        : `Manual run — ${count} probes`;
  const stalled = probes.filter((p) => p.status !== "completed").length;
  return {
    ts: new Date().toISOString(),
    source: "operator",
    subject,
    from: "operator",
    classifierModel: model,
    relevant: true, // unused for operator cards (no classifier verdict shown)
    reason:
      `${count} probe${count === 1 ? "" : "s"} · ${mode}` +
      (mode === "concurrent" ? " (--max-num-seqs 8)" : "") +
      ` · ${(wall / 1000).toFixed(1)}s wall-clock · ${stalled} stalled`,
    dispatched: true,
    dispatchKind: mode === "concurrent" ? "batched-run" : "sequential-run",
    delta: null,
    deltaProbe: null,
    operatorRun: { mode, wall, model, probes },
  };
}

function statusColor(status: string): string {
  return status === "completed" ? FRICTION_GOOD : FRICTION_BAD;
}

const TRACE_SURFACE_COLOR: Record<string, string> = {
  repo: "#6b7280",
  gmail: "#c0392b",
  drive: "#2f6fed",
  notion: "#111827",
  rds: "#0ca30c",
};
function TraceSurfacePill({ surface }: { surface: string }) {
  const c = TRACE_SURFACE_COLOR[surface] ?? "#6b7280";
  return (
    <span
      className="inline-flex min-w-[48px] justify-center rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide"
      style={{ background: `${c}1a`, color: c }}
    >
      {surface}
    </span>
  );
}

// The expanded trace for one probe of an operator run: the tool-by-tool path the
// candle actually walked (from /api/run-battery), anonymized for display.
function ProbeTracePanel({ p }: { p: OperatorRunProbe }) {
  const steps = p.trace ?? [];
  const reachIdx = steps.findIndex((s) => s.ok && s.surface !== "repo");
  const verdict = anonymize(p.verdict ?? "");
  const conclusion =
    verdict ||
    `${p.status === "completed" ? "Completed" : "Stalled"} after ${steps.length} tool call${steps.length === 1 ? "" : "s"}` +
      (p.rootCause !== "none" ? ` → ${p.rootCause}` : "") + ".";
  return (
    <div className="mt-1 space-y-2 rounded-lg bg-muted/40 p-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        What the candle did — {steps.length} tool call{steps.length === 1 ? "" : "s"}
      </div>
      {steps.length === 0 ? (
        <div className="font-mono text-[11px] text-muted-foreground">
          (no tool calls recorded — the candle answered without exploring)
        </div>
      ) : (
        <ol className="divide-y divide-border/50">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2 py-1">
              <TraceSurfacePill surface={s.surface} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[11px] text-foreground">{s.tool}</span>
                  {s.query && (
                    <span className="font-mono text-[11px] text-muted-foreground">· {anonymize(s.query)}</span>
                  )}
                  <span className="font-mono text-[10px]" style={{ color: s.ok ? "#0ca30c" : "#b06a00" }}>
                    {s.ok ? "ok" : "no result"}
                  </span>
                  {i === reachIdx && (
                    <span className="rounded bg-[#c0392b]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#c0392b]">
                      ← reached {s.surface}
                    </span>
                  )}
                </div>
                {s.note && (
                  <div className="truncate font-mono text-[10px] text-muted-foreground">{anonymize(s.note)}</div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="flex items-start gap-2 rounded-md border border-[#c0392b]/30 bg-[#c0392b]/[0.04] px-3 py-2">
        <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#c0392b]">
          {verdict ? "verdict" : "outcome"}
        </span>
        <span className="font-mono text-[11px] text-foreground">{conclusion}</span>
      </div>
    </div>
  );
}

// The log detail for an operator "Run now": which probes ran, and each one's
// real status + friction score + root cause. Each row EXPANDS into the trace —
// the tool-by-tool path the candle walked (same idea as the Findings tab).
// Legacy events (saved before probe-detail existed) have no `operatorRun` — they
// still render cleanly: the summary line from `reason`, just no per-probe list.
function OperatorRunDetail({ e }: { e: TriggerEvent }) {
  const run = e.operatorRun;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
          {run?.model ?? e.classifierModel} ·
        </span>
        <span>{e.reason}</span>
      </div>
      {run && run.probes.length > 0 && (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-lg bg-muted/30">
          {run.probes.map((p) => {
            const expandable = (p.trace?.length ?? 0) > 0 || !!p.verdict;
            const isOpen = open.has(p.id);
            return (
              <li key={p.id} className="px-3 py-1.5">
                <button
                  type="button"
                  disabled={!expandable}
                  onClick={() => expandable && toggle(p.id)}
                  className={`flex w-full items-center gap-2.5 text-left ${expandable ? "cursor-pointer" : "cursor-default"}`}
                  aria-expanded={isOpen}
                >
                  {expandable ? (
                    <span className="shrink-0 text-muted-foreground" style={{ transform: isOpen ? "rotate(90deg)" : "none" }}>
                      <svg viewBox="0 0 16 16" width="10" height="10" fill="none" aria-hidden>
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  ) : (
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: statusColor(p.status) }} aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{p.label}</span>
                  {p.trace && p.trace.length > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground">{p.trace.length} calls</span>
                  )}
                  {p.rootCause !== "none" && (
                    <span className="font-mono text-[10px] text-muted-foreground">{p.rootCause}</span>
                  )}
                  <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: statusColor(p.status) }}>
                    {p.status}
                  </span>
                  <span className="w-10 text-right font-mono text-xs tabular-nums" style={{ color: frictionColor(p.score) }}>
                    {p.score.toFixed(1)}
                  </span>
                </button>
                {expandable && isOpen && <ProbeTracePanel p={p} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TriggerRow({ e }: { e: TriggerEvent }) {
  const regressed = (e.delta ?? 0) > 0;
  const accent = regressed ? FRICTION_BAD : FRICTION_GOOD;
  const dispatchLabel =
    e.dispatchKind === "drift-sweep"
      ? "drift sweep"
      : e.dispatchKind === "batched-run"
        ? "batched run"
        : e.dispatchKind === "sequential-run"
          ? "sequential run"
          : "re-audit";

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
          {e.source === "operator" ? (
            /* operator run: real per-probe results, no classifier verdict.
               Branch on source (not the field) so legacy cached runs — saved
               before probe-detail existed — also drop the classifier badge. */
            <OperatorRunDetail e={e} />
          ) : (
            /* classifier decision */
            <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
              <VerdictBadge relevant={e.relevant} />
              <span className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
                  {e.classifierModel} ·{" "}
                </span>
                {e.reason}
              </span>
            </div>
          )}

          {/* dispatch outcome */}
          <div className="flex items-center gap-2 border-t border-dashed border-border pt-3 text-sm">
            {e.dispatched ? (
              <>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="font-medium text-foreground">{dispatchLabel} dispatched</span>
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
