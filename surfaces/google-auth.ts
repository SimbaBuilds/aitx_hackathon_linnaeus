// ─────────────────────────────────────────────────────────────────────────────
// Google OAuth auto-refresh. The Gmail/Drive adapters read a static
// GOOGLE_ACCESS_TOKEN (they don't refresh). Access tokens expire in ~1hr, so a
// run started >1hr after the last mint stalls on `unauthorized`. This helper
// mints a fresh access token from the stored refresh token before a run.
//
// Reuses the creds already provisioned by SKMD's gmail-access skill:
//   - refresh_token + expires_at  ← google-tokens.json  (per-email object)
//   - client_id / client_secret   ← env, or parsed from the skill's SKILL.md
//
// Nothing here is committed; all secrets are read from disk at runtime. Call
// ensureGoogleToken() at the top of any script/route that touches Gmail/Drive.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from "fs";

const DEFAULT_TOKENS_JSON =
  "/Users/cameronhightower/Software_Projects/SKMD/.claude/skills/google-tokens.json";
const DEFAULT_SKILL_MD =
  "/Users/cameronhightower/Software_Projects/SKMD/.claude/skills/gmail-access/SKILL.md";
const DEFAULT_EMAIL = "cameron.hightower@simbabuilds.com";
const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
// Refresh if the cached token expires within this window (ms).
const REFRESH_SKEW_MS = 5 * 60 * 1000;

interface TokenRecord {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number; // epoch seconds (SKMD skill convention)
  obtained_at?: string;
  scope?: string;
}

export interface EnsureTokenResult {
  token: string;
  refreshed: boolean;
  expiresAt: number | null; // epoch ms
  source: "cache" | "refresh";
}

function tokensPath(): string {
  return process.env.GOOGLE_TOKENS_JSON ?? DEFAULT_TOKENS_JSON;
}
function email(): string {
  return process.env.GOOGLE_TOKEN_EMAIL ?? DEFAULT_EMAIL;
}

function readTokensFile(): Record<string, TokenRecord> {
  const p = tokensPath();
  if (!existsSync(p)) throw new Error(`google-tokens.json not found at ${p}`);
  return JSON.parse(readFileSync(p, "utf8")) as Record<string, TokenRecord>;
}

// client_id is public; client_secret is a secret. Prefer env; else parse the
// skill's `curl -d "client_id=…"` / `-d "client_secret=…"` lines.
function oauthClient(): { clientId: string; clientSecret: string } {
  let clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
  let clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  if (clientId && clientSecret) return { clientId, clientSecret };

  const skillPath = process.env.GMAIL_SKILL_MD ?? DEFAULT_SKILL_MD;
  if (existsSync(skillPath)) {
    const md = readFileSync(skillPath, "utf8");
    clientId ||= md.match(/client_id=([^"'\s\\]+)/)?.[1] ?? "";
    clientSecret ||= md.match(/client_secret=([^"'\s\\]+)/)?.[1] ?? "";
  }
  if (!clientId || !clientSecret) {
    throw new Error(
      "OAuth client_id/client_secret unresolved — set GOOGLE_OAUTH_CLIENT_ID/" +
        "GOOGLE_OAUTH_CLIENT_SECRET or ensure the gmail-access SKILL.md is readable.",
    );
  }
  return { clientId, clientSecret };
}

async function refreshAccessToken(rec: TokenRecord): Promise<{ token: string; expiresAt: number }> {
  if (!rec.refresh_token) throw new Error("no refresh_token in google-tokens.json for this email");
  const { clientId, clientSecret } = oauthClient();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: rec.refresh_token,
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`token refresh failed: HTTP ${res.status} ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("token refresh: no access_token in response");
  const expiresAt = Date.now() + (json.expires_in ?? 3600) * 1000;
  return { token: json.access_token, expiresAt };
}

/**
 * Ensure a live Google access token is present in process.env.GOOGLE_ACCESS_TOKEN.
 * Refreshes from the stored refresh token when the cached one is missing/expiring;
 * otherwise reuses the cache. Also writes the fresh token back to google-tokens.json
 * so subsequent runs (and the SKMD skill) benefit. Idempotent within a process.
 */
export async function ensureGoogleToken(opts: { force?: boolean; verbose?: boolean } = {}): Promise<EnsureTokenResult> {
  const tokens = readTokensFile();
  const rec = tokens[email()];
  if (!rec) throw new Error(`no token record for ${email()} in ${tokensPath()}`);

  const cachedExpMs = rec.expires_at ? rec.expires_at * 1000 : 0;
  const fresh = cachedExpMs - Date.now() > REFRESH_SKEW_MS;

  if (!opts.force && fresh && rec.access_token) {
    process.env.GOOGLE_ACCESS_TOKEN = rec.access_token;
    if (opts.verbose)
      console.log(`  google token: cache hit (expires in ${Math.round((cachedExpMs - Date.now()) / 60000)}m)`);
    return { token: rec.access_token, refreshed: false, expiresAt: cachedExpMs, source: "cache" };
  }

  const { token, expiresAt } = await refreshAccessToken(rec);
  process.env.GOOGLE_ACCESS_TOKEN = token;

  // Persist back (best-effort) so the token is shared/cached like the skill does.
  try {
    rec.access_token = token;
    rec.expires_at = Math.floor(expiresAt / 1000);
    rec.obtained_at = new Date().toISOString();
    tokens[email()] = rec;
    writeFileSync(tokensPath(), JSON.stringify(tokens, null, 2));
  } catch {
    /* read-only fs or races are non-fatal — the in-process env is set */
  }

  if (opts.verbose)
    console.log(`  google token: refreshed (valid ~${Math.round((expiresAt - Date.now()) / 60000)}m)`);
  return { token, refreshed: true, expiresAt, source: "refresh" };
}
