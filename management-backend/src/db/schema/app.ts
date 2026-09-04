import { timestamp, integer, boolean, pgTable, text, varchar, jsonb, pgEnum, index, uniqueIndex, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth.ts';

const timesstamp = {
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull()
}

export const classStatusEnum = pgEnum('class_status', ['active', 'inactive', 'archived']);

export type ClassSchedule = {
	day: string;
	startTime: string;
	endTime: string;
};

export const departments = pgTable('departments', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	code: varchar('code', { length: 10 }).notNull().unique(),
	name: varchar('name', { length: 255 }).notNull(),
	description: varchar('description', { length: 255 }),
	...timesstamp
});

export const subjects = pgTable('subjects', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	departmentId: integer('department_id').notNull().references(() => departments.id, { onDelete: 'restrict' }),
	code: varchar('code', { length: 10 }).notNull().unique(),
	name: varchar('name', { length: 255 }).notNull(),
	description: varchar('description', { length: 255 }),
	...timesstamp
});

export const classes = pgTable('classes', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	subjectId: integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
	teacherId: text('teacher_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
	inviteCode: varchar('invite_code', { length: 50 }).notNull().unique(),
	name: varchar('name', { length: 255 }).notNull(),
	bannerCldPubId: text('banner_cld_pub_id'),
	bannerUrl: text('banner_url'),
	description: text('description'),
	capacity: integer('capacity').notNull().default(50),
	status: classStatusEnum('status').notNull().default('active'),
	schedules: jsonb('schedules').$type<ClassSchedule[]>().notNull(),
	...timesstamp
}, (table)=>({
	classesSubjectIdIdx: index('classes_subject_id_idx').on(table.subjectId),
	classesTeacherIdIdx: index('classes_teacher_id_idx').on(table.teacherId)
}));

export const enrollments = pgTable('enrollments', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	studentId: text('student_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
	...timesstamp
}, (table)=>({
	enrollmentStudentClassUniqueIdx: uniqueIndex('enrollment_student_class_unique_idx').on(table.studentId, table.classId),
	enrollmentsStudentIdIdx: index('enrollments_student_id_idx').on(table.studentId),
	enrollmentsClassIdIdx: index('enrollments_class_id_idx').on(table.classId)
}));

export const quizzes = pgTable('quizzes', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
	title: varchar('title', { length: 255 }).notNull(),
	description: text('description'),
	// per-attempt time limit in minutes (e.g. 10)
	durationMinutes: integer('duration_minutes').notNull(),
	// quiz is open until this timestamp
	deadline: timestamp('deadline', { withTimezone: true }).notNull(),
	...timesstamp
}, (table)=>({
	quizzesClassIdIdx: index('quizzes_class_id_idx').on(table.classId)
}));

export const questions = pgTable('questions', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	quizId: integer('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
	questionText: text('question_text').notNull(),
	position: integer('position').notNull().default(0),
	...timesstamp
}, (table)=>({
	questionsQuizIdIdx: index('questions_quiz_id_idx').on(table.quizId)
}));

export const questionOptions = pgTable('question_options', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	questionId: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
	optionText: text('option_text').notNull(),
	isCorrect: boolean('is_correct').notNull().default(false),
	position: integer('position').notNull().default(0)
}, (table)=>({
	questionOptionsQuestionIdIdx: index('question_options_question_id_idx').on(table.questionId)
}));

export const quizAttempts = pgTable('quiz_attempts', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	quizId: integer('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
	studentId: text('student_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
	submittedAt: timestamp('submitted_at', { withTimezone: true }),
	score: integer('score'),
	totalQuestions: integer('total_questions').notNull()
}, (table)=>({
	attemptStudentQuizUniqueIdx: uniqueIndex('attempt_student_quiz_unique_idx').on(table.studentId, table.quizId),
	quizAttemptsQuizIdIdx: index('quiz_attempts_quiz_id_idx').on(table.quizId)
}));

export const quizAnswers = pgTable('quiz_answers', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	attemptId: integer('attempt_id').notNull().references(() => quizAttempts.id, { onDelete: 'cascade' }),
	questionId: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
	selectedOptionId: integer('selected_option_id').notNull().references(() => questionOptions.id, { onDelete: 'cascade' }),
	isCorrect: boolean('is_correct').notNull().default(false)
}, (table)=>({
	quizAnswersAttemptIdIdx: index('quiz_answers_attempt_id_idx').on(table.attemptId)
}));

