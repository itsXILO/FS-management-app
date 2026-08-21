import { and, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
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
        
        const totalCount = countResult[0]?.count ?? 0;

        const subjectList = await db
        .select({
             ...getTableColumns(subjects),
            department: { ...getTableColumns(departments) }
          }).from(subjects)
          .leftJoin(departments, eq(subjects.departmentId, departments.id))
          .where(whereCondition)
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

export default router;