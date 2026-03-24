import crypto from "node:crypto";
import { getDb } from "../db/sqlite";
import type { AuthUser } from "../types";

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function ensureSuperAdminUser() {
  const username = (process.env.POS_SUPERADMIN_USERNAME || "superadmin").trim();
  const password = process.env.POS_SUPERADMIN_PASSWORD || "superadmin123";
  if (!username || !password) {
    return;
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as { id: number } | undefined;
  if (existing) {
    return;
  }

  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'SuperAdmin')").run(username, hashPassword(password));
}

export function login(username: string, password: string): { ok: true; user: AuthUser } | { ok: false; error: string } {
  const normalizedUsername = (username || "").trim();
  if (!normalizedUsername || !password) {
    return { ok: false, error: "Username and password are required." };
  }

  const passwordHash = hashPassword(password);
  const db = getDb();
  const row = db
    .prepare("SELECT id, username, role FROM users WHERE username = ? AND password_hash = ?")
    .get(normalizedUsername, passwordHash) as AuthUser | undefined;

  if (!row) {
    return { ok: false, error: "Invalid credentials." };
  }

  return { ok: true, user: row };
}
