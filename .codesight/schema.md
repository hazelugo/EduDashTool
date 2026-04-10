# Schema

### staff_profiles
- id: uuid (pk)
- email: text (required)
- fullName: text
- role: staffRoleEnum (required)

### students
- id: uuid (pk)
- firstName: text (required)
- lastName: text (required)
- gradeLevel: smallint (required)
- counselorId: uuid (fk)
- isActive: boolean (default, required)
- enrolledAt: date
- _relations_: counselorId -> staffProfiles.id

### classes
- id: uuid (pk)
- courseName: text (required)
- courseCode: text
- teacherId: uuid (fk, required)
- semester: semesterEnum (required)
- schoolYear: text (required)
- _relations_: teacherId -> staffProfiles.id

### enrollments
- id: uuid (pk)
- studentId: uuid (fk, required)
- classId: uuid (fk, required)
- enrolledAt: timestamp (required, default)
- _relations_: studentId -> students.id, classId -> classes.id

### attendance_records
- id: uuid (pk)
- studentId: uuid (fk, required)
- classId: uuid (fk)
- date: date (required)
- status: attendanceStatusEnum (required)
- notes: text
- recordedBy: uuid (fk)
- _relations_: studentId -> students.id, classId -> classes.id, recordedBy -> staffProfiles.id

### grades
- id: uuid (pk)
- studentId: uuid (fk, required)
- classId: uuid (fk, required)
- gradeType: gradeTypeEnum (required)
- score: numeric
- letterGrade: text
- notes: text
- gradedAt: date
- _relations_: studentId -> students.id, classId -> classes.id

### standardized_tests
- id: uuid (pk)
- studentId: uuid (fk, required)
- testType: testTypeEnum (required)
- testDate: date
- totalScore: integer
- mathScore: integer
- readingScore: integer
- writingScore: integer
- targetScore: integer
- notes: text
- _relations_: studentId -> students.id

### graduation_plans
- id: uuid (pk)
- studentId: uuid (fk, required)
- creditsEarned: numeric (default)
- creditsRequired: numeric (default)
- onTrack: boolean (default)
- planData: jsonb
- _relations_: studentId -> students.id

### college_prep_plans
- id: uuid (pk)
- studentId: uuid (fk, required)
- targetSchools: jsonb
- applicationDeadline: date
- essayStatus: text
- recommendationStatus: text
- notes: text
- _relations_: studentId -> students.id

### ai_insights
- id: uuid (pk)
- studentId: uuid (fk)
- insightType: insightTypeEnum (required)
- content: jsonb (required)
- isCurrent: boolean (default, required)
- generatedAt: timestamp (required, default)
- _relations_: studentId -> students.id

### access_audit_log
- id: uuid (pk)
- viewerId: uuid (fk, required)
- studentId: uuid (fk, required)
- viewedAt: timestamp (required, default)
- _relations_: viewerId -> staffProfiles.id, studentId -> students.id
