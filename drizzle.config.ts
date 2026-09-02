import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
	verbose: true,
	strict: true
});
