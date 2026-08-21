import { asc, eq, sql } from 'drizzle-orm';
import express from 'express';
import db from '../db/index.js';
import requireRole from '../middleware/require-role.js';
import { classes, enrollments, questionOptions, questions, quizzes } from '../db/schema/index.js';

const router = express.Router();

type OptionInput = { optionText?: unknown; isCorrect?: unknown };
type QuestionInput = { questionText?: unknown; options?: unknown };
type QuizBody = {
    title?: unknown;
    description?: unknown;
    durationMinutes?: unknown;
    deadline?: unknown;
    questions?: unknown;
};

const badRequest = (res: express.Response, message: string) =>
    res.status(400).json({ error: 'Bad request', message });

// validate payload; returns a normalized quiz or an error message
const validateQuizPayload = (body: QuizBody): { ok: true; value: {
    title: string;
    description: string | null;
    durationMinutes: number;
    deadline: Date;
    questions: { questionText: string; position: number; options: { optionText: string; isCorrect: boolean; position: number }[] }[];
} } | { ok: false; message: string } => {
    const { title, description, durationMinutes, deadline, questions: rawQuestions } = body;

    if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 255) {
        return { ok: false, message: 'title is required and must be at most 255 characters' };
    }

    if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 1000)) {
        return { ok: false, message: 'description must be a string of at most 1000 characters' };
    }

    const parsedDuration = Number(durationMinutes);
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 600) {
        return { ok: false, message: 'durationMinutes must be an integer between 1 and 600' };
    }

    const parsedDeadline = new Date(String(deadline ?? ''));
    if (!deadline || Number.isNaN(parsedDeadline.getTime())) {
        return { ok: false, message: 'deadline must be a valid date' };
    }
    if (parsedDeadline.getTime() <= Date.now()) {
        return { ok: false, message: 'deadline must be in the future' };
    }

    if (!Array.isArray(rawQuestions) || rawQuestions.length < 1 || rawQuestions.length > 100) {
        return { ok: false, message: 'questions must be an array with at least 1 and at most 100 questions' };
    }

    const normalizedQuestions = [];

    for (const [qIndex, rawQuestion] of (rawQuestions as QuestionInput[]).entries()) {
        const questionText = rawQuestion.questionText;
        if (typeof questionText !== 'string' || questionText.trim().length === 0) {
            return { ok: false, message: `question ${qIndex + 1}: questionText is required` };
        }

        const rawOptions = rawQuestion.options;
        // min 2 options, max 4 options per question
        if (!Array.isArray(rawOptions) || rawOptions.length < 2 || rawOptions.length > 4) {
            return { ok: false, message: `question ${qIndex + 1}: provide between 2 and 4 options` };
        }

        const normalizedOptions = [];
        let correctCount = 0;

        for (const [oIndex, rawOption] of (rawOptions as OptionInput[]).entries()) {
            const optionText = rawOption.optionText;
            if (typeof optionText !== 'string' || optionText.trim().length === 0) {
                return { ok: false, message: `question ${qIndex + 1}, option ${oIndex + 1}: optionText is required` };
            }
            const isCorrect = rawOption.isCorrect === true;
            if (isCorrect) correctCount++;
            normalizedOptions.push({ optionText, isCorrect, position: oIndex });
        }

        if (correctCount < 1) {
            return { ok: false, message: `question ${qIndex + 1}: mark at least one option as correct` };
        }

        normalizedQuestions.push({
            questionText,
            position: qIndex,
            options: normalizedOptions
        });
    }

    return {
        ok: true,
        value: {
            title: title.trim(),
            description: typeof description === 'string' && description.length > 0 ? description : null,
            durationMinutes: parsedDuration,
            deadline: parsedDeadline,
            questions: normalizedQuestions
        }
    };
};

