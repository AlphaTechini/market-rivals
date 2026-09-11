import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

type Database = ReturnType<typeof drizzle<typeof schema>>;

let client: ReturnType<typeof postgres> | undefined;
let database: Database | undefined;

export function getDb(): Database {
	const databaseUrl = env.DATABASE_URL || env.POSTGRES_URL;
	if (!databaseUrl) throw new Error('DATABASE_URL or POSTGRES_URL is not set');
	if (!database) {
		// POSTGRES_URL from the Supabase-Vercel integration is pooled. Disable
		// prepared statements so it remains compatible with transaction poolers.
		client = postgres(databaseUrl, { max: 5, ssl: 'require', prepare: false });
		database = drizzle(client, { schema });
	}

	return database;
}
