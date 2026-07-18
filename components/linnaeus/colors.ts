// Colour tokens for the three views, drawn verbatim from the dataviz reference
// palette (references/palette.md) — validated, not eyeballed.
//   • Sequential BLUE ramp = the pre-scan *prediction* (heat 0..1).
//   • Status RED (critical) = the probe *confirmation* a cell actually stalled.
// Keeping prediction (blue) and confirmation (red) on different channels is the
// whole narrative: "the scan predicted where the agent would stall; the probe
// confirmed it."
import type { CSSProperties } from "react";
import type { FindingStatus, RemediationType, RootCauseTag } from "@/lib/contracts";

// Sequential blue ramp, light→dark (palette.md § Sequential hue). Darker = more
// predicted friction. Position/hex stops; we lerp in sRGB between them.
const BLUE_RAMP: Array<[number, [number, number, number]]> = [
  [0.0, [0xcd, 0xe2, 0xfb]],
  [0.2, [0x9e, 0xc5, 0xf4]],
  [0.4, [0x5a, 0x9b, 0xe8]],
  [0.6, [0x2a, 0x78, 0xd6]],
  [0.8, [0x18, 0x4f, 0x95]],
  [1.0, [0x0d, 0x36, 0x6b]],
];

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/** Map heat 0..1 to a blue fill by interpolating the documented ramp. */
export function heatFill(heat: number): string {
  const h = Math.max(0, Math.min(1, heat));
  for (let i = 1; i < BLUE_RAMP.length; i++) {
    const [p1, c1] = BLUE_RAMP[i - 1];
    const [p2, c2] = BLUE_RAMP[i];
    if (h <= p2) {
      const t = (h - p1) / (p2 - p1);
      const [r, g, b] = [0, 1, 2].map((k) => lerp(c1[k], c2[k], t));
      return `rgb(${r} ${g} ${b})`;
    }
  }
  return "rgb(13 54 107)";
}

/** Ink that stays legible on a heat cell (dark ramp steps need light text). */
export const heatInk = (heat: number): string =>
  heat >= 0.42 ? "#f7fbff" : "#0b0b0b";

// ── Status palette (fixed, never themed — palette.md § Status) ──
export const STATUS: Record<FindingStatus, { color: string; label: string }> = {
  completed: { color: "#0ca30c", label: "Completed" }, // good
  stalled: { color: "#d03b3b", label: "Stalled" }, // critical
  failed_to_author: { color: "#8f1f1f", label: "Failed to author" }, // critical+
};

export const FRICTION_GOOD = "#0ca30c";
export const FRICTION_BAD = "#d03b3b";

/** Colour a friction score by band (relative reading only). */
export const frictionColor = (s: number): string =>
  s >= 70 ? "#d03b3b" : s >= 35 ? "#ec835a" : s >= 18 ? "#eda100" : "#0ca30c";

// ── Remediation taxonomy = categorical identity (palette.md § Categorical) ──
// Each type gets a fixed slot; the text label is always present (secondary
// encoding), so the colour never carries meaning alone.
export const REMEDIATION: Record<RemediationType, { color: string; hint: string }> = {
  Document: { color: "#2a78d6", hint: "add the missing doc" }, // blue
  Connect: { color: "#1baf7a", hint: "wire up the surface" }, // aqua
  Grant: { color: "#eda100", hint: "grant access" }, // yellow
  Fix: { color: "#eb6834", hint: "correct the code" }, // orange
  Delete: { color: "#4a3aa7", hint: "remove dead code" }, // violet
};

export const ROOT_CAUSE_LABEL: Record<RootCauseTag, string> = {
  coupling: "coupling",
  "dead-code": "dead code",
  "missing-doc": "missing doc",
  "no-owner": "no owner",
  "no-runbook": "no runbook",
  "stale-code": "stale code",
  "missing-access": "missing access",
  none: "none",
};

/** A soft tinted-chip style from any accent colour (text + 14% wash). */
export const chip = (color: string): CSSProperties => ({
  color,
  backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
  boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 30%, transparent)`,
});
