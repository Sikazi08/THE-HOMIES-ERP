import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "node:path";

function parseEnvLine(line: string): [string, string] | null {
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

function findEnvFile(startDir: string): string | null {
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

function getDatabaseUrl(): string {
  const candidates = [
    ["SUPABASE_DATABASE_URL", process.env.SUPABASE_DATABASE_URL],
    ["DATABASE_URL", process.env.DATABASE_URL],
  ] as const;

  const configured = candidates.filter(([, value]) => value?.trim());
  const valid = configured.find(([, value]) => value && !isPlaceholderDatabaseUrl(value));

  if (valid?.[1]) return valid[1];

  if (configured.length > 0) {
    throw new Error(
      `Database URL is still a placeholder in ${configured.map(([key]) => key).join(", ")}. ` +
      "Replace it with the real Supabase Postgres connection string.",
    );
  }

  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL must be set.");
}

const databaseUrl = getDatabaseUrl();

export default defineConfig({
  schema: "./src/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
