import { config, parse } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const envPath = fileURLToPath(new URL('../../.env', import.meta.url));

if (existsSync(envPath)) {
	const parsed = parse(readFileSync(envPath));
	if (parsed.DATABASE_URL) {
		process.env.DATABASE_URL = parsed.DATABASE_URL;
	}
}

config({ path: envPath, override: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.includes('USER:PASSWORD')) {
	throw new Error('DATABASE_URL is missing or contains a placeholder value in .env');
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

export { db };
export default db;