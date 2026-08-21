import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import { user } from '../db/schema/index.js';
import express from 'express';
import db from '../db/index.js';

const router = express.Router();

// get all users with pagination, sorting and filtering
router.get('/', async (req, res) => {
    try{
        const { search, role, page=1, limit=10 } = req.query;

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        //If search query exists, filter by user name OR user email
        if(search){
            filterConditions.push(
                or(
                    ilike(user.name, `%${search}%`),
                    ilike(user.email, `%${search}%`)
                )
            );
        }

        //If role filter exists, filter by exact role
        if(role){
            filterConditions.push(eq(user.role, `${role}` as 'student' | 'teacher' | 'admin'));
        }

        //combine all filter conditions using AND
        const whereCondition = filterConditions.length > 0 ? and(...filterConditions) : undefined;
        const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(user)
        .where(whereCondition);

        const totalCount = countResult[0]?.count ?? 0;

        const usersList = await db
        .select({
            ...getTableColumns(user)
        })
        .from(user)
        .where(whereCondition)
        .orderBy(desc(user.createdAt))
        .offset(offset)
        .limit(limitPerPage);

        res.status(200).json({
            data: usersList,
            pagination: {
                total: totalCount,
                page: currentPage,
                limit: limitPerPage,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });
    }catch(e){
        console.error(`GET /users error: ${e}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;