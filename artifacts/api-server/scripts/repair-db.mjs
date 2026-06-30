import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const separator = trimmed.indexOf("=");
  if (separator <= 0) return null;

  const key = trimmed.slice(0, separator).trim();
  let value = trimmed.slice(separator + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

function findEnvFile(startDir) {
  let current = startDir;

  while (true) {
    const candidate = path.join(current, ".env");
    if (fs.existsSync(candidate)) return candidate;

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

const envFile = findEnvFile(process.cwd());
if (envFile) {
  const content = fs.readFileSync(envFile, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    process.env[key] ??= value;
  }
}

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL must be set.");

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const migrations = [
  {
    name: "products.phone_state",
    sql: `alter table if exists products add column if not exists phone_state text`,
  },
];

try {
  for (const migration of migrations) {
    await pool.query(migration.sql);
    console.log(`OK ${migration.name}`);
  }
} finally {
  await pool.end();
}
