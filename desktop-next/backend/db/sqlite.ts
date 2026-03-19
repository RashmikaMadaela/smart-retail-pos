import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDbPath = path.resolve(__dirname, "../../../database/pos.db");
let activeDbPath = process.env.POS_DB_PATH || defaultDbPath;
let db: Database.Database | null = null;

function getOrCreateDb() {
  if (!db) {
    db = new Database(activeDbPath, { fileMustExist: true });
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
  activeDbPath = dbPath;
  resetDbConnection();
}
