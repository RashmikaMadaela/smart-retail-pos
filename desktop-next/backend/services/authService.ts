import crypto from "node:crypto";
import { getDb } from "../db/sqlite";
import type { AuthUser } from "../types";

export function login(username: string, password: string): { ok: true; user: AuthUser } | { ok: false; error: string } {
  const normalizedUsername = (username || "").trim();
  if (!normalizedUsername || !password) {
    return { ok: false, error: "Username and password are required." };
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  const db = getDb();
  const row = db
    .prepare("SELECT id, username, role FROM users WHERE username = ? AND password_hash = ?")
    .get(normalizedUsername, passwordHash) as AuthUser | undefined;

  if (!row) {
    return { ok: false, error: "Invalid credentials." };
  }

  return { ok: true, user: row };
}
