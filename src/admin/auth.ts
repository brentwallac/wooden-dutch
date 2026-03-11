import { randomBytes } from "node:crypto";
import { createSession, getSession, deleteSession, cleanExpiredSessions } from "./db.js";

const SESSION_DURATION_HOURS = 24;
const COOKIE_NAME = "wd_session";

export async function verifyPassword(input: string, expected: string): Promise<boolean> {
  const { timingSafeEqual } = await import("node:crypto");
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(inputBuf, expectedBuf);
}

export function createNewSession(): string {
  cleanExpiredSessions();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  createSession(token, expiresAt);
  return token;
}

export function validateSession(token: string | undefined): boolean {
  if (!token) return false;
  return getSession(token) !== null;
}

export function destroySession(token: string): void {
  deleteSession(token);
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}
