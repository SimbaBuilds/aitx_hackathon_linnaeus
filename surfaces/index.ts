// ─────────────────────────────────────────────────────────────────────────────
// WS-E registry.  The single import surface for the engine (WS-B): it takes the
// flat list of SurfaceTools, wraps each with the FrictionRecorder, and reports
// which org surfaces are actually reachable.
//   allSurfaceTools() → every SurfaceTool across all five adapters.
//   surfaceStatus()   → one Surface per kind with its access_status.
// ─────────────────────────────────────────────────────────────────────────────

import type { SurfaceTool } from "@/lib/surfaces";
import type { Surface } from "@/lib/contracts";

import { repoReadTools, repoReadStatus } from "./repo-read";
import { gmailSearchTools, gmailSearchStatus } from "./gmail-search";
import { driveReadTools, driveReadStatus } from "./drive-read";
import { notionReadTools, notionReadStatus } from "./notion-read";
import { rdsReadTools, rdsReadStatus } from "./rds-read";

/** Every SurfaceTool the engine can hand to the candle. */
export function allSurfaceTools(): SurfaceTool[] {
  return [
    ...repoReadTools,
    ...gmailSearchTools,
    ...driveReadTools,
    ...notionReadTools,
    ...rdsReadTools,
  ];
}

/**
 * Per-surface reachability.  "connected" = creds/paths resolve; "unavailable" =
 * no creds/path (graceful-degrade). "unauthorized" is only known at call time
 * (a live 401), so status reports connectivity intent, not live auth.
 */
export function surfaceStatus(): Surface[] {
  return [
    { id: "repo", kind: "repo", access_status: repoReadStatus() },
    { id: "gmail", kind: "gmail", access_status: gmailSearchStatus() },
    { id: "drive", kind: "drive", access_status: driveReadStatus() },
    { id: "notion", kind: "notion", access_status: notionReadStatus() },
    { id: "rds", kind: "rds", access_status: rdsReadStatus() },
  ];
}

export {
  repoReadTools,
  gmailSearchTools,
  driveReadTools,
  notionReadTools,
  rdsReadTools,
};
