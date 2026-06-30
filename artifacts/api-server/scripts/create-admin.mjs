import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

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

if (!process.env.SUPABASE_DATABASE_URL && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL must be set.");
}

const username = process.env.ADMIN_USER || "admin";
const password = process.env.ADMIN_PASS || "admin123";
const fullName = process.env.ADMIN_NAME || "Administrateur";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.SUPABASE_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

try {
  const existing = await pool.query("select id from users where username = $1 limit 1", [username]);

  if (existing.rowCount > 0) {
    console.log(`Admin user already exists: ${username}`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    "insert into users (username, password_hash, full_name, role) values ($1, $2, $3, 'admin')",
    [username, passwordHash, fullName],
  );

  console.log(`Admin user created: ${username}`);
  console.log(`Password: ${password}`);
} finally {
  await pool.end();
}
