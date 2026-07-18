// ─────────────────────────────────────────────────────────────────────────────
// Parse fixtures/demo.json into strongly-typed Contract A objects, stripping the
// presentation-only `_derived` / `_note` fields. Shared by the seed loader and
// the round-trip test so both agree on exactly what the fixture contains.
// ─────────────────────────────────────────────────────────────────────────────

import demo from "@/fixtures/demo.json";
import type { Finding, Probe, Run, Surface } from "@/lib/contracts";

export interface Fixture {
  target: string;
  surfaces: Surface[];
  probes: Probe[];
  runs: Run[];
  findings: Finding[];
}

/** Coerce the JSON into typed Contract A objects (drops `_derived`/`_note`). */
export function loadFixture(): Fixture {
  const surfaces: Surface[] = demo.surfaces.map((s) => ({
    id: s.id,
    kind: s.kind as Surface["kind"],
    access_status: s.access_status as Surface["access_status"],
  }));

  const probes: Probe[] = demo.probes.map((p) => ({
    id: p.id,
    category: p.category,
    kind: p.kind as Probe["kind"],
    instance_spec: p.instance_spec,
  }));

  const runs: Run[] = demo.runs.map((r) => ({
    id: r.id,
    target: r.target,
    candle: {
      model: r.candle.model,
      quant: r.candle.quant,
      seed: r.candle.seed,
      temp: r.candle.temp,
    },
    org_state: r.org_state as Run["org_state"],
    mode: r.mode as Run["mode"],
    started_at: r.started_at,
  }));

  const findings: Finding[] = demo.findings.map((f) => ({
    run_id: f.run_id,
    probe_id: f.probe_id,
    status: f.status as Finding["status"],
    friction_vector: {
      completed: f.friction_vector.completed,
      seconds_to_first_correct_move:
        f.friction_vector.seconds_to_first_correct_move,
      surfaces_opened: f.friction_vector.surfaces_opened,
      tool_calls: f.friction_vector.tool_calls,
      retries: f.friction_vector.retries,
      dead_ends: f.friction_vector.dead_ends,
      guessed: f.friction_vector.guessed,
      hedging_count: f.friction_vector.hedging_count,
    },
    root_cause_tag: f.root_cause_tag as Finding["root_cause_tag"],
    remediation: f.remediation
      ? {
          type: f.remediation.type as NonNullable<
            Finding["remediation"]
          >["type"],
          content: f.remediation.content,
          target: f.remediation.target,
          provenance: f.remediation.provenance,
        }
      : null,
  }));

  return { target: demo.target, surfaces, probes, runs, findings };
}
