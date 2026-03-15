---
phase: 1
slug: foundation-and-schema
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 (E2E only — no unit test framework installed) |
| **Config file** | `playwright.config.ts` — Wave 0 creates it if missing |
| **Quick run command** | `npm run test:e2e` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Manual: start `npm run dev`, verify the specific behavior changed
- **After every plan wave:** Run `npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green + all 5 success criteria manually verified
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | FOUND-01 | E2E | `npm run test:e2e -- --grep "login redirect"` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | AUTH-01 | E2E | `npm run test:e2e -- --grep "auth login"` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | FOUND-02 | Manual | Remove env var, start dev server, observe terminal | N/A | ⬜ pending |
| 1-01-04 | 01 | 1 | FOUND-03 | Manual | Inspect `package.json` build script | N/A | ⬜ pending |
| 1-02-01 | 02 | 2 | FOUND-04 | Manual | Supabase dashboard `\dt` + verify RLS enabled | N/A | ⬜ pending |
| 1-03-01 | 03 | 3 | FOUND-05 | E2E | `npm run test:e2e -- --grep "rebrand"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `playwright.config.ts` — Playwright config file (check if exists; add if missing)
- [ ] `tests/phase1.spec.ts` — E2E stubs covering FOUND-01 (redirect), FOUND-05 (rebrand), AUTH-01 (login flow)

*Wave 0 must be the first wave in the first plan so tests exist before behavior is verified.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Missing env var produces readable startup error | FOUND-02 | Cannot automate dev server terminal output in Playwright | Remove `NEXT_PUBLIC_SUPABASE_URL` from `.env.local`, run `npm run dev`, confirm readable error message appears in terminal |
| `npm run build` does not trigger migration | FOUND-03 | Config inspection, not runtime behavior | Open `package.json`, confirm `build` script is `"next build"` with no `drizzle-kit` prefix |
| All 10 tables exist in DB with RLS enabled | FOUND-04 | Requires DB introspection | Run `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` in Supabase SQL editor; run `SELECT tablename FROM pg_tables JOIN pg_class ON ... WHERE row_security = 'on'` to verify RLS |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
