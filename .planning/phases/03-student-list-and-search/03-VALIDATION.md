---
phase: 3
slug: student-list-and-search
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 (unit) + Playwright 1.58.2 (E2E) |
| **Config file** | `vitest.config.ts` (unit), `playwright.config.ts` (E2E) |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~10 seconds (unit only) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | 01 | 0 | LIST-01..05 | unit setup | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 | ⬜ pending |
| 3-01-01 | 01 | 1 | LIST-01 | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 | ⬜ pending |
| 3-01-02 | 01 | 1 | LIST-01 | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 | ⬜ pending |
| 3-01-03 | 01 | 1 | LIST-02 | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 | ⬜ pending |
| 3-02-01 | 02 | 2 | LIST-04 | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 | ⬜ pending |
| 3-02-02 | 02 | 2 | LIST-05 | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 | ⬜ pending |
| 3-03-01 | 03 | 3 | LIST-01..05 | unit | `npm run test -- src/__tests__/student-list.test.ts` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/student-list.test.ts` — unit tests for getStudentList(), getCourseOptions(), riskLevel derivation, counselor scoping, pagination math
- [ ] Existing `src/__tests__/` infrastructure is operational (vitest configured with loadEnv) — only the test file is missing

*Existing test framework fully operational; only student-list test file missing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Whole row click navigates to student profile | LIST-01 (UX) | Requires browser interaction | Open /students, click any row (not the name link), verify URL changes to /students/[id] |
| Filter bar updates URL without full page reload | LIST-02/03/04/05 | Requires browser observation | Apply a filter, verify URL updates and list narrows without full page flash |
| Pagination Previous/Next buttons disabled at boundaries | LIST-01 | Requires data and UI state | Navigate to last page, verify Next is disabled; navigate to page 1, verify Previous is disabled |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
