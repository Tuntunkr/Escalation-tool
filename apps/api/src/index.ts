import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth.js";
import { escalationRoutes } from "./routes/escalations.js";
import { metaRoutes } from "./routes/meta.js";
import { notificationRoutes } from "./routes/notifications.js";
import { adminRoutes } from "./routes/admin.js";
import { profileRoutes } from "./routes/profile.js";
import { UPLOAD_ROOT } from "./lib/paths.js";
import type { AppEnv } from "./lib/middleware.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../packages/db/.env") });
config({ path: resolve(__dirname, "../.env"), override: true });

const app = new Hono<AppEnv>();

app.onError((err, c) => {
  console.error("API error:", err);
  const message = err instanceof Error ? err.message : "Internal Server Error";
  return c.json({ error: message }, 500);
});

app.use("*", logger());
app.use(
  "*",
  cors({
    // Reflect browser Origin so Vercel <-> Railway login works even if env is stale.
    origin: (origin) => origin || "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(
  "/uploads/*",
  serveStatic({
    root: UPLOAD_ROOT,
    rewriteRequestPath: (path) => path.replace(/^\/uploads/, ""),
  })
);

app.get("/health", (c) => c.json({ ok: true, service: "escalation-api" }));

app.route("/auth", authRoutes);
app.route("/profile", profileRoutes);
app.route("/escalations", escalationRoutes);
app.route("/meta", metaRoutes);
app.route("/notifications", notificationRoutes);
app.route("/admin", adminRoutes);

const port = Number(process.env.PORT || process.env.API_PORT || 4000);
const hostname = process.env.HOST || "0.0.0.0";

serve({ fetch: app.fetch, port, hostname }, () => {
  console.log(`API listening on http://${hostname}:${port}`);
  console.log(`Uploads folder: ${UPLOAD_ROOT}`);
});
