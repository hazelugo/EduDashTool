# Feature Landscape

**Domain:** High school student aggregator dashboard (EdTech / SIS-adjacent)
**Project:** EduDash
**Researched:** 2026-03-15
**Confidence note:** External search tools unavailable during this session. All findings are drawn from training-data knowledge of production EdTech products (PowerSchool, Infinite Campus, Naviance, Clever, Schoology, Illuminate Education) and Google Gemini API capabilities through August 2025. Confidence levels reflect this constraint.

---

## Table Stakes

Features that educators expect in any student dashboard tool. Missing any of these and adoption fails — staff will revert to their existing fragmented tools.

| Feature | Why Expected | Complexity | Confidence | Notes |
|---------|--------------|------------|------------|-------|
| Student list with search | Educators navigate to students by name or ID daily; no list = no product | Low | HIGH | Must support name, grade, and class filter minimum |
| Student profile page — single unified view | Core value prop: one place to see everything. Counselors are trained to expect this. | Medium | HIGH | Profile must load fast; sparse data shouldn't look broken |
| Attendance record display | Attendance is the #1 early-warning signal; every SIS shows it | Low | HIGH | Show absences, tardies, excused vs. unexcused counts |
| Current classes and grades | Teachers and counselors check grades and class enrollment constantly | Medium | HIGH | Per-course grade, teacher name, period, credit value |
| Graduation credit tracker | Counselors' primary job — credit auditing for graduation eligibility | High | HIGH | Credits earned vs. required, broken down by category (English, Math, etc.) |
| On-track / off-track status indicator | Naviance and Infinite Campus both show this; counselors expect a quick status signal | Low | HIGH | Simple traffic-light (green/yellow/red) driven by credit + attendance thresholds |
| Role-based access control | Schools will not deploy a tool that lets a PE teacher see all students' records | Medium | HIGH | Teacher = own students; counselor/principal = all; enforced server-side |
| Manual data entry for staff | v1 has no SIS sync; staff must be able to enter/update student data | Medium | HIGH | CRUD forms for attendance, grades, credits, SAT scores, class assignments |
| SAT/PSAT score display | Standard college-prep data point; counselors review it every year | Low | HIGH | Store most recent score, test date, sub-scores (Math/EBRW) |
| Responsive layout usable on laptop and tablet | Counselors frequently use iPads; staff aren't always at desktops | Low | MEDIUM | shadcn/ui components handle this well; needs testing at 768px |

---

## Differentiators

Features that separate EduDash from existing SIS products and drive the case for adopting it alongside (or instead of) fragmented tools.

| Feature | Value Proposition | Complexity | Confidence | Notes |
|---------|-------------------|------------|------------|-------|
| Gemini AI: at-risk flagging per student | Counselors cannot manually monitor 400+ students; AI surfaces who needs attention | High | HIGH | Feed attendance + grades + credit deficit to Gemini; return risk level + reasoning |
| Gemini AI: intervention suggestions | Not just "this student is at-risk" but "here is what to do about it" — actionable | High | HIGH | Prompt includes student history; response should be 2-3 concrete action items |
| Gemini AI: graduation + college prep roadmap generation | Naviance charges separately; having it AI-generated from actual student data is novel | High | MEDIUM | Gemini generates a semester-by-semester plan given remaining requirements and target schools |
| Gemini AI: school-wide trend insights | Principals have no aggregated intelligence in most tools; this is a principal-specific value | High | MEDIUM | Aggregate anonymized cohort data; Gemini surfaces patterns (e.g., 11th grade math failures spiking) |
| College prep roadmap with target schools and milestones | Naviance does this but it requires SIS integration and separate purchase | High | MEDIUM | Store target schools, application deadlines, essay status, rec letter tracking |
| Unified view replacing tab-switching | The stated pain point from the principal and teachers who requested this tool | Low | HIGH | Navigation between profile sections should be instant (no page reload) |
| AI-generated context on student profile | Gemini-written "student snapshot" narrative — a paragraph summarizing risk, progress, and next steps | Medium | MEDIUM | Surfaces on the profile page; generated on demand or on open |
| Credit gap analysis with recommendations | Show not just what credits are missing but what classes to take to fill gaps | Medium | MEDIUM | Derived from credit tracker + course catalog; AI can suggest course sequences |

