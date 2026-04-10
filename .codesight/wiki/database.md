# Database

> **Navigation aid.** Schema shapes and field types extracted via AST. Read the actual schema source files before writing migrations or query logic.

**drizzle** — 11 models

### staff_profiles

pk: `id` (uuid)

- `id`: uuid _(pk)_
- `email`: text _(required)_
- `fullName`: text
- `role`: staffRoleEnum _(required)_

### students

pk: `id` (uuid) · fk: counselorId

- `id`: uuid _(pk)_
- `firstName`: text _(required)_
- `lastName`: text _(required)_
- `gradeLevel`: smallint _(required)_
- `counselorId`: uuid _(fk)_
- `isActive`: boolean _(default, required)_
- `enrolledAt`: date
- _relations_: counselorId -> staffProfiles.id

### classes

pk: `id` (uuid) · fk: teacherId

- `id`: uuid _(pk)_
- `courseName`: text _(required)_
- `courseCode`: text
- `teacherId`: uuid _(fk, required)_
- `semester`: semesterEnum _(required)_
- `schoolYear`: text _(required)_
- _relations_: teacherId -> staffProfiles.id

### enrollments

pk: `id` (uuid) · fk: studentId, classId

- `id`: uuid _(pk)_
- `studentId`: uuid _(fk, required)_
- `classId`: uuid _(fk, required)_
- `enrolledAt`: timestamp _(required, default)_
- _relations_: studentId -> students.id, classId -> classes.id

### attendance_records

pk: `id` (uuid) · fk: studentId, classId, recordedBy

- `id`: uuid _(pk)_
- `studentId`: uuid _(fk, required)_
- `classId`: uuid _(fk)_
- `date`: date _(required)_
- `status`: attendanceStatusEnum _(required)_
- `notes`: text
- `recordedBy`: uuid _(fk)_
- _relations_: studentId -> students.id, classId -> classes.id, recordedBy -> staffProfiles.id

### grades

pk: `id` (uuid) · fk: studentId, classId

- `id`: uuid _(pk)_
- `studentId`: uuid _(fk, required)_
- `classId`: uuid _(fk, required)_
- `gradeType`: gradeTypeEnum _(required)_
- `score`: numeric
- `letterGrade`: text
- `notes`: text
- `gradedAt`: date
- _relations_: studentId -> students.id, classId -> classes.id

### standardized_tests

pk: `id` (uuid) · fk: studentId

- `id`: uuid _(pk)_
- `studentId`: uuid _(fk, required)_
- `testType`: testTypeEnum _(required)_
- `testDate`: date
- `totalScore`: integer
- `mathScore`: integer
- `readingScore`: integer
- `writingScore`: integer
- `targetScore`: integer
- `notes`: text
- _relations_: studentId -> students.id

### graduation_plans

pk: `id` (uuid) · fk: studentId

- `id`: uuid _(pk)_
- `studentId`: uuid _(fk, required)_
- `creditsEarned`: numeric _(default)_
- `creditsRequired`: numeric _(default)_
- `onTrack`: boolean _(default)_
- `planData`: jsonb
- _relations_: studentId -> students.id

### college_prep_plans

pk: `id` (uuid) · fk: studentId

- `id`: uuid _(pk)_
- `studentId`: uuid _(fk, required)_
- `targetSchools`: jsonb
- `applicationDeadline`: date
- `essayStatus`: text
- `recommendationStatus`: text
- `notes`: text
- _relations_: studentId -> students.id

### ai_insights

pk: `id` (uuid) · fk: studentId

- `id`: uuid _(pk)_
- `studentId`: uuid _(fk)_
- `insightType`: insightTypeEnum _(required)_
- `content`: jsonb _(required)_
- `isCurrent`: boolean _(default, required)_
- `generatedAt`: timestamp _(required, default)_
- _relations_: studentId -> students.id

### access_audit_log

pk: `id` (uuid) · fk: viewerId, studentId

- `id`: uuid _(pk)_
- `viewerId`: uuid _(fk, required)_
- `studentId`: uuid _(fk, required)_
- `viewedAt`: timestamp _(required, default)_
- _relations_: viewerId -> staffProfiles.id, studentId -> students.id

## Schema Source Files

Search for ORM schema declarations:
- Drizzle: `pgTable` / `mysqlTable` / `sqliteTable`
- Prisma: `prisma/schema.prisma`
- TypeORM: `@Entity()` decorator
- SQLAlchemy: class inheriting `Base`

---
_Back to [overview.md](./overview.md)_