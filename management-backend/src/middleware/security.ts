import type { NextFunction, Response, Request } from "express";
import aj from "../config/arcjet.js";
import { ArcjetNodeRequest, slidingWindow } from "@arcjet/node";

type RateLimitRole = "admin" | "teacher" | "student" | "guest";
type RequestWithUser = Request & {
    user?: {
        role?: Exclude<RateLimitRole, "guest">;
    };
};

const rateLimitClients = {
    admin: aj.withRule(
        slidingWindow({
            mode: "LIVE",
            interval: '1m',
            max: 20,
        })
    ),
    teacher: aj.withRule(
        slidingWindow({
            mode: "LIVE",
            interval: '1m',
            max: 10,
        })
    ),
    student: aj.withRule(
        slidingWindow({
            mode: "LIVE",
            interval: '1m',
            max: 10,
        })
    ),
    guest: aj.withRule(
        slidingWindow({
            mode: "LIVE",
            interval: '1m',
            max: 5,
        })
    )
} as const;

const rateLimitMessages: Record<RateLimitRole, string> = {
    admin: "Admin rate limit exceeded",
    teacher: "Teacher rate limit exceeded",
    student: "Student rate limit exceeded",
    guest: "Guest rate limit exceeded",
};



const securityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if(process.env.NODE_ENV === 'test') {
        return next();
    }
    try{
        const role: RateLimitRole = (req as RequestWithUser).user?.role ?? 'guest';

        const client = rateLimitClients[role];
        const rateLimitMessage = rateLimitMessages[role];

        const decision = await client.protect(req as ArcjetNodeRequest);

        if (process.env.ARCJET_DEBUG === "true") {
            console.log("Arcjet decision:", {
                ip: req.ip,
                method: req.method,
                url: req.originalUrl,
                conclusion: decision.conclusion,
            });
        }


        if(decision.isDenied() && decision.reason.isBot()){
            return res.status(403).json({ error: 'Forbidden', message: "Bot traffic is not allowed" });
        }


        if(decision.isDenied() && decision.reason.isShield()){
            return res.status(403).json({ error: 'Forbidden', message: "Shield protection triggered" });
        }

        if(decision.isDenied() && decision.reason.isRateLimit()){
            return res.status(403).json({ error: 'Forbidden', message: rateLimitMessage });
        }

        next();

    } catch(e){
        console.error("Security middleware error:", e);
        return res.status(500).json({ error: 'Internal error',message: "Internal Server Error" });
    }
}

export default securityMiddleware;