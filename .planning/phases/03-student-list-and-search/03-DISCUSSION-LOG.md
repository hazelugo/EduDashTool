# Phase 3: Student List and Search - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 03-student-list-and-search
**Areas discussed:** Pagination design, Class/course filter, Risk level for LIST-05, Row layout and info shown

---

## Pagination design

**Q: How should pagination work on the student list?**
Options: Offset pages / Load more / No pagination
→ Selected: **Offset pages** (page 1/2/3, Previous/Next, URL-friendly)

**Q: How many students per page?**
Options: 25 / 50 / You decide
→ Selected: **25 per page**

---

## Class/course filter

**Q: How should the class/course filter work for different roles?**
Options: Dropdown of all courses (role-scoped) / Teacher-only filter / You decide
→ Selected: **Dropdown of all courses** (role-scoped — teachers see their courses, others see all)

**Q: What should the class filter label/value be?**
Options: Course name / Specific class section / You decide
→ Selected: **Course name** (e.g. "Algebra I" — groups all sections)

---

## Risk level for LIST-05

**Q: LIST-05 requires filtering by Gemini risk level. Gemini is Phase 6 — what should Phase 3 do?**
Options: Add 3-level enum now with placeholder data / Keep binary flag / Skip until Phase 6
→ Selected: **Add 3-level enum now, show placeholder data** — riskLevel derived from graduationPlans.onTrack; real Gemini values in Phase 6

---

## Row layout and info shown

**Q: Current table columns: Name, Grade, Counselor, Status. What changes?**
Options: Keep columns, update badge to 3-level / Add a column / You decide
→ Selected: **Keep current columns, update Status to 3-level badge** (At Risk / Watch / On Track)

**Q: Should clicking a student row navigate to their profile?**
Options: Name link only (current) / Make whole row clickable
→ Selected: **Make the whole row clickable**

---

*Discussion completed: 2026-04-09*
