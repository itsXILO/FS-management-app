import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from "../db/schema/auth.js";

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
const envOrigins = frontendUrl.split(",").map((s) => s.trim()).filter(Boolean);

const trustedOrigins = Array.from(
    new Set([
        ...envOrigins,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
        "http://localhost:8080",
        "http://localhost",
        "http://127.0.0.1",
    ])
);

const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
    trustedOrigins,
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            role: {
                type: 'string', required: true, defaultValue: 'student',input: true,
            },
            imageCldPubId:{
                type: 'string', required: false, input: true,
            }
        }
    }
});

export { auth };
export default auth;