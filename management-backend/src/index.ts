import "apminsight";
import { config, parse } from "dotenv";
import express from "express";
import cors from "cors";

import subjectRouter from "./routes/subject.js";
import classRouter from "./routes/classes.js";
import userRouter from "./routes/users.js";
import quizRouter, { quizRouter as quizDetailRouter } from "./routes/quizzes.js";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import securityMiddleware from "./middleware/security.js";
import sessionMiddleware from "./middleware/session.js";
import { auth } from "./lib/auth.js";
import { toNodeHandler } from "better-auth/node";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));

if (existsSync(envPath)) {
	const parsed = parse(readFileSync(envPath));
	if (parsed.FRONTEND_URL) {
		process.env.FRONTEND_URL = parsed.FRONTEND_URL;
	}
}

config({ path: envPath, override: true });

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const authHandler = toNodeHandler(auth);

// behind the nginx reverse proxy (docker-compose "proxy" service) so req.ip
// resolves to the real client from X-Forwarded-For (used by Arcjet)
app.set("trust proxy", true);

// CORS configuration to allow requests from the frontend
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

app.use(cors({
	origin: (origin, callback) => {
		// allow non-browser clients (no Origin header) and the configured frontend
		if (!origin || origin === frontendUrl) {
			callback(null, true);
			return;
		}
		// in development also allow any localhost/127.0.0.1 port (vite may pick e.g. 5174)
		const isLocalDev = process.env.NODE_ENV !== "production"
			&& /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
		callback(null, isLocalDev);
	},
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
	credentials: true
}))

app.use('/api/auth', authHandler);

app.use(express.json());
app.use(sessionMiddleware);
app.use(securityMiddleware);
app.use("/api/subjects", subjectRouter);
app.use("/api/classes", classRouter);
app.use("/api/classes", quizRouter);
app.use("/api/quizzes", quizDetailRouter);
app.use("/api/users", userRouter);

app.get("/", (_req, res) => {
	res.json({ message: "Server is running" });
});

app.listen(PORT, () => {
	const url = `http://localhost:${PORT}`;
	console.log(`Server started at ${url}`);
});
