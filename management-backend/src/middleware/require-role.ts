import type { NextFunction, Request, Response } from "express";

type Role = "admin" | "teacher" | "student";

const requireRole =
	(...roles: Role[]) =>
	(req: Request, res: Response, next: NextFunction) => {
		if (!req.user) {
			return res.status(401).json({
				error: "Unauthorized",
				message: "You must be signed in to do that",
			});
		}

		if (!roles.includes(req.user.role)) {
			return res.status(403).json({
				error: "Forbidden",
				message: `This action requires the ${roles.join(" or ")} role`,
			});
		}

		next();
	};

export default requireRole;
