import { spawnSync, spawn } from "node:child_process";
import { applyResolvedDatabaseUrl } from "./resolve-database-url.mjs";

const resolved = applyResolvedDatabaseUrl(process.env);
console.log(
  `Database URL source=${resolved.source} length=${resolved.url?.length || 0}`
);

if (!resolved.url || resolved.source === "DATABASE_URL_invalid" || resolved.source === "missing") {
  console.error(
    "WARNING: No usable DATABASE_URL. On Railway API variables, either:\n" +
      "  1) Copy real Postgres DATABASE_URL (not .... placeholders), or\n" +
      "  2) Add Variable References: PGHOST, PGPORT, PGPASSWORD, PGUSER, PGDATABASE"
  );
} else {
  console.log("Running prisma db push...");
  const result = spawnSync("pnpm", ["db:push"], {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  if (result.status !== 0) {
    console.error("db:push failed — starting API anyway");
  }
}

const child = spawn("pnpm", ["--filter", "@escalation/api", "start"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
