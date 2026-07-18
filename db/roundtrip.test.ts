// ─────────────────────────────────────────────────────────────────────────────
// Round-trip test — NO live DB required.
// Proves the mapping in db/mappers.ts is lossless: every Contract A object from
// fixtures/demo.json is split into the exact row shape the client would INSERT,
// then reassembled, and asserted deep-equal to the original.
//
// This simulates the DB write/read path purely in memory:
//   Finding → findingToRow + findingToArtifactRow  (INSERT path)
//           → rowToFinding                          (SELECT path)
//
// Run: npx tsx db/roundtrip.test.ts
// ─────────────────────────────────────────────────────────────────────────────

import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { loadFixture } from "@/db/fixture";
import { frictionScore } from "@/lib/instrumentation";
import {
  runToRow,
  rowToRun,
  probeToRow,
  rowToProbe,
  findingToRow,
  findingToArtifactRow,
  rowToFinding,
} from "@/db/mappers";
import type { Finding } from "@/lib/contracts";

let passed = 0;
let failed = 0;

function check(label: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${label}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${label}`);
    console.error(`        ${(err as Error).message.split("\n")[0]}`);
  }
}

/** Simulate the DB write→read round trip for one Finding, entirely in memory. */
function roundTripFinding(finding: Finding): Finding {
  const findingId = randomUUID(); // the surrogate id the DB would assign
  const findingRow = findingToRow(finding); // what INSERT into `findings` sends
  const artifactRow = findingToArtifactRow(finding, findingId); // → `artifacts`
  // rowToFinding is exactly what getFindings()/getProbeDelta() reassemble from.
  return rowToFinding(findingRow, artifactRow);
}

const { runs, probes, findings } = loadFixture();

console.log("\nLinnaeus WS-D round-trip test (no live DB)\n");

console.log("Runs:");
for (const run of runs) {
  check(`run ${run.id} round-trips`, () => {
    assert.deepStrictEqual(rowToRun(runToRow(run)), run);
  });
}

console.log("Probes:");
for (const probe of probes) {
  check(`probe ${probe.id} round-trips`, () => {
    assert.deepStrictEqual(rowToProbe(probeToRow(probe)), probe);
  });
}

console.log("Findings (the losslessness guarantee):");
for (const finding of findings) {
  const label = `${finding.run_id}/${finding.probe_id} (remediation: ${
    finding.remediation ? finding.remediation.type : "none"
  })`;
  check(label, () => {
    assert.deepStrictEqual(roundTripFinding(finding), finding);
  });
}

// Sanity: the money-shot delta computed from round-tripped findings must match
// the value in the fixture (billing-regression: completed→stalled = +76.0).
console.log("Delta (money shot):");
check("billing-regression before→after friction_delta == 76.0", () => {
  const before = findings.find(
    (f) => f.probe_id === "billing-regression" && f.run_id === "run_before",
  )!;
  const after = findings.find(
    (f) => f.probe_id === "billing-regression" && f.run_id === "run_after",
  )!;
  const delta =
    frictionScore(roundTripFinding(after).friction_vector) -
    frictionScore(roundTripFinding(before).friction_vector);
  assert.equal(Math.round(delta * 10) / 10, 76.0);
});

console.log(
  `\n${failed === 0 ? "ALL GREEN" : "FAILURES"} — ${passed} passed, ${failed} failed ` +
    `(${findings.length} findings, ${runs.length} runs, ${probes.length} probes)\n`,
);

process.exit(failed === 0 ? 0 : 1);
