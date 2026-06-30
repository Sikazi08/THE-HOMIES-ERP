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

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const queries = [
  {
    name: "stockCounts",
    sql: `
      select
        count(*) filter (where status = 'en_stock' and product_type = 'téléphone')::int as phones_in_stock,
        count(*) filter (where status = 'chez_partenaire' and product_type = 'téléphone')::int as phones_at_partner,
        count(*) filter (where status = 'vendu' and product_type = 'téléphone')::int as phones_sold,
        count(*) filter (where status = 'en_stock' and product_type = 'accessoire')::int as acc_in_stock,
        count(*) filter (where status = 'chez_partenaire' and product_type = 'accessoire')::int as acc_at_partner,
        count(*) filter (where status = 'vendu' and product_type = 'accessoire')::int as acc_sold
      from products
    `,
  },
  {
    name: "todaySales",
    sql: "select * from sales where sale_date = $1 and cancelled = false",
    params: [new Date().toISOString().split("T")[0]],
  },
  {
    name: "todayFlows",
    sql: `
      select
        coalesce(sum(amount::numeric) filter (where direction = 'out'), 0) as outflows,
        coalesce(sum(amount::numeric) filter (where direction = 'in'), 0) as inflows
      from expenses
      where expense_date = $1
    `,
    params: [new Date().toISOString().split("T")[0]],
  },
  {
    name: "lowStockLiteral",
    sql: "select * from products where status = 'en_stock' and product_type = 'accessoire' and quantity <= 1 limit 10",
  },
  {
    name: "lowStockParams",
    sql: "select * from products where status = $1 and product_type = $2 and quantity <= 1 limit 10",
    params: ["en_stock", "accessoire"],
  },
];

try {
  for (const query of queries) {
    try {
      const result = await pool.query(query.sql, query.params ?? []);
      console.log(`OK ${query.name}`, result.rows.slice(0, 2));
    } catch (error) {
      console.error(`ERR ${query.name}`, error.message);
    }
  }
} finally {
  await pool.end();
}
