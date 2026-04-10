# Dependency Graph

## Most Imported Files (change these carefully)

- `src\lib\dashboard.ts` — imported by **8** files
- `src\lib\students.ts` — imported by **7** files
- `src\lib\auth.ts` — imported by **3** files
- `src\lib\audit.ts` — imported by **2** files
- `src\app\students\_components\student-filters.tsx` — imported by **1** files
- `src\db\schema.ts` — imported by **1** files
- `src\db\index.ts` — imported by **1** files

## Import Map (who imports what)

- `src\lib\dashboard.ts` ← `src\__tests__\dashboard.test.ts`, `src\__tests__\dashboard.test.ts`, `src\__tests__\dashboard.test.ts`, `src\__tests__\dashboard.test.ts`, `src\__tests__\dashboard.test.ts` +3 more
- `src\lib\students.ts` ← `src\__tests__\student-list.test.ts`, `src\__tests__\student-list.test.ts`, `src\__tests__\student-list.test.ts`, `src\__tests__\student-list.test.ts`, `src\__tests__\student-list.test.ts` +2 more
- `src\lib\auth.ts` ← `src\__tests__\role-scoping.test.ts`, `src\__tests__\staff-profiles.test.ts`, `src\__tests__\staff-profiles.test.ts`
- `src\lib\audit.ts` ← `src\__tests__\audit-log.test.ts`, `src\__tests__\audit-log.test.ts`
- `src\app\students\_components\student-filters.tsx` ← `src\app\students\page.tsx`
- `src\db\schema.ts` ← `src\db\index.ts`
- `src\db\index.ts` ← `src\db\seed.ts`
