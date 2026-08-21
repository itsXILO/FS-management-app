import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import { departments, subjects } from '../db/schema/index.js';
import express from 'express';
import db from '../db/index.js';

const router = express.Router();

// get all subjects with pagination, sorting and filtering
router.get('/', async (req, res) => {
    try{
        const { search, department, page=1, limit=10 } =req.query;

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        //If search query exists, filter by subject name OR subject code
        if(search){
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`)
                )
            );
        }
        //If department filter exists, filter by department id
        if(department){
            filterConditions.push(ilike(departments.name, `%${department}%`));
        }

        //combine all filter conditions using AND
        const whereCondition = filterConditions.length > 0 ? and(...filterConditions) : undefined;
        const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(subjects)
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(whereCondition);

        const totalCount = Number(countResult[0]?.count ?? 0);

        const subjectList = await db
        .select({
             ...getTableColumns(subjects),
            department: { ...getTableColumns(departments) }
          }).from(subjects)
          .leftJoin(departments, eq(subjects.departmentId, departments.id))
          .where(whereCondition)
          .orderBy(desc(subjects.id))
          .offset(offset)
          .limit(limitPerPage);

          res.status(200).json({
            data: subjectList,
            pagination: {
                total: totalCount,
                page: currentPage,
                limit: limitPerPage,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
          });

    }catch(e){
        console.error(`GET /subjects error: ${e}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// create a new subject
router.post('/', async (req, res) => {
    try{
        const { name, code, description, department } = req.body ?? {};

        if(!name || !code || !department){
            return res.status(400).json({ error: 'Bad request', message: 'name, code and department are required' });
        }

        if(typeof name !== 'string' || name.length > 255){
            return res.status(400).json({ error: 'Bad request', message: 'name must be a string of at most 255 characters' });
        }

        if(typeof code !== 'string' || code.length < 5 || code.length > 10){
            return res.status(400).json({ error: 'Bad request', message: 'code must be a string of 5-10 characters' });
        }

        if(description !== undefined && (typeof description !== 'string' || description.length > 255)){
            return res.status(400).json({ error: 'Bad request', message: 'description must be a string of at most 255 characters' });
        }

        // resolve department by name (case-insensitive), create it if it does not exist yet
        let [dept] = await db
            .select()
            .from(departments)
            .where(ilike(departments.name, department))
            .limit(1);

        if(!dept){
            const generatedCode = `${department.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 7)}-${Date.now().toString(36).slice(-2)}`.slice(0, 10);
            [ dept ] = await db
                .insert(departments)
                .values({ name: department, code: generatedCode })
                .returning();
        }

        if(!dept){
            return res.status(500).json({ error: 'Internal server error', message: 'Failed to resolve department' });
        }

        const [ createdSubject ] = await db
            .insert(subjects)
            .values({
                name,
                code,
                description: description ?? null,
                departmentId: dept.id
            })
            .returning();

        res.status(201).json({ data: { ...createdSubject, department: dept } });
    }catch(e){
        console.error(`POST /subjects error: ${e}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;