---

## Anti-Features

Things to deliberately NOT build in v1. Each one either creates scope bloat, legal exposure, or technical complexity that would delay shipping without proportional value.

| Anti-Feature | Why Avoid | What to Do Instead | Confidence |
|--------------|-----------|-------------------|------------|
| SIS auto-sync (PowerSchool, Infinite Campus API) | Every school uses a different SIS; integration is school-specific, maintenance-heavy, and adds auth complexity. One bug = corrupted records. | Manual entry for v1; design schema so sync can be added per school in v2 | HIGH |
| Parent or student portal | Separate auth flows, separate UX, separate privacy policy, separate FERPA disclosure surface. Different product entirely. | Staff-only tool. If parents need data, staff exports or shares directly. | HIGH |
| Native mobile app (iOS/Android) | React Native or Expo build adds a separate release pipeline and platform review process | Responsive web works on iPad; PWA installability is sufficient | HIGH |
| Real-time notifications / push alerts | Requires websockets or FCM, persistence layer for notification state, user preferences. Not part of the core workflow. | Staff checks the dashboard manually. Add in v2 if educators request it. | HIGH |
| Document / file attachments on student records | S3/storage setup, file type validation, FERPA storage compliance, virus scanning surface area | Text notes only; "intervention notes" field on student profile | HIGH |
| Grade sync / LMS integration (Google Classroom, Canvas) | Each LMS has a different API, OAuth scope, and data format. Scope explosion. | Manual grade entry by staff for v1 | HIGH |
| Predictive graduation probability score (ML model) | Training a reliable ML model requires 3+ years of labeled data the school doesn't have in this tool yet | Use Gemini's reasoning to describe risk qualitatively; skip numeric ML score | MEDIUM |
| Bulk import via CSV | Tempting shortcut, but CSV parsing edge cases (encoding, column mapping, duplicate detection) are a reliability trap | One-by-one manual entry enforces data quality for v1 | MEDIUM |
| Audit log / change history | Important for compliance but complex to implement correctly (event sourcing, who-changed-what UI) | Supabase timestamps on records give minimal traceability; full audit log is v2 | MEDIUM |
| Multi-school / district-level view | Principals only care about their school; district view requires tenant isolation architecture | Single-school deployment for v1 | HIGH |

---

## Feature Dependencies

```
Role assignment (teacher/counselor/principal)
  → Student list scoping (teacher sees own students only)
    → Student profile page
      → Attendance display
      → Grades + classes display
      → SAT/PSAT display
      → Graduation credit tracker
        → On-track status indicator
        → Credit gap analysis + AI recommendations
      → College prep roadmap
        → AI roadmap generation (Gemini)
      → AI at-risk flag (Gemini)
        → AI intervention suggestions (Gemini)
          → AI student snapshot narrative (Gemini)

Manual data entry (staff)
  → All student data exists to display and for AI to analyze

School-wide trend insights (Gemini)
  → Requires sufficient student records to aggregate
  → Principal role access required

Student search + filter
  → Student list must exist first
  → Risk level filter requires AI flags to be generated
```

**Critical path:** Role system → Student list → Student profile → Manual entry → Graduation tracker → AI features. The AI features are additive on top of a working data layer; they cannot be the first thing built.

---

## MVP Recommendation

The minimum viable product that a principal and two counselors would actually use in a real school:

**Prioritize (must ship together as a coherent tool):**
1. Role-based access (teacher / counselor / principal)
2. Student list with name + grade + class filter
3. Student profile: attendance, grades, current classes, SAT/PSAT
4. Graduation credit tracker with on-track indicator
5. Manual data entry by staff (create/update student records)
6. Gemini at-risk flag + intervention suggestions per student

