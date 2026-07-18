// WS-E smoke: proves repo-read works against the REAL local SKMD checkout and
// that the credentialed surfaces degrade gracefully when creds are absent.
// Run:  npx tsx surfaces/smoke.ts
import {
  allSurfaceTools,
  surfaceStatus,
  repoReadTools,
  gmailSearchTools,
  driveReadTools,
  notionReadTools,
  rdsReadTools,
} from "./index";

function tool(list: { name: string }[], name: string) {
  const t = list.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t as unknown as { invoke: (a: Record<string, unknown>) => Promise<{ ok: boolean; data: unknown; note?: string }> };
}

async function main() {
  console.log("=== surfaceStatus ===");
  console.log(JSON.stringify(surfaceStatus(), null, 2));
  console.log(`\n=== allSurfaceTools (${allSurfaceTools().length}) ===`);
  console.log(allSurfaceTools().map((t) => `${t.surface}:${t.name}`).join("\n"));

  // ---- REAL repo-read against local SKMD ----
  console.log("\n=== repo_list '.' (SKMD root) ===");
  const listRes = await tool(repoReadTools, "repo_list").invoke({ path: "." });
  console.log("ok:", listRes.ok);
  const entries = (listRes.data as { entries?: { name: string; type: string }[] })?.entries ?? [];
  console.log(entries.map((e) => `${e.type === "dir" ? "d" : "-"} ${e.name}`).join("\n"));

  console.log("\n=== repo_grep 'billing' ===");
  const grepRes = await tool(repoReadTools, "repo_grep").invoke({ query: "billing", max_results: 8 });
  console.log("ok:", grepRes.ok, "note:", grepRes.note ?? "");
  const g = grepRes.data as { count?: number; files_scanned?: number; hits?: { path: string; line: number; text: string }[] };
  console.log(`files_scanned=${g?.files_scanned} count=${g?.count}`);
  for (const h of (g?.hits ?? []).slice(0, 8)) console.log(`  ${h.path}:${h.line}  ${h.text.slice(0, 90)}`);

  console.log("\n=== repo_read 'CLAUDE.md' (first 120 chars) ===");
  const readRes = await tool(repoReadTools, "repo_read").invoke({ path: "CLAUDE.md" });
  console.log("ok:", readRes.ok);
  console.log(String((readRes.data as { text?: string })?.text ?? readRes.note).slice(0, 120));

  console.log("\n=== path-traversal guard (repo_read '../../etc/passwd') ===");
  const evil = await tool(repoReadTools, "repo_read").invoke({ path: "../../../../etc/passwd" });
  console.log("ok:", evil.ok, "note:", evil.note);

  // ---- credentialed surfaces degrade gracefully ----
  console.log("\n=== graceful degradation (no creds) ===");
  const degrade = [
    ["gmail_search", tool(gmailSearchTools, "gmail_search"), { query: "billing" }],
    ["drive_search", tool(driveReadTools, "drive_search"), { query: "invoice" }],
    ["notion_query_tasks", tool(notionReadTools, "notion_query_tasks"), {}],
    ["rds_list_tables", tool(rdsReadTools, "rds_list_tables"), {}],
  ] as const;
  let allGraceful = true;
  for (const [name, t, args] of degrade) {
    const r = await t.invoke(args as Record<string, unknown>);
    const good = r.ok === false && typeof r.note === "string";
    allGraceful &&= good;
    console.log(`${good ? "PASS" : "FAIL"}  ${name} -> ok=${r.ok} note="${r.note}"`);
  }

  const repoWorked = listRes.ok && readRes.ok && evil.ok === false;
  console.log(`\nrepo-read real checkout: ${repoWorked ? "PASS" : "FAIL"}`);
  console.log(`credentialed graceful degrade: ${allGraceful ? "PASS" : "FAIL"}`);
  if (!repoWorked || !allGraceful) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
