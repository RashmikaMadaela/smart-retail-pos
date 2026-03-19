import path from "node:path";
import Database from "better-sqlite3";

function resolveDefaultDbPath() {
  return path.resolve(process.cwd(), "../database/pos.db");
}

let activeDbPathOverride: string | null = null;
let db: Database.Database | null = null;

function getOrCreateDb() {
  if (!db) {
    const resolvedPath = activeDbPathOverride || process.env.POS_DB_PATH || resolveDefaultDbPath();
    if (!resolvedPath) {
      throw new Error("POS database path is not configured.");
    }

    db = new Database(resolvedPath, { fileMustExist: true });
    db.pragma("foreign_keys = ON");
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