**Second wave (high value, but doesn't block adoption):**
7. College prep roadmap with target schools
8. Gemini roadmap generation
9. School-wide trend insights for principal

**Defer to v2:**
- CSV bulk import
- Audit log / change history
- SIS integration
- Parent/student portal

**Rationale:** If the graduation tracker and at-risk AI are working, counselors have immediate daily utility. The college prep roadmap is valuable but counselors can function without it initially. School-wide trends require enough data to be meaningful — it should come after data is being entered consistently.

---

## Gemini AI Feature Breakdown

Since Gemini is a core differentiator, each AI feature needs a clear prompt contract and output shape.

| AI Feature | Input to Gemini | Expected Output | Complexity | When to Run |
|-----------|-----------------|-----------------|------------|-------------|
| At-risk flag | Attendance %, GPA, credit deficit, SAT score (if available) | Risk level (high/medium/low) + 1-2 sentence reasoning | Medium | On-demand from profile page; cache result with timestamp |
| Intervention suggestions | Same as at-risk input + risk flag result | 2-3 specific action items for the counselor | Medium | Triggered after at-risk flag is generated |
| Student snapshot narrative | All profile data fields | 1 paragraph plain-English summary of the student's situation | Medium | On-demand; optional display on profile |
| Graduation + college roadmap | Remaining required credits, target schools (if set), current GPA, available semesters | Semester-by-semester course plan + college app milestone timeline | High | On-demand; result stored so it persists without re-calling API |
| School-wide trend insights | Aggregated cohort stats (average attendance, GPA distribution, credit deficit counts, at-risk counts) | Narrative + 3-5 bullet insight summary | High | On-demand from principal overview page; re-run weekly |

**Gemini implementation notes (MEDIUM confidence — based on @google/generative-ai SDK as of 2025):**
- Use `gemini-1.5-pro` or `gemini-2.0-flash` for cost/quality balance on the simpler features (flag, suggestions)
- Use structured output (JSON mode) for at-risk flags so the UI can render the risk level as a badge
- Store generated roadmaps in the database — avoid re-calling Gemini on every page load
- Rate limit: implement a per-student cooldown to avoid runaway API costs
- Prompt engineering matters significantly — the quality of at-risk detection depends heavily on how student data is framed in the prompt

---

## Competitive Landscape Summary

| Product | Strengths | Gap EduDash Fills |
|---------|-----------|-------------------|
| PowerSchool SIS | Industry standard, deep SIS integration | No AI layer; complex UI; requires IT to configure |
| Infinite Campus | Strong attendance + grade tracking | No aggregated "one view" profile; no AI |
| Naviance | Best-in-class college prep roadmap | No real-time at-risk monitoring; separate from SIS |
| Schoology (LMS) | Good assignment/grade tracking | Not a student-profile aggregator; no counselor tools |
| Illuminate Education | Strong assessment analytics | Expensive; no college prep; limited AI |

EduDash's gap to fill: **a single, fast, AI-augmented student profile** that a counselor or teacher can open and immediately act on — without needing IT, without SIS configuration, and without switching between four apps.

---

## Sources

- Domain knowledge: PowerSchool, Infinite Campus, Naviance product feature sets (training data through August 2025, MEDIUM confidence)
- Google Gemini API capabilities: `@google/generative-ai` SDK documentation (training data through August 2025, MEDIUM confidence)
- Project requirements: `.planning/PROJECT.md` (HIGH confidence — project-specific)
- External web sources: unavailable during this research session (WebSearch, WebFetch, Brave Search all denied/unavailable)

**Confidence summary:**
- Table stakes feature list: HIGH (well-established SIS category norms)
- Anti-features: HIGH (common EdTech scope traps, validated by project constraints)
- Gemini AI feature design: MEDIUM (API capabilities may have evolved; verify model names and JSON output mode before implementing)
- Competitive landscape: MEDIUM (product features change; verify before using in stakeholder presentations)
