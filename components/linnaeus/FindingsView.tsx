"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { afterFindings, probeLabel, scoreOf, target } from "@/components/linnaeus/data";
import { frictionColor } from "@/components/linnaeus/colors";
import { RemediationBadge, StatusBadge, TagBadge } from "@/components/linnaeus/ui";

function FrictionCell({ score }: { score: number }) {
  const color = frictionColor(score);
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 tabular-nums text-sm font-semibold" style={{ color }}>
        {score.toFixed(1)}
      </span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, score)}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function FindingsView() {
  const rows = [...afterFindings].sort((a, b) => scoreOf(b) - scoreOf(a));
  const stalled = rows.filter((f) => f.status !== "completed").length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Findings</h2>
        <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
          Every probe run against{" "}
          <span className="font-mono text-foreground">{target}</span> in its current
          (&ldquo;after&rdquo;) org state — {stalled} of {rows.length} stalled, each with a
          mechanically-observed friction score and a recommended remediation.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="pl-4">Probe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Root cause</TableHead>
              <TableHead>Friction</TableHead>
              <TableHead className="pr-4">Remediation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((f) => {
              const isStalled = f.status !== "completed";
              return (
                <TableRow
                  key={f.probe_id}
                  className={isStalled ? "bg-[#d03b3b]/[0.035]" : undefined}
                >
                  <TableCell className="pl-4">
                    <div className="font-medium">{probeLabel(f.probe_id)}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{f.probe_id}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={f.status} />
                  </TableCell>
                  <TableCell>
                    <TagBadge tag={f.root_cause_tag} />
                  </TableCell>
                  <TableCell>
                    <FrictionCell score={scoreOf(f)} />
                  </TableCell>
                  <TableCell className="pr-4">
                    {f.remediation ? (
                      <div className="flex items-center gap-2">
                        <RemediationBadge type={f.remediation.type} />
                        <span
                          className="hidden max-w-[22ch] truncate font-mono text-[11px] text-muted-foreground lg:inline"
                          title={f.remediation.target}
                        >
                          {f.remediation.target}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
