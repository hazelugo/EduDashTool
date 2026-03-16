---
phase: 2
slug: role-system-and-staff-profiles
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | AUTH-02 | migration | `npx drizzle-kit check` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | AUTH-02 | unit | `npx vitest run src/__tests__/staff-profiles.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | AUTH-03 | unit | `npx vitest run src/__tests__/role-scoping.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | AUTH-04 | unit | `npx vitest run src/__tests__/role-scoping.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | AUTH-05 | unit | `npx vitest run src/__tests__/audit-log.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 2 | AUTH-06 | unit | `npx vitest run src/__tests__/audit-log.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/staff-profiles.test.ts` — stubs for AUTH-02 (staff_profiles table, role assignment)
- [ ] `src/__tests__/role-scoping.test.ts` — stubs for AUTH-03/AUTH-04 (teacher scoping, counselor/principal access)
- [ ] `src/__tests__/audit-log.test.ts` — stubs for AUTH-05/AUTH-06 (audit log insert, viewer/student/timestamp fields)

*Vitest is already installed (confirmed in package.json).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RLS policy blocks direct DB access for wrong role | AUTH-03 | Requires live Supabase session with real JWT claims | Use Supabase Studio SQL editor, set `request.jwt.claims` to teacher role, run `SELECT * FROM students WHERE ...` for out-of-class students — expect empty result |
| Middleware redirects unauthenticated user to /login | AUTH-06 | Edge Runtime middleware, not testable with vitest | Open incognito, navigate to /dashboard/students/[id] — expect redirect to /login |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
