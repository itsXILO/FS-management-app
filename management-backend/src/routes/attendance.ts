import express from 'express';
import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import db from '../db/index.js';
import requireRole from '../middleware/require-role.js';
import {
	attendanceSessions,
	attendanceRecords,
	classes,
	enrollments,
} from '../db/schema/index.js';
import { user } from '../db/schema/index.js';

const router = express.Router({ mergeParams: true });

type AttendanceStatus = 'present' | 'absent' | 'late';

// List all sessions for a class
router.get('/:classId/attendance', requireRole(), async (req, res) => {
	try {
		const classId = Number(req.params.classId);
		if (!Number.isInteger(classId) || classId < 1) {
			return res.status(400).json({ error: 'Bad request', message: 'classId must be a positive integer' });
		}

		const sessions = await db
			.select({
				...getTableColumns(attendanceSessions),
				recordCount: sql<number>`count(${attendanceRecords.id})`
			})
			.from(attendanceSessions)
			.leftJoin(attendanceRecords, eq(attendanceRecords.sessionId, attendanceSessions.id))
			.where(eq(attendanceSessions.classId, classId))
			.groupBy(attendanceSessions.id)
			.orderBy(attendanceSessions.date);

		res.status(200).json({
			data: sessions.map(s => ({ ...s, recordCount: Number(s.recordCount) }))
		});
	} catch (e) {
		console.error(`GET /:classId/attendance error:`, e);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Create a new attendance session (teacher who owns the class)
router.post('/:classId/attendance', requireRole('teacher', 'admin'), async (req, res) => {
	try {
		const classId = Number(req.params.classId);
		if (!Number.isInteger(classId) || classId < 1) {
			return res.status(400).json({ error: 'Bad request', message: 'classId must be a positive integer' });
		}

		// Check ownership
		const [targetClass] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
		if (!targetClass) {
			return res.status(404).json({ error: 'Not found', message: 'Class not found' });
		}
		if (req.user!.role !== 'admin' && targetClass.teacherId !== req.user!.id) {
			return res.status(403).json({ error: 'Forbidden', message: 'You can only create attendance sessions for your own classes' });
		}

		const { title, date } = req.body ?? {};

		if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 255) {
			return res.status(400).json({ error: 'Bad request', message: 'title is required and must be at most 255 characters' });
		}

		if (!date || typeof date !== 'string' || isNaN(Date.parse(date))) {
			return res.status(400).json({ error: 'Bad request', message: 'date must be a valid date string (YYYY-MM-DD)' });
		}

		const [session] = await db
			.insert(attendanceSessions)
			.values({ classId, title: title.trim(), date })
			.returning();

		res.status(201).json({ data: session });
	} catch (e) {
		console.error(`POST /:classId/attendance error:`, e);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Get a session detail with all attendance records
router.get('/:classId/attendance/:sessionId', requireRole(), async (req, res) => {
	try {
		const classId = Number(req.params.classId);
		const sessionId = Number(req.params.sessionId);

		if (!Number.isInteger(classId) || classId < 1) {
			return res.status(400).json({ error: 'Bad request', message: 'classId must be a positive integer' });
		}
		if (!Number.isInteger(sessionId) || sessionId < 1) {
			return res.status(400).json({ error: 'Bad request', message: 'sessionId must be a positive integer' });
		}

		const [session] = await db
			.select()
			.from(attendanceSessions)
			.where(and(eq(attendanceSessions.id, sessionId), eq(attendanceSessions.classId, classId)))
			.limit(1);

		if (!session) {
			return res.status(404).json({ error: 'Not found', message: 'Session not found' });
		}

		// All enrolled students for the class
		const enrolledStudents = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
			})
			.from(enrollments)
			.innerJoin(user, eq(user.id, enrollments.studentId))
			.where(eq(enrollments.classId, classId));

		// All records for this session
		const records = await db
			.select()
			.from(attendanceRecords)
			.where(eq(attendanceRecords.sessionId, sessionId));

		const recordsByStudent = new Map(records.map(r => [r.studentId, r]));

		const studentsWithStatus = enrolledStudents.map(student => ({
			...student,
			status: recordsByStudent.get(student.id)?.status ?? null,
			recordId: recordsByStudent.get(student.id)?.id ?? null,
		}));

		res.status(200).json({ data: { session, students: studentsWithStatus } });
	} catch (e) {
		console.error(`GET /:classId/attendance/:sessionId error:`, e);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Mark/update attendance for enrolled students (teacher only)
router.post('/:classId/attendance/:sessionId/mark', requireRole('teacher', 'admin'), async (req, res) => {
	try {
		const classId = Number(req.params.classId);
		const sessionId = Number(req.params.sessionId);

		if (!Number.isInteger(classId) || classId < 1) {
			return res.status(400).json({ error: 'Bad request', message: 'classId must be a positive integer' });
		}
		if (!Number.isInteger(sessionId) || sessionId < 1) {
			return res.status(400).json({ error: 'Bad request', message: 'sessionId must be a positive integer' });
		}

		// Check ownership
		const [targetClass] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
		if (!targetClass) {
			return res.status(404).json({ error: 'Not found', message: 'Class not found' });
		}
		if (req.user!.role !== 'admin' && targetClass.teacherId !== req.user!.id) {
			return res.status(403).json({ error: 'Forbidden', message: 'You can only mark attendance for your own classes' });
		}

		const [session] = await db
			.select()
			.from(attendanceSessions)
			.where(and(eq(attendanceSessions.id, sessionId), eq(attendanceSessions.classId, classId)))
			.limit(1);

		if (!session) {
			return res.status(404).json({ error: 'Not found', message: 'Session not found' });
		}

		// Body: { records: [{ studentId: string, status: 'present'|'absent'|'late' }] }
		const { records } = req.body ?? {};
		if (!Array.isArray(records) || records.length === 0) {
			return res.status(400).json({ error: 'Bad request', message: 'records must be a non-empty array' });
		}

		const validStatuses: AttendanceStatus[] = ['present', 'absent', 'late'];
		for (const r of records as { studentId?: unknown; status?: unknown }[]) {
			if (typeof r.studentId !== 'string' || !r.studentId) {
				return res.status(400).json({ error: 'Bad request', message: 'Each record must have a valid studentId' });
			}
			if (!validStatuses.includes(r.status as AttendanceStatus)) {
				return res.status(400).json({ error: 'Bad request', message: `status must be one of: ${validStatuses.join(', ')}` });
			}
		}

		// Upsert each record
		for (const record of records as { studentId: string; status: AttendanceStatus }[]) {
			await db
				.insert(attendanceRecords)
				.values({
					sessionId,
					studentId: record.studentId,
					status: record.status,
					markedAt: new Date()
				})
				.onConflictDoUpdate({
					target: [attendanceRecords.sessionId, attendanceRecords.studentId],
					set: {
						status: record.status,
						markedAt: new Date()
					}
				});
		}

		res.status(200).json({ message: 'Attendance marked successfully' });
	} catch (e) {
		console.error(`POST /:classId/attendance/:sessionId/mark error:`, e);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Get a student's own attendance summary across all their enrolled classes
router.get('/my-attendance', requireRole('student'), async (req, res) => {
	try {
		const studentId = req.user!.id;

		const enrolledClasses = await db
			.select({ classId: enrollments.classId })
			.from(enrollments)
			.where(eq(enrollments.studentId, studentId));

		if (enrolledClasses.length === 0) {
			return res.status(200).json({ data: [] });
		}

		const classIds = enrolledClasses.map(e => e.classId);

		const summaries = await Promise.all(classIds.map(async (classId) => {
			const [cls] = await db.select({ name: classes.name }).from(classes).where(eq(classes.id, classId)).limit(1);
			const sessions = await db.select().from(attendanceSessions).where(eq(attendanceSessions.classId, classId));
			const sessionIds = sessions.map(s => s.id);
			if (sessionIds.length === 0) {
				return { classId, className: cls?.name ?? '', totalSessions: 0, present: 0, absent: 0, late: 0 };
			}
			const records = await db
				.select()
				.from(attendanceRecords)
				.where(and(
					eq(attendanceRecords.studentId, studentId),
					sql`${attendanceRecords.sessionId} = ANY(${sql.raw(`ARRAY[${sessionIds.join(',')}]`)})`
				));
			const present = records.filter(r => r.status === 'present').length;
			const absent = records.filter(r => r.status === 'absent').length;
			const late = records.filter(r => r.status === 'late').length;
			return { classId, className: cls?.name ?? '', totalSessions: sessions.length, present, absent, late };
		}));

		res.status(200).json({ data: summaries });
	} catch (e) {
		console.error(`GET /my-attendance error:`, e);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