// create a quiz for a class (owning teacher only)
router.post('/:classId/quizzes', requireRole('teacher'), async (req, res) => {
    try {
        const classId = Number(req.params.classId);
        if (!Number.isInteger(classId) || classId < 1) {
            return badRequest(res, 'classId must be a positive integer');
        }

        const [ targetClass ] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
        if (!targetClass) {
            return res.status(404).json({ error: 'Not found', message: 'Class not found' });
        }
        if (targetClass.teacherId !== req.user!.id) {
            return res.status(403).json({ error: 'Forbidden', message: 'You can only create quizzes for your own classes' });
        }

        const validation = validateQuizPayload(req.body ?? {});
        if (!validation.ok) {
            return badRequest(res, validation.message);
        }
        const { title, description, durationMinutes, deadline, questions: validatedQuestions } = validation.value;

        // neon-http driver does not support transactions, so insert sequentially
        // and clean up the quiz (cascade deletes questions/options) on failure
        let quizId: number | undefined;
        try {
            const [ quiz ] = await db
                .insert(quizzes)
                .values({ classId, title, description, durationMinutes, deadline })
                .returning({ id: quizzes.id });

            if (!quiz) throw new Error('Failed to create quiz');
            quizId = quiz.id;

            for (const question of validatedQuestions) {
                const [ insertedQuestion ] = await db
                    .insert(questions)
                    .values({ quizId: quiz.id, questionText: question.questionText, position: question.position })
                    .returning({ id: questions.id });

                if (!insertedQuestion) throw new Error('Failed to create question');

                await db.insert(questionOptions).values(
                    question.options.map((option) => ({
                        questionId: insertedQuestion.id,
                        optionText: option.optionText,
                        isCorrect: option.isCorrect,
                        position: option.position
                    }))
                );
            }

            res.status(201).json({ data: { id: quiz.id } });
        } catch (insertError) {
            if (quizId !== undefined) {
                await db.delete(quizzes).where(eq(quizzes.id, quizId)).catch(() => undefined);
            }
            throw insertError;
        }
    } catch (e) {
        console.error(`POST /classes/:classId/quizzes error: ${e}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// list quizzes for a class (any signed-in user)
router.get('/:classId/quizzes', requireRole(), async (req, res) => {
    try {
        const classId = Number(req.params.classId);
        if (!Number.isInteger(classId) || classId < 1) {
            return badRequest(res, 'classId must be a positive integer');
        }

        const quizList = await db
            .select({
                id: quizzes.id,
                title: quizzes.title,
                description: quizzes.description,
                durationMinutes: quizzes.durationMinutes,
                deadline: quizzes.deadline,
                createdAt: quizzes.createdAt,
                questionCount: sql<number>`count(${questions.id})`
            })
            .from(quizzes)
            .leftJoin(questions, eq(questions.quizId, quizzes.id))
            .where(eq(quizzes.classId, classId))
            .groupBy(quizzes.id)
            .orderBy(asc(quizzes.id));

        res.status(200).json({
            data: quizList.map((quiz) => ({ ...quiz, questionCount: Number(quiz.questionCount) }))
        });
    } catch (e) {
        console.error(`GET /classes/:classId/quizzes error: ${e}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// quiz detail / delete (nested under /quizzes)
const quizRouter = express.Router();

// list all quizzes visible to the current user:
// teachers -> quizzes of their own classes, students -> quizzes of enrolled classes, admin -> all
quizRouter.get('/', requireRole(), async (req, res) => {
    try {
        const role = req.user!.role;

        let query = db
            .select({
                id: quizzes.id,
                classId: quizzes.classId,
                className: classes.name,
                title: quizzes.title,
                description: quizzes.description,
                durationMinutes: quizzes.durationMinutes,
                deadline: quizzes.deadline,
                createdAt: quizzes.createdAt,
                questionCount: sql<number>`count(${questions.id})`
            })
            .from(quizzes)
            .innerJoin(classes, eq(classes.id, quizzes.classId))
            .leftJoin(questions, eq(questions.quizId, quizzes.id))
            .$dynamic();

        if (role === 'teacher') {
            query = query.where(eq(classes.teacherId, req.user!.id));
        } else if (role === 'student') {
            query = query.innerJoin(
                enrollments,
                sql`${enrollments.classId} = ${quizzes.classId} and ${enrollments.studentId} = ${req.user!.id}`
            );
        }

        const quizList = await query.groupBy(quizzes.id, classes.name).orderBy(asc(quizzes.deadline));

        res.status(200).json({
            data: quizList.map((quiz) => ({ ...quiz, questionCount: Number(quiz.questionCount) }))
        });
    } catch (e) {
        console.error(`GET /quizzes error: ${e}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// full quiz with questions and options (answer key hidden from non-owners)
quizRouter.get('/:quizId', requireRole(), async (req, res) => {
    try {
        const quizId = Number(req.params.quizId);
        if (!Number.isInteger(quizId) || quizId < 1) {
            return badRequest(res, 'quizId must be a positive integer');
        }

        const [ quiz ] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
        if (!quiz) {
            return res.status(404).json({ error: 'Not found', message: 'Quiz not found' });
        }

        const [ parentClass ] = await db.select().from(classes).where(eq(classes.id, quiz.classId)).limit(1);
        const isOwner = req.user!.role === 'teacher' && parentClass?.teacherId === req.user!.id;

        const quizQuestions = await db
            .select()
            .from(questions)
            .where(eq(questions.quizId, quizId))
            .orderBy(asc(questions.position), asc(questions.id));

        const questionsWithOptions = await Promise.all(
            quizQuestions.map(async (question) => {
                const options = await db
                    .select({
                        id: questionOptions.id,
                        optionText: questionOptions.optionText,
                        position: questionOptions.position,
                        ...(isOwner ? { isCorrect: questionOptions.isCorrect } : {})
                    })
                    .from(questionOptions)
                    .where(eq(questionOptions.questionId, question.id))
                    .orderBy(asc(questionOptions.position), asc(questionOptions.id));

                return { ...question, options };
            })
        );

        res.status(200).json({ data: { ...quiz, isOwner, questions: questionsWithOptions } });
    } catch (e) {
        console.error(`GET /quizzes/:quizId error: ${e}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// delete a quiz (owning teacher only)
quizRouter.delete('/:quizId', requireRole('teacher'), async (req, res) => {
    try {
        const quizId = Number(req.params.quizId);
        if (!Number.isInteger(quizId) || quizId < 1) {
            return badRequest(res, 'quizId must be a positive integer');
        }

        const [ quiz ] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
        if (!quiz) {
            return res.status(404).json({ error: 'Not found', message: 'Quiz not found' });
        }

        const [ parentClass ] = await db.select().from(classes).where(eq(classes.id, quiz.classId)).limit(1);
        if (parentClass?.teacherId !== req.user!.id) {
            return res.status(403).json({ error: 'Forbidden', message: 'You can only delete quizzes for your own classes' });
        }

        await db.delete(quizzes).where(eq(quizzes.id, quizId));
        res.status(204).send();
    } catch (e) {
        console.error(`DELETE /quizzes/:quizId error: ${e}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
export { quizRouter };
