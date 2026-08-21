import AgentAPI from "apminsight";
AgentAPI.config()
import { config, parse } from "dotenv";
import express from "express";
import cors from "cors";

import subjectRouter from "./routes/subject.js";
import userRouter from "./routes/users.js";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import securityMiddleware from "./middleware/security.js";
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
const PORT = 4000;
const authHandler = toNodeHandler(auth);

// CORS configuration to allow requests from the frontend
app.use(cors({
	origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	credentials: true
}))

app.use('/api/auth', authHandler);

app.use(express.json());
app.use(securityMiddleware);
app.use("/api/subjects", subjectRouter);
app.use("/api/users", userRouter);

app.get("/", (_req, res) => {
	res.json({ message: "Server is running" });
});

app.listen(PORT, () => {
	const url = `http://localhost:${PORT}`;
	console.log(`Server started at ${url}`);
});
