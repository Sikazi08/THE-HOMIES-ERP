import fs from "node:fs";

for (const file of ["package-lock.json", "yarn.lock"]) {
  if (fs.existsSync(file)) {
    fs.rmSync(file, { force: true });
  }
}

const userAgent = process.env.npm_config_user_agent || "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
