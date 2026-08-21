namespace Express {
	interface Request {
		user?: {
			id: string;
			name: string;
			email: string;
			role: "admin" | "teacher" | "student";
		};
	}
}
