import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";

const sessionMiddleware = async (
	req: Request,
	_res: Response,
	next: NextFunction,
) => {
	try {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(req.headers),
		});

		if (session?.user) {
			req.user = {
				id: session.user.id,
				name: session.user.name,
				email: session.user.email,
				role: (session.user.role as "admin" | "teacher" | "student") ?? "student",
			};
		}
	} catch (e) {
		console.error("Session middleware error:", e);
	}

	next();
};

export default sessionMiddleware;
