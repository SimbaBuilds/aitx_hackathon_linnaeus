# Synthesized probes — claude-sonnet-5

Surfaces explored: repo, gmail, drive, notion
Generated: 2026-07-18T21:04:14.545Z

---

Now I have a rich picture. Let me check a couple more things — the peptide catalog rebuild CSVs and the CLAUDE.md snapshot vs current for drift, plus provider_no_show / suspend files for ownership signals.

## Operability Audit — SKMD (ranked probes)

Grounded in what's actually in this repo/mailbox/infra, not generic checklist items — each probe below cites the specific artifact that surfaced it.

---

### 1. The `status` vs `skmd_status` dual-pipeline write
- **Kind:** synthesized
- **Task:** Ask the agent to implement a small feature: "When a medspa admin uploads a new document during onboarding from the SKMD Wellness portal, also send a reminder email if they haven't submitted in 7 days." Give it no pointer to `docs/shared/MEDSPA_ONBOARDING_STATUS_MODEL.md`. Watch whether it infers the pipeline from `organizations.is_skmd` (explicitly called out in the doc as *wrong*) or correctly threads `?platform=skmd|docuspa` and respects the one-way cascade rule.
- **Surfaces:** `skmd_fastapi/app/db/onboarding.py`, `skmd_fastapi/app/endpoints/medspa.py`, `docs/shared/MEDSPA_ONBOARDING_STATUS_MODEL.md`, both `docuspa_njs` and `skmd_wellness_njs` onboarding callers.
- **Risk targeted:** Two independent state machines sharing one table, distinguished only by a caller-set query param, with a one-directional cascade nobody can infer from the schema. The existence of a 20KB doc entirely devoted to explaining this is itself evidence it has already caused bugs.
- **Expected stall / root cause:** Agent silently writes to the wrong status column or infers pipeline from the stale `is_skmd` bool → **coupling**.

### 2. The recommendation nobody executed: batched billing for chronic decliners
- **Kind:** synthesized
- **Task:** "Thrive Vitality has a 50% Stripe decline rate per `temp_docs/medspa_clearance_charge_reliability.md`. Switch them to the weekly batched-billing path that's already built." Have the agent find who owns this decision/rollout and where the toggle lives (`organizations.payment_timing = 'weekly'`), and check whether any tracked task (Notion, implementation_plans) exists for the fleet-wide rollout the doc recommends.
- **Surfaces:** `temp_docs/medspa_clearance_charge_reliability.md`, `organizations.payment_timing`, Gmail thread "Account Suspension" (Cameron manually set "Thrive and Snow to weekly" ad hoc), Notion tasks DB.
- **Risk targeted:** A clear, data-backed recommendation exists, a one-off manual fix was applied to two named clinics via email, but the systemic rollout ("default medspa_pays clinics to weekly") has no ticket, no owner, and the safer path has **zero production usage** across 25 orgs.
- **Expected stall / root cause:** Agent can't find any task/plan for the actual fix — it only exists as a Gmail negotiation and an analysis doc → **no-owner**.

### 3. Prod data access is SSM-only and this environment doesn't have the creds
- **Kind:** universal
- **Task:** "Confirm live prod's current medspa decline rate (update the 60-day analysis in `temp_docs/medspa_clearance_charge_reliability.md`)." This requires `scripts/sb_migrate/read_prod.sh` over SSM as `claude_readonly`, with the password in Secrets Manager `skmd/prod/claude-readonly-password`.
- **Surfaces:** `.claude/skills/prod-db-read/SKILL.md`, `scripts/sb_migrate/read_prod.sh`, AWS Secrets Manager, `rds_query` tool (already confirmed to return "no credentials — rds unavailable" in this session).
- **Risk targeted:** The documented path to ground-truth prod data depends on infra credentials (SSM session, Secrets Manager) that aren't provisioned for every agent/environment — a real, already-observed gap in this very session.
- **Expected stall / root cause:** Agent either fabricates numbers from stale docs or halts asking for AWS access → **missing-access**.

### 4. The greenlight flag that's in the DB but wired to nothing
- **Kind:** synthesized
- **Task:** "Turn on NxtYou provider access for Dr. Jane Smith so she starts seeing NxtYou patients in her queue." Per `implementation_plans/nxtyou_provider_portal_consolidation.md`, `users.is_nxtyou_provider` was added by migration `20260410120000_add_nxtyou_provider_flag.sql`, backfilled and indexed, and `find_available_providers` already supports filtering on it — but **no UI and no endpoint sets it, and the waiting-queue code doesn't branch on it either**.
- **Surfaces:** `supabase/migrations/20260410120000_add_nxtyou_provider_flag.sql`, `implementation_plans/nxtyou_provider_portal_consolidation.md`, `docuspa_njs/lib/contexts/AuthContext.tsx`, `db/on_demand.py`.
- **Risk targeted:** A feature that looks 80% done at the schema/query layer with no reachable entry point — the kind of thing an agent will assume "already works" and ship broken.
- **Expected stall / root cause:** Agent can't find any admin toggle or API to actually flip the flag → **dead-code** (unwired half-built feature).

