import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { resetDbConnection, setDbPathForTests } from "../backend/db/sqlite";
import { login } from "../backend/services/authService";

let testDir = "";
let dbPath = "";

function buildSchema(db: Database.Database) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `);
}

function seedData(db: Database.Database) {
  const passwordHash = crypto.createHash("sha256").update("admin123").digest("hex");
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", passwordHash, "Admin");
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("cashier", passwordHash, "Cashier");
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("superadmin", passwordHash, "SuperAdmin");
}

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "pos-auth-test-"));
  dbPath = path.join(testDir, "test.db");
  const db = new Database(dbPath);
  buildSchema(db);
  seedData(db);
  db.close();

  setDbPathForTests(dbPath);
});

afterEach(() => {
  resetDbConnection();
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe("auth service", () => {
  test("login success with correct credentials for admin", () => {
    const result = login("admin", "admin123");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.user.username).toBe("admin");
    expect(result.user.role).toBe("Admin");
    expect(result.user.id).toBe(1);
  });

  test("login success with correct credentials for cashier", () => {
    const result = login("cashier", "admin123");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.user.username).toBe("cashier");
    expect(result.user.role).toBe("Cashier");
    expect(result.user.id).toBe(2);
  });

  test("login failure with incorrect password", () => {
    const result = login("admin", "wrongpassword");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toBe("Invalid credentials.");
  });

  test("login failure with non-existent username", () => {
    const result = login("nonexistent", "admin123");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toBe("Invalid credentials.");
  });

  test("login failure with empty username", () => {
    const result = login("", "admin123");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toBe("Username and password are required.");
  });

  test("login failure with empty password", () => {
    const result = login("admin", "");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toBe("Username and password are required.");
  });

  test("login success with superadmin role", () => {
    const result = login("superadmin", "admin123");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.user.username).toBe("superadmin");
    expect(result.user.role).toBe("SuperAdmin");
    expect(result.user.id).toBe(3);
  });
});
