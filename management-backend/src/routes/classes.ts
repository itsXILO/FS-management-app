import express from 'express';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import { classes, subjects, user, enrollments } from '../db/schema/index.js';
import type { ClassSchedule } from '../db/schema/index.js';
import db from '../db/index.js';
import requireRole from '../middleware/require-role.js';

const router = express.Router();

const generateInviteCode = () => randomBytes(6).toString('hex');

// get all classes with pagination, sorting and filtering
router.get('/', async (req, res) => {
    try{
        const { search, subject, teacher, page=1, limit=10 } = req.query;

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        //If search query exists, filter by class name OR invite code
        if(search){
            filterConditions.push(
                or(
                    ilike(classes.name, `%${search}%`),
                    ilike(classes.inviteCode, `%${search}%`)
                )
            );
        }

        //If subject filter exists, filter by subject name
        if(subject){
            filterConditions.push(ilike(subjects.name, `%${subject}%`));
        }

        //If teacher filter exists, filter by teacher name
        if(teacher){
            filterConditions.push(ilike(user.name, `%${teacher}%`));
        }

        //combine all filter conditions using AND
        const whereCondition = filterConditions.length > 0 ? and(...filterConditions) : undefined;
        const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(classes)
        .leftJoin(subjects, eq(classes.subjectId, subjects.id))
        .leftJoin(user, eq(classes.teacherId, user.id))
        .where(whereCondition);

        const totalCount = Number(countResult[0]?.count ?? 0);

        const classList = await db
        .select({
            ...getTableColumns(classes),
            subject: { ...getTableColumns(subjects) },
            teacher: { ...getTableColumns(user) }
        })
        .from(classes)
        .leftJoin(subjects, eq(classes.subjectId, subjects.id))
        .leftJoin(user, eq(classes.teacherId, user.id))
        .where(whereCondition)
        .orderBy(desc(classes.createdAt))
        .offset(offset)
        .limit(limitPerPage);

        res.status(200).json({
            data: classList,
            pagination: {
                total: totalCount,
                page: currentPage,
                limit: limitPerPage,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });

    }catch(e){
        console.error(`GET /classes error: ${e}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', requireRole('teacher'), async (req, res) => {
    try{
        const { name, teacherId, subjectId, capacity, description, status, bannerUrl, bannerCldPubId, schedules } = req.body ?? {};

        if(!name || typeof name !== 'string' || name.length > 255){
            return res.status(400).json({ error: 'Bad request', message: 'name is required and must be a string of at most 255 characters' });
        }

        if(!teacherId || typeof teacherId !== 'string'){
            return res.status(400).json({ error: 'Bad request', message: 'teacherId is required' });
        }

        const parsedSubjectId = Number(subjectId);
        if(!Number.isInteger(parsedSubjectId) || parsedSubjectId < 1){
            return res.status(400).json({ error: 'Bad request', message: 'subjectId must be a positive integer' });
        }

        const parsedCapacity = Number(capacity);
        if(!Number.isInteger(parsedCapacity) || parsedCapacity < 1){
            return res.status(400).json({ error: 'Bad request', message: 'capacity must be a positive integer' });
        }

        if(status !== undefined && !['active', 'inactive', 'archived'].includes(status)){
            return res.status(400).json({ error: 'Bad request', message: 'status must be one of active, inactive or archived' });
        }

        if(schedules !== undefined && !Array.isArray(schedules)){
            return res.status(400).json({ error: 'Bad request', message: 'schedules must be an array' });
        }

        const [ createdClass ] = await db
            .insert(classes)
            .values({
                name,
                teacherId,
                subjectId: parsedSubjectId,
                capacity: parsedCapacity,
                description: description ?? null,
                status: status ?? 'active',
                bannerUrl: bannerUrl ?? null,
                bannerCldPubId: bannerCldPubId ?? null,
                inviteCode: generateInviteCode(),
                schedules: (schedules ?? []) as ClassSchedule[]
            })
            .returning({ id: classes.id });

        if(!createdClass){
            throw Error;
        }
        res.status(201).json({ data: createdClass });
    } catch(e){
        // Postgres foreign key / check violations -> bad request instead of 500
        // (drizzle wraps driver errors, so the code may sit on e.cause)
        const pgCode = (e: unknown): string | undefined => {
            if (typeof e === 'object' && e !== null) {
                if ('code' in e) return String((e as { code: unknown }).code);
                if ('cause' in e) return pgCode((e as { cause: unknown }).cause);
            }
            return undefined;
        };

        if (pgCode(e)?.startsWith('23')) {
            console.error(`POST /classes constraint error: ${e}`);
            return res.status(400).json({ error: 'Bad request', message: 'Invalid subjectId, teacherId or status' });
        }
        console.error(`POST /classes error: ${e}`);
        res.status(500).json({ error: 'Internal server error' });
    }
})

// Enroll current user in a class using the invite code
router.post('/:classId/enroll', requireRole(), async (req, res) => {
    try {
        const classId = Number(req.params.classId);
        if (!Number.isInteger(classId) || classId < 1) {
            return res.status(400).json({ error: 'Bad request', message: 'classId must be a positive integer' });
        }

        const { inviteCode } = req.body ?? {};
        if (!inviteCode || typeof inviteCode !== 'string') {
            return res.status(400).json({ error: 'Bad request', message: 'inviteCode is required' });
        }

        const [cls] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
        if (!cls) return res.status(404).json({ error: 'Not found', message: 'Class not found' });
        if (cls.inviteCode !== inviteCode.trim()) {
            return res.status(403).json({ error: 'Forbidden', message: 'Invalid invite code' });
        }

        const studentId = req.user!.id;
        const [existing] = await db
            .select()
            .from(enrollments)
            .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)))
            .limit(1);
        if (existing) return res.status(409).json({ error: 'Conflict', message: 'Already enrolled in this class' });

        const [enrollment] = await db
            .insert(enrollments)
            .values({ classId, studentId })
            .returning();

        res.status(201).json({ data: enrollment });
    } catch (e) {
        console.error(`POST /classes/:classId/enroll error:`, e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin/teacher: directly add a student to a class (useful for seeding/admin tools)
router.post('/:classId/students', requireRole('teacher', 'admin'), async (req, res) => {
    try {
        const classId = Number(req.params.classId);
        if (!Number.isInteger(classId) || classId < 1) {
            return res.status(400).json({ error: 'Bad request', message: 'classId must be a positive integer' });
        }

        const { studentId } = req.body ?? {};
        if (!studentId || typeof studentId !== 'string') {
            return res.status(400).json({ error: 'Bad request', message: 'studentId is required' });
        }

        const [cls] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
        if (!cls) return res.status(404).json({ error: 'Not found', message: 'Class not found' });

        if (req.user!.role !== 'admin' && cls.teacherId !== req.user!.id) {
            return res.status(403).json({ error: 'Forbidden', message: 'You can only add students to your own classes' });
        }

        const [existing] = await db
            .select()
            .from(enrollments)
            .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)))
            .limit(1);
        if (existing) return res.status(409).json({ error: 'Conflict', message: 'Student already enrolled' });

        const [enrollment] = await db
            .insert(enrollments)
            .values({ classId, studentId })
            .returning();

        res.status(201).json({ data: enrollment });
    } catch (e) {
        console.error(`POST /classes/:classId/students error:`, e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;