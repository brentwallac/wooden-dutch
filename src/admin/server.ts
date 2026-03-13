import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { loadConfig } from "../config.js";
import { initSchema, seedAuthorsIfEmpty } from "./db.js";
import { verifyPassword, createNewSession, validateSession, destroySession, getSessionCookieName } from "./auth.js";
import { loginPage } from "./views/login.js";
import { chat } from "./chat.js";
import { startScheduler } from "../services/scheduler.js";
import { runPipeline } from "../pipeline/index.js";

const config = loadConfig();

if (!config.admin.password) {
  console.error("ADMIN_PASSWORD is required to run the admin server.");
  process.exit(1);
}

// Initialize database
initSchema();
seedAuthorsIfEmpty();
console.log("Database initialized.");

const app = new Hono();

// --- Static assets ---
app.get("/admin/style.css", async (c) => {
  const css = await Bun.file(new URL("public/style.css", import.meta.url).pathname).text();
  return c.text(css, 200, { "Content-Type": "text/css" });
});

app.get("/admin/images/:filename", async (c) => {
  const filename = c.req.param("filename");
  // Prevent path traversal
  if (filename.includes("..") || filename.includes("/")) {
    return c.text("Not found", 404);
  }
  const filepath = new URL(`../../data/drafts/images/${filename}`, import.meta.url).pathname;
  const file = Bun.file(filepath);
  if (!(await file.exists())) return c.text("Not found", 404);
  return new Response(file, { headers: { "Content-Type": file.type || "image/jpeg" } });
});

// --- Auth middleware ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAuthenticated(c: any): boolean {
  const token = getCookie(c, getSessionCookieName());
  return validateSession(token);
}

// --- Auth routes ---
app.get("/admin/login", (c) => {
  if (isAuthenticated(c)) return c.redirect("/admin");
  return c.html(loginPage());
});

app.post("/admin/login", async (c) => {
  const body = await c.req.parseBody();
  const password = body.password as string;

  if (!(await verifyPassword(password, config.admin.password!))) {
    return c.html(loginPage("Invalid password"), 401);
  }

  const token = createNewSession();
  setCookie(c, getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });

  return c.redirect("/admin");
});

app.get("/admin/logout", (c) => {
  const token = getCookie(c, getSessionCookieName());
  if (token) destroySession(token);
  deleteCookie(c, getSessionCookieName(), { path: "/" });
  return c.redirect("/admin/login");
});

// --- Protected routes (auth wall) ---
app.use("/admin/*", async (c, next) => {
  const path = c.req.path;
  if (path === "/admin/login" || path === "/admin/style.css") return next();

  if (!isAuthenticated(c)) return c.redirect("/admin/login");
  return next();
});

app.route("/", chat);

// --- Cron schedulers ---
startScheduler(config, config.scheduler.cronSchedule, "Article", async () => {
  await runPipeline(config);
});
startScheduler(config, config.scheduler.cartoonCronSchedule, "Cartoon", async () => {
  await runPipeline(config, { cartoon: true });
});

// --- Start ---
const port = config.admin.port ?? 3000;
console.log(`Between Two Ports — Writer's Room starting on http://localhost:${port}/admin`);

export default {
  port,
  fetch: app.fetch,
};
