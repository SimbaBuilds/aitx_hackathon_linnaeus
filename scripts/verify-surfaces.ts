// Read-only surface cred verification. Loads .env.local, calls each connected
// surface with a minimal query, reports ok + note (content redacted to counts).
//   npx tsx scripts/verify-surfaces.ts
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { allSurfaceTools, surfaceStatus } from "@/surfaces";
import { ensureGoogleToken } from "@/surfaces/google-auth";

function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    const quoted = (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
    if (quoted) val = val.slice(1, -1);
    else if (val.startsWith("#")) val = "";
    else { const h = val.indexOf(" #"); if (h >= 0) val = val.slice(0, h).trim(); }
    if (val && process.env[key] === undefined) process.env[key] = val;
  }
}

function summarize(data: unknown): string {
  if (Array.isArray(data)) return `array(${data.length})`;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const k of ["results", "messages", "files", "rows", "items"]) {
      if (Array.isArray(o[k])) return `${k}(${(o[k] as unknown[]).length})`;
    }
    return `object{${Object.keys(o).slice(0, 5).join(",")}}`;
  }
  return typeof data === "string" ? `string(${data.length})` : String(data);
}

async function tryTool(name: string, args: Record<string, unknown>): Promise<void> {
  const tool = allSurfaceTools().find((t) => t.name === name);
  if (!tool) { console.log(`  ${name.padEnd(20)} — tool not found`); return; }
  try {
    const r = await tool.invoke(args);
    console.log(`  ${name.padEnd(20)} ok=${r.ok}  ${r.ok ? summarize(r.data) : ""}${r.note ? "  note: " + r.note : ""}`);
  } catch (e) {
    console.log(`  ${name.padEnd(20)} THREW: ${(e as Error).message}`);
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  try {
    await ensureGoogleToken({ verbose: true });
  } catch (e) {
    console.warn(`google token refresh skipped: ${(e as Error).message}`);
  }
  console.log("\nSurface status:");
  for (const s of surfaceStatus()) console.log(`  ${s.kind.padEnd(8)} ${s.access_status}`);
  console.log("\nLive calls (read-only, content redacted):");
  await tryTool("notion_query_tasks", {});
  await tryTool("gmail_search", { query: "nxtyou", maxResults: 1 });
  await tryTool("drive_search", { query: "nxtyou" });
  console.log();
}

main().catch((e) => { console.error(e); process.exit(1); });
