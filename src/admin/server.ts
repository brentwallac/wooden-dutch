import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { loadConfig } from "../config.js";
import { initSchema, seedAuthorsIfEmpty } from "./db.js";
import { verifyPassword, createNewSession, validateSession, destroySession, getSessionCookieName } from "./auth.js";
import { loginPage } from "./views/login.js";
import { chat } from "./chat.js";

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

// --- Start ---
const port = config.admin.port ?? 3000;
console.log(`Admin server starting on http://localhost:${port}/admin`);

export default {
  port,
  fetch: app.fetch,
};
