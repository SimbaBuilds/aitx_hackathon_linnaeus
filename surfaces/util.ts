// ─────────────────────────────────────────────────────────────────────────────
// WS-E shared helpers.  Small, dependency-free utilities used by the adapters.
// ─────────────────────────────────────────────────────────────────────────────

import type { SurfaceToolResult } from "@/lib/surfaces";

/** Return the first env var in `keys` that is set to a non-empty value. */
export function firstEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

/** True if EVERY listed env var is present and non-empty. */
export function hasAllEnv(...keys: string[]): boolean {
  return keys.every((k) => {
    const v = process.env[k];
    return !!v && v.trim().length > 0;
  });
}

/** The canonical graceful dead-end for a surface with no credentials. */
export function noCreds(surface: string): SurfaceToolResult {
  return { ok: false, data: null, note: `no credentials — ${surface} unavailable` };
}

/** A dead-end for an unexpected error — still ok:false, never throws upward. */
export function failed(note: string): SurfaceToolResult {
  return { ok: false, data: null, note };
}

/** Coerce an unknown arg into a string, or undefined. */
export function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Coerce an unknown arg into a bounded positive integer. */
export function asInt(v: unknown, fallback: number, max: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}