export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'late']);

export const attendanceSessions = pgTable('attendance_sessions', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
	title: varchar('title', { length: 255 }).notNull(),
	date: date('date').notNull(),
	...timesstamp
}, (table) => ({
	attendanceSessionsClassIdIdx: index('attendance_sessions_class_id_idx').on(table.classId)
}));

export const attendanceRecords = pgTable('attendance_records', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	sessionId: integer('session_id').notNull().references(() => attendanceSessions.id, { onDelete: 'cascade' }),
	studentId: text('student_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	status: attendanceStatusEnum('status').notNull().default('absent'),
	markedAt: timestamp('marked_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
	attendanceRecordsSessionIdIdx: index('attendance_records_session_id_idx').on(table.sessionId),
	attendanceRecordsStudentIdIdx: index('attendance_records_student_id_idx').on(table.studentId),
	attendanceRecordUniqueIdx: uniqueIndex('attendance_record_unique_idx').on(table.sessionId, table.studentId)
}));


export const departmentRelations = relations(departments, ({ many })=>({ subjects: many(subjects) }));

export const subjectRelations = relations(subjects, ({ one, many })=>({ 
	department: one(departments, { 
		fields: [subjects.departmentId], 
		references: [departments.id]
	 }),
	classes: many(classes)
}));

export const classRelations = relations(classes, ({ one, many })=>({
	subject: one(subjects, {
		fields: [classes.subjectId],
		references: [subjects.id]
	}),
	teacher: one(user, {
		fields: [classes.teacherId],
		references: [user.id]
	}),
	enrollments: many(enrollments)
}));

export const enrollmentRelations = relations(enrollments, ({ one })=>({
	student: one(user, {
		fields: [enrollments.studentId],
		references: [user.id]
	}),
	class: one(classes, {
		fields: [enrollments.classId],
		references: [classes.id]
	})
}));

export const quizRelations = relations(quizzes, ({ one, many })=>({
	class: one(classes, {
		fields: [quizzes.classId],
		references: [classes.id]
	}),
	questions: many(questions),
	attempts: many(quizAttempts)
}));

export const questionRelations = relations(questions, ({ one, many })=>({
	quiz: one(quizzes, {
		fields: [questions.quizId],
		references: [quizzes.id]
	}),
	options: many(questionOptions)
}));

export const questionOptionRelations = relations(questionOptions, ({ one })=>({
	question: one(questions, {
		fields: [questionOptions.questionId],
		references: [questions.id]
	})
}));

export const quizAttemptRelations = relations(quizAttempts, ({ one, many })=>({
	quiz: one(quizzes, {
		fields: [quizAttempts.quizId],
		references: [quizzes.id]
	}),
	student: one(user, {
		fields: [quizAttempts.studentId],
		references: [user.id]
	}),
	answers: many(quizAnswers)
}));

export const quizAnswerRelations = relations(quizAnswers, ({ one })=>({
	attempt: one(quizAttempts, {
		fields: [quizAnswers.attemptId],
		references: [quizAttempts.id]
	}),
	question: one(questions, {
		fields: [quizAnswers.questionId],
		references: [questions.id]
	}),
	selectedOption: one(questionOptions, {
		fields: [quizAnswers.selectedOptionId],
		references: [questionOptions.id]
	})
}));

export const attendanceSessionRelations = relations(attendanceSessions, ({ one, many }) => ({
	class: one(classes, {
		fields: [attendanceSessions.classId],
		references: [classes.id]
	}),
	records: many(attendanceRecords)
}));

export const attendanceRecordRelations = relations(attendanceRecords, ({ one }) => ({
	session: one(attendanceSessions, {
		fields: [attendanceRecords.sessionId],
		references: [attendanceSessions.id]
	}),
	student: one(user, {
		fields: [attendanceRecords.studentId],
		references: [user.id]
	})
}));

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;

export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;

export type QuestionOption = typeof questionOptions.$inferSelect;
export type NewQuestionOption = typeof questionOptions.$inferInsert;

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type NewQuizAttempt = typeof quizAttempts.$inferInsert;

export type AttendanceSession = typeof attendanceSessions.$inferSelect;
export type NewAttendanceSession = typeof attendanceSessions.$inferInsert;

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert;