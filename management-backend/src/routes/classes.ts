import express from 'express';
import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import { classes, subjects, user } from '../db/schema/index.js';
import db from '../db/index.js';

const router = express .Router();

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

        const totalCount = countResult[0]?.count ?? 0;

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
        const { name, teacherId, subjectId, capacity, description, status, bannerUrl, bannerCldPubId } = req.body;

        const [ createdClass ] = await db
        .insert(classes)
        .values({...req.body, inviteCode: Math.random().toString(36).substring(2, 9), schedules: []}) 
        .returning({id: classes.id});

        if(!createdClass){
            throw Error;
        }
        res.status(201).json(createdClass);
    } catch(e){
        console.error(`POST /classes error: ${e}`);
        res.status(500).json({ error: 'Internal server error' });
    }
})

export default router;