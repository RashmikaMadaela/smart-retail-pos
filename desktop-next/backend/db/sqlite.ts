import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "../../../database/pos.db");

const db = new Database(dbPath, { fileMustExist: true });
db.pragma("foreign_keys = ON");

export function getDb() {
  return db;
}