### 5. Legacy RAG path still wired despite being marked dead
- **Kind:** synthesized
- **Task:** "Remove the unused peptide embedding search path to simplify `embedding_service.py`." Per `docs/backend/DEPRECATED_peptide_embeddings.md`, `peptide_embeddings`/`match_peptide_embeddings` are confirmed empty in prod and superseded by `peptide_evidence`/`match_peptide_evidence`, yet `build_peptide_embeddings()`, `search()`, and the RPC are all still live code, and neither legacy nor active RPC joins `peptides.is_active` (the peptide kill-switch works by physically deleting rows, per the retatrutide-removal migration).
- **Surfaces:** `skmd_fastapi/app/services/embedding_service.py`, `docs/backend/DEPRECATED_peptide_embeddings.md`, `supabase/migrations/20260621120000_remove_retatrutide.sql`.
- **Risk targeted:** Deprecation is documented but not executed, and the doc reveals a second landmine (kill-switch = row deletion, not a flag join) that a naive "just add `is_active` filter" fix would miss.
- **Expected stall / root cause:** Agent either leaves it (correctly cautious) or removes it without discovering the undocumented row-deletion kill-switch pattern elsewhere → **dead-code** / **stale-code**.

### 6. The staging-teardown footgun already flagged but not yet fixed in code
- **Kind:** synthesized
- **Task:** "Redeploy the prod Supabase stack after a config change." Walk the actual deploy path: `infra/supabase/deploy.sh` and `infra/supabase/env/supabase.env.tmpl` **default `RDS_HOST`/`S3_BUCKET` to staging** (per `temp_docs/phase8_decommission_checklist.md`), and staging is slated for full Terraform destruction in Phase 8a. If Phase 8a has run by the time this is tested, `ENV=prod ./deploy.sh` without explicit env overrides silently points prod at a bucket/DB that no longer exists.
- **Surfaces:** `infra/supabase/deploy.sh`, `infra/supabase/env/supabase.env.tmpl`, `temp_docs/phase8_decommission_checklist.md`, `infra/terraform/`.
- **Risk targeted:** A documented, known-dangerous default that the author flagged for fixing "with 8a" but the fix (`locals.tf`/fail-closed env requirement) may not have landed — a runbook gap between "we know about it" and "it's actually fixed."
- **Expected stall / root cause:** Agent runs the documented deploy command and doesn't realize the default silently targets a torn-down env → **stale-code** (doc says fix "should" happen but code still has the hardcoded default).

### 7. "Waiting room" is one paragraph of tribal knowledge for a genuinely converged system
- **Kind:** synthesized
- **Task:** "A patient with an on-demand session and another with a scheduled session both say they got stuck in the waiting room — explain the exact state-transition difference between the two paths and where they diverge/converge in code."
- **Surfaces:** `docs/shared/WAITING_ROOM.md` (243 bytes total), cross-referenced against the much more detailed `docs/backend/TELEHEALTH_SESSION_LIFECYCLE.md` (lazy cleanup, 15-min guard, Daily.co re-provisioning) which never mentions "waiting room" convergence explicitly.
- **Risk targeted:** The one doc that admits "this used to be simpler and organically merged" gives zero detail on *how* — an agent debugging a real waiting-room ticket has to reverse-engineer the convergence from `on_demand.py` and session-status code with no map.
- **Expected stall / root cause:** Agent conflates the two paths or misattributes a bug because the doc undersells how merged the logic now is → **missing-doc**.

### 8. No ownership map across five repos merged into one, with a business owner who only exists in email
- **Kind:** universal
- **Task:** "Who should review/approve a change to the peptide fulfillment status model (`request4.md`'s peptide-orders workflow)? Who is the medical authority that must sign off on new stacking/contraindication rules?"
- **Surfaces:** `CLAUDE.md` (lists paths/ports, no named owners), no `CODEOWNERS` file anywhere in the repo (confirmed absent), Gmail thread "Protocols & Standing Orders" from `skmdwellness@gmail.com` (Tony) referencing "Medical Director name (Always Dr Sunil Kurup)" — a fact that exists only in a change-request markdown file (`request2.md`), not in any schema doc or `docs/` file.
- **Risk targeted:** Product/business ownership (Tony) and clinical authority (Dr. Kurup) exist only as names in ad hoc email/request files; there's no committed ownership record for who approves protocol content, pricing catalog changes, or clinical rule changes (`contraindication_rules`, `stacking_rules`).
- **Expected stall / root cause:** Agent has no way to determine sign-off authority for a clinical/business change without trawling Gmail → **no-owner**.
