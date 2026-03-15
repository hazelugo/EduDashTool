# Testing Patterns

**Analysis Date:** 2026-03-14

## Test Framework

**Runner:**
- Playwright v1.58.2 - E2E testing only
- Config: `playwright.config.ts` (not present in root, but dependency installed)
- No unit test framework configured (Jest, Vitest not installed)
- No component testing framework (React Testing Library not installed)

**Assertion Library:**
- Playwright built-in assertions (no separate library)

**Run Commands:**
```bash
npm run test:e2e                # Run Playwright e2E tests
```

## Test File Organization

**Location:**
- E2E tests: Expected in root-level directory (convention: `tests/` or `e2e/`) - NOT YET CREATED
- No unit/integration test files found in codebase
- No test files co-located with source code

**Naming:**
- Convention pattern: `*.spec.ts` or `*.e2e.ts` (Playwright uses `.spec.ts`)

**Structure:**
- Playwright tests directory structure typically:
```
tests/
├── example.spec.ts
└── helpers/
```

## Test Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# No coverage command configured
```

## Test Types

**Unit Tests:**
- Not implemented
- No test files found in `src/`
- Would require Jest or Vitest setup

**Integration Tests:**
- Not implemented
- Planned for critical flows (auth, database operations)

**E2E Tests:**
- Framework: Playwright v1.58.2
- Status: Configured but no test files created yet
- Scope: Should cover user flows (login, navigation, data management)

## Current Testing Status

**What's Configured:**
- Playwright installed and available
- `npm run test:e2e` script ready

**What's Missing:**
- No test files exist
- No unit/integration testing framework
- No test configuration files
- No fixtures or test utilities

## Recommended Testing Approach

**For New Features:**
1. **E2E Tests (Primary):**
   - Use Playwright for user-critical flows
   - Focus on: authentication, navigation, data CRUD operations
   - Location: `tests/` directory at project root

2. **Unit Tests (Optional):**
   - Utility functions: Use Vitest (lightweight, fast)
   - Location: co-located with source - `src/lib/utils.test.ts`
   - Focus: error handling, validation logic

3. **Integration Tests (Optional):**
   - Database operations: Vitest with test database
   - API routes: Playwright or fetch-based tests
   - Location: `tests/integration/`

## Setting Up Testing (Future Work)

**For Playwright E2E:**
```bash
# Tests would be in: tests/auth.spec.ts, tests/songs.spec.ts, etc.
```

**For Unit Tests (if needed):**
```bash
# Would need: npm install -D vitest @testing-library/react
# Config: vitest.config.ts
```

---

*Testing analysis: 2026-03-14*
