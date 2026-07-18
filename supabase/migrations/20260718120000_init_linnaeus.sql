-- ─────────────────────────────────────────────────────────────────────────────
-- Linnaeus — WS-D persistence layer schema
-- Mirrors Contract A (lib/contracts.ts, FROZEN @ 3ef21d8).
-- Tables: runs, probes, findings, artifacts, surfaces.
-- Enums/check-constraints match the TS unions exactly.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums (mirror the TS unions in lib/contracts.ts) ─────────────────────────
create type org_state       as enum ('before', 'after');                       -- OrgState
create type run_mode        as enum ('passive', 'capture');                     -- RunMode
create type probe_kind      as enum ('universal', 'synthesized');               -- ProbeKind
create type finding_status  as enum ('completed', 'stalled', 'failed_to_author'); -- FindingStatus
create type root_cause_tag  as enum (                                           -- RootCauseTag
  'coupling', 'dead-code', 'missing-doc', 'no-owner',
  'no-runbook', 'stale-code', 'missing-access', 'none'
);
create type remediation_type as enum (                                          -- RemediationType
  'Document', 'Connect', 'Grant', 'Fix', 'Delete'
);
create type surface_kind    as enum ('repo', 'gmail', 'drive', 'notion', 'rds'); -- Surface.kind
create type access_status   as enum ('connected', 'unavailable', 'unauthorized'); -- Surface.access_status

-- ── runs ─────────────────────────────────────────────────────────────────────
-- Contract A `Run`. `candle` (CandleSpec) stored as jsonb: {model, quant, seed, temp}.
create table runs (
  id          text primary key,
  target      text        not null,
  candle      jsonb       not null,          -- CandleSpec: {model, quant:string|null, seed, temp}
  org_state   org_state   not null,          -- before | after  → the delta axis
  mode        run_mode    not null,          -- passive | capture
  started_at  timestamptz not null,          -- ISO 8601
  created_at  timestamptz not null default now()
);

-- ── probes ───────────────────────────────────────────────────────────────────
-- Contract A `Probe`. instance_spec is null for universal-hardcoded probes.
create table probes (
  id             text       primary key,
  category       text       not null,
  kind           probe_kind not null,
  instance_spec  text                        -- nullable: null for universal, authored text for synthesized
);

-- ── surfaces ─────────────────────────────────────────────────────────────────
-- Contract A `Surface`. Powers the org map.
create table surfaces (
  id             text          primary key,
  kind           surface_kind  not null,
  access_status  access_status not null
);

-- ── findings ─────────────────────────────────────────────────────────────────
-- Contract A `Finding`. Keyed by (run_id, probe_id) — the natural key the delta
-- joins on. A surrogate uuid `id` gives artifacts a stable FK target.
-- friction_vector persisted as jsonb (FrictionVector). remediation lives in `artifacts`.
create table findings (
  id               uuid           primary key default gen_random_uuid(),
  run_id           text           not null references runs (id)   on delete cascade,
  probe_id         text           not null references probes (id) on delete cascade,
  status           finding_status not null,
  friction_vector  jsonb          not null,   -- FrictionVector (8 fields)
  root_cause_tag   root_cause_tag not null,
  created_at       timestamptz    not null default now(),
  unique (run_id, probe_id)                    -- one finding per probe per run
);

create index findings_run_id_idx   on findings (run_id);
create index findings_probe_id_idx on findings (probe_id);

-- ── artifacts ────────────────────────────────────────────────────────────────
-- The typed recommendations the candle emits (capture-mode authoring); a human
-- decides whether to act. This is Contract A `Remediation`, normalized out of
-- `Finding.remediation` (which is null until the capture pass authors it → so a
-- finding has 0 or 1 artifact rows, enforced by the unique constraint).
create table artifacts (
  id                uuid             primary key default gen_random_uuid(),
  finding_id        uuid             not null references findings (id) on delete cascade,
  remediation_type  remediation_type not null,   -- Remediation.type
  content           text             not null,   -- Remediation.content
  target            text             not null,   -- Remediation.target
  provenance        text             not null,   -- Remediation.provenance
  created_at        timestamptz      not null default now(),
  unique (finding_id)                            -- at most one remediation per finding
);

create index artifacts_finding_id_idx on artifacts (finding_id);
