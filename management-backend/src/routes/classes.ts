import express from 'express';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import { classes, subjects, user } from '../db/schema/index.js';
import type { ClassSchedule } from '../db/schema/index.js';
import db from '../db/index.js';

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

router.post('/', async (req, res) => {
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
        if(typeof e === 'object' && e !== null && 'code' in e && String((e as { code: unknown }).code).startsWith('23')){
            console.error(`POST /classes constraint error: ${e}`);
            return res.status(400).json({ error: 'Bad request', message: 'Invalid subjectId, teacherId or status' });
        }
        console.error(`POST /classes error: ${e}`);
        res.status(500).json({ error: 'Internal server error' });
    }
})

export default router;