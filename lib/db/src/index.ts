import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function isPlaceholderDatabaseUrl(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("...") ||
    normalized.includes("your_password") ||
    normalized.includes("your_project_ref") ||
    normalized.includes("ton_mot_de_passe") ||
    normalized.includes("ton-url-supabase") ||
    normalized.includes("example.com")
  );
}

function getConnectionString(): { connectionString: string; source: string } {
  const candidates = [
    ["SUPABASE_DATABASE_URL", process.env.SUPABASE_DATABASE_URL],
    ["DATABASE_URL", process.env.DATABASE_URL],
  ] as const;

  const configured = candidates.filter(([, value]) => value?.trim());
  const valid = configured.find(([, value]) => value && !isPlaceholderDatabaseUrl(value));

  if (valid?.[1]) {
    return { connectionString: valid[1], source: valid[0] };
  }

  if (configured.length > 0) {
    throw new Error(
      `Database URL is still a placeholder in ${configured.map(([key]) => key).join(", ")}. ` +
      "Replace it in Render Environment with the real Supabase Postgres connection string.",
    );
  }

  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL must be set.");
}

const { connectionString, source } = getConnectionString();

const needsSsl =
  source === "SUPABASE_DATABASE_URL" ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("supabase.com") ||
  connectionString.includes("sslmode=require");

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

const rawQuery = pool.query.bind(pool) as (...args: unknown[]) => unknown;
(pool as unknown as { query: (...args: unknown[]) => unknown }).query = (queryConfig: unknown, ...args: unknown[]) => {
  if (queryConfig && typeof queryConfig === "object" && "name" in queryConfig) {
    const { name: _name, ...unnamedQueryConfig } = queryConfig as Record<string, unknown>;
    return rawQuery(unnamedQueryConfig, ...args);
  }

  return rawQuery(queryConfig, ...args);
};

export const db = drizzle(pool, { schema });

export * from "./schema";
