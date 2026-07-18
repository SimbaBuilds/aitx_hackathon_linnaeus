import type { FindingStatus, RemediationType, RootCauseTag } from "@/lib/contracts";
import { chip, REMEDIATION, ROOT_CAUSE_LABEL, STATUS } from "@/components/linnaeus/colors";

// Inline icons keep status = icon + label (never colour alone).
function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden>
      <path d="M8 1.5l6.5 11.5H1.5L8 1.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 6v3.2M8 11.2v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

export function StatusBadge({ status }: { status: FindingStatus }) {
  const s = STATUS[status];
  return (
    <span className={pill} style={chip(s.color)}>
      {status === "completed" ? <CheckIcon /> : <AlertIcon />}
      {s.label}
    </span>
  );
}

export function RemediationBadge({ type }: { type: RemediationType }) {
  const r = REMEDIATION[type];
  return (
    <span className={pill} style={chip(r.color)} title={r.hint}>
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: r.color }} />
      {type}
    </span>
  );
}

export function TagBadge({ tag }: { tag: RootCauseTag }) {
  if (tag === "none")
    return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
      {ROOT_CAUSE_LABEL[tag]}
    </span>
  );
}
