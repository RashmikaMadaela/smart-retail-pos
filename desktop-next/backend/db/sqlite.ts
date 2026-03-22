import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { initializeDatabaseSchema } from "./schema";

function resolveDefaultDbPath() {
  const cwd = process.cwd();
  const candidates = [cwd, path.resolve(cwd, "..")];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "desktop-next")) && fs.existsSync(path.join(candidate, "database"))) {
      return path.join(candidate, "database", "pos.db");
    }
    if (fs.existsSync(path.join(candidate, "backend")) && fs.existsSync(path.join(path.resolve(candidate, ".."), "database"))) {
      return path.join(path.resolve(candidate, ".."), "database", "pos.db");
    }
  }

  return path.resolve(cwd, "database", "pos.db");
}

let activeDbPathOverride: string | null = null;
let db: Database.Database | null = null;

function getOrCreateDb() {
  if (!db) {
    const resolvedPath = activeDbPathOverride || process.env.POS_DB_PATH || resolveDefaultDbPath();
    if (!resolvedPath) {
      throw new Error("POS database path is not configured.");
    }

    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    db = new Database(resolvedPath);
    db.pragma("foreign_keys = ON");
    initializeDatabaseSchema(db);
  }
  return db;
}

export function getDb() {
  return getOrCreateDb();
}

export function resetDbConnection() {
  if (db) {
    db.close();
    db = null;
  }
}

export function setDbPathForTests(dbPath: string) {
  activeDbPathOverride = dbPath;
  resetDbConnection();
}
