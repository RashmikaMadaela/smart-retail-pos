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

export function createUser(
  username: string,
  password: string,
  role: "Admin" | "Cashier" | "SuperAdmin"
): { ok: true; userId: number } | { ok: false; error: string } {
  const normalizedUsername = (username || "").trim();
  if (!normalizedUsername || !password) {
    return { ok: false, error: "Username and password are required." };
  }

  if (!["Admin", "Cashier", "SuperAdmin"].includes(role)) {
    return { ok: false, error: "Invalid role. Must be Admin, Cashier, or SuperAdmin." };
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(normalizedUsername) as { id: number } | undefined;
  if (existing) {
    return { ok: false, error: "Username already exists." };
  }

  const passwordHash = hashPassword(password);
  const result = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(normalizedUsername, passwordHash, role);

  return { ok: true, userId: Number(result.lastInsertRowid) };
}

export function listUsers(): AuthUser[] {
  const db = getDb();
  const rows = db.prepare("SELECT id, username, role FROM users ORDER BY id ASC").all() as AuthUser[];
  return rows;
}

export function deleteUser(userId: number): { ok: true } | { ok: false; error: string } {
  const db = getDb();
  
  // Check if user exists
  const user = db.prepare("SELECT id, username, role FROM users WHERE id = ?").get(userId) as AuthUser | undefined;
  if (!user) {
    return { ok: false, error: "User not found." };
  }

  // Prevent deletion of SuperAdmin
  if (user.role === "SuperAdmin") {
    return { ok: false, error: "Cannot delete SuperAdmin user." };
  }

  // Check if user has any sales
  const salesCount = db.prepare("SELECT COUNT(*) as count FROM sales WHERE cashier_id = ?").get(userId) as { count: number } | undefined;
  if (salesCount && salesCount.count > 0) {
    return { ok: false, error: "Cannot delete user with existing sales records." };
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  return { ok: true };
}
