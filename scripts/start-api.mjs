import { spawnSync, spawn } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (databaseUrl) {
  console.log("DATABASE_URL present — running prisma db push...");
  const result = spawnSync("pnpm", ["db:push"], {
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  if (result.status !== 0) {
    console.error("db:push failed — starting API anyway (fix DATABASE_URL if login 500s)");
  }
} else {
  console.error(
    "WARNING: DATABASE_URL is empty. Set it via Railway Variable Reference to your Postgres service, then redeploy."
  );
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
