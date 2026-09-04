import express from 'express';
import { and, asc, eq } from 'drizzle-orm';
import db from '../db/index.js';
import requireRole from '../middleware/require-role.js';
import {
	classes,
	enrollments,
	questionOptions,
	questions,
	quizAnswers,
	quizAttempts,
	quizzes,
} from '../db/schema/index.js';

const router = express.Router();

// Start a quiz attempt (student only, must be enrolled in the class)
router.post('/:quizId/attempt/start', requireRole('student'), async (req, res) => {
	try {
		const quizId = Number(req.params.quizId);
		if (!Number.isInteger(quizId) || quizId < 1) {
			return res.status(400).json({ error: 'Bad request', message: 'quizId must be a positive integer' });
		}

		const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
		if (!quiz) {
			return res.status(404).json({ error: 'Not found', message: 'Quiz not found' });
		}

		// Check deadline
		if (new Date(quiz.deadline).getTime() <= Date.now()) {
			return res.status(400).json({ error: 'Bad request', message: 'This quiz is closed (deadline has passed)' });
		}

		// Check enrollment
		const studentId = req.user!.id;
		const [enrollment] = await db
			.select()
			.from(enrollments)
			.where(and(eq(enrollments.classId, quiz.classId), eq(enrollments.studentId, studentId)))
			.limit(1);
		if (!enrollment) {
			return res.status(403).json({ error: 'Forbidden', message: 'You are not enrolled in this class' });
		}

		// One attempt per student per quiz
		const [existing] = await db
			.select()
			.from(quizAttempts)
			.where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.studentId, studentId)))
			.limit(1);
		if (existing) {
			return res.status(409).json({
				error: 'Conflict',
				message: 'You have already started this quiz',
				data: { attemptId: existing.id, submittedAt: existing.submittedAt }
			});
		}

		// Get questions + options (no isCorrect for student)
		const quizQuestions = await db
			.select()
			.from(questions)
			.where(eq(questions.quizId, quizId))
			.orderBy(asc(questions.position), asc(questions.id));

		const questionsWithOptions = await Promise.all(
			quizQuestions.map(async (q) => {
				const opts = await db
					.select({
						id: questionOptions.id,
						optionText: questionOptions.optionText,
						position: questionOptions.position,
					})
					.from(questionOptions)
					.where(eq(questionOptions.questionId, q.id))
					.orderBy(asc(questionOptions.position), asc(questionOptions.id));
				return { ...q, options: opts };
			})
		);

		// Create attempt record
		const [attempt] = await db
			.insert(quizAttempts)
			.values({
				quizId,
				studentId,
				startedAt: new Date(),
				totalQuestions: quizQuestions.length,
			})
			.returning();

		res.status(201).json({
			data: {
				attemptId: attempt!.id,
				quiz: {
					id: quiz.id,
					title: quiz.title,
					description: quiz.description,
					durationMinutes: quiz.durationMinutes,
					deadline: quiz.deadline,
				},
				questions: questionsWithOptions,
			}
		});
	} catch (e) {
		console.error(`POST /:quizId/attempt/start error:`, e);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Submit answers for an attempt
router.post('/:quizId/attempt/submit', requireRole('student'), async (req, res) => {
	try {
		const quizId = Number(req.params.quizId);
		if (!Number.isInteger(quizId) || quizId < 1) {
			return res.status(400).json({ error: 'Bad request', message: 'quizId must be a positive integer' });
		}

		const studentId = req.user!.id;

		const [attempt] = await db
			.select()
			.from(quizAttempts)
			.where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.studentId, studentId)))
			.limit(1);

		if (!attempt) {
			return res.status(404).json({ error: 'Not found', message: 'No active attempt found. Start the quiz first.' });
		}
		if (attempt.submittedAt) {
			return res.status(409).json({ error: 'Conflict', message: 'You have already submitted this quiz' });
		}

		// answers: [{ questionId: number, selectedOptionId: number }]
		const { answers } = req.body ?? {};
		if (!Array.isArray(answers) || answers.length === 0) {
			return res.status(400).json({ error: 'Bad request', message: 'answers must be a non-empty array' });
		}

		let score = 0;
		const answerRows = [];

		for (const ans of answers as { questionId?: unknown; selectedOptionId?: unknown }[]) {
			const questionId = Number(ans.questionId);
			const selectedOptionId = Number(ans.selectedOptionId);

			if (!Number.isInteger(questionId) || questionId < 1 || !Number.isInteger(selectedOptionId) || selectedOptionId < 1) {
				return res.status(400).json({ error: 'Bad request', message: 'Each answer must have valid questionId and selectedOptionId' });
			}

			const [option] = await db
				.select({ isCorrect: questionOptions.isCorrect })
				.from(questionOptions)
				.where(eq(questionOptions.id, selectedOptionId))
				.limit(1);

			const isCorrect = option?.isCorrect ?? false;
			if (isCorrect) score++;

			answerRows.push({ attemptId: attempt.id, questionId, selectedOptionId, isCorrect });
		}

		if (answerRows.length > 0) {
			await db.insert(quizAnswers).values(answerRows);
		}

		// Update attempt with score and submittedAt
		await db
			.update(quizAttempts)
			.set({ submittedAt: new Date(), score })
			.where(eq(quizAttempts.id, attempt.id));

		res.status(200).json({
			data: {
				score,
				totalQuestions: attempt.totalQuestions,
				percentage: attempt.totalQuestions > 0
					? Math.round((score / attempt.totalQuestions) * 100)
					: 0,
			}
		});
	} catch (e) {
		console.error(`POST /:quizId/attempt/submit error:`, e);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Get result of own attempt
router.get('/:quizId/attempt/result', requireRole('student'), async (req, res) => {
	try {
		const quizId = Number(req.params.quizId);
		if (!Number.isInteger(quizId) || quizId < 1) {
			return res.status(400).json({ error: 'Bad request', message: 'quizId must be a positive integer' });
		}

		const studentId = req.user!.id;

		const [attempt] = await db
			.select()
			.from(quizAttempts)
			.where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.studentId, studentId)))
			.limit(1);

		if (!attempt) {
			return res.status(404).json({ error: 'Not found', message: 'No attempt found for this quiz' });
		}

		const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);

		// Get the class info for navigation
		const [cls] = await db.select({ name: classes.name }).from(classes).where(eq(classes.id, quiz!.classId)).limit(1);

		// Get answers with correctness info
		const answers = await db
			.select({
				questionId: quizAnswers.questionId,
				selectedOptionId: quizAnswers.selectedOptionId,
				isCorrect: quizAnswers.isCorrect,
				questionText: questions.questionText,
				optionText: questionOptions.optionText,
			})
			.from(quizAnswers)
			.innerJoin(questions, eq(questions.id, quizAnswers.questionId))
			.innerJoin(questionOptions, eq(questionOptions.id, quizAnswers.selectedOptionId))
			.where(eq(quizAnswers.attemptId, attempt.id));

		res.status(200).json({
			data: {
				attempt: {
					id: attempt.id,
					startedAt: attempt.startedAt,
					submittedAt: attempt.submittedAt,
					score: attempt.score,
					totalQuestions: attempt.totalQuestions,
					percentage: attempt.totalQuestions && attempt.totalQuestions > 0
						? Math.round(((attempt.score ?? 0) / attempt.totalQuestions) * 100)
						: 0,
				},
				quiz: {
					id: quiz?.id,
					title: quiz?.title,
					classId: quiz?.classId,
					className: cls?.name,
				},
				answers,
			}
		});
	} catch (e) {
		console.error(`GET /:quizId/attempt/result error:`, e);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Teacher: get all attempts + scores for a quiz they own
router.get('/:quizId/attempts', requireRole('teacher', 'admin'), async (req, res) => {
	try {
		const quizId = Number(req.params.quizId);
		if (!Number.isInteger(quizId) || quizId < 1) {
			return res.status(400).json({ error: 'Bad request', message: 'quizId must be a positive integer' });
		}

		const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
		if (!quiz) {
			return res.status(404).json({ error: 'Not found', message: 'Quiz not found' });
		}

		const [cls] = await db.select().from(classes).where(eq(classes.id, quiz.classId)).limit(1);
		if (req.user!.role !== 'admin' && cls?.teacherId !== req.user!.id) {
			return res.status(403).json({ error: 'Forbidden', message: 'You can only view attempts for your own quizzes' });
		}

		const attempts = await db
			.select({
				id: quizAttempts.id,
				studentId: quizAttempts.studentId,
				startedAt: quizAttempts.startedAt,
				submittedAt: quizAttempts.submittedAt,
				score: quizAttempts.score,
				totalQuestions: quizAttempts.totalQuestions,
			})
			.from(quizAttempts)
			.where(eq(quizAttempts.quizId, quizId));

		res.status(200).json({ data: attempts });
	} catch (e) {
		console.error(`GET /:quizId/attempts error:`, e);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
