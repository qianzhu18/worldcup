// SQLite database with lazy init — gracefully degrades on serverless (Vercel).
import path from "path";

let _db: any = null;
let _dbFailed = false;

function getDb() {
  if (_dbFailed) return null;
  if (_db) return _db;
  try {
    const Database = require("better-sqlite3");
    const fs = require("fs");
    const DB_PATH = path.join(process.cwd(), "data", "worldcup.db");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    initTables(_db);
    return _db;
  } catch (e) {
    console.warn("[db] SQLite unavailable:", (e as Error).message);
    _dbFailed = true;
    return null;
  }
}

function initTables(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id TEXT NOT NULL,
      prediction TEXT NOT NULL,
      confidence REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, match_id)
    );
    CREATE TABLE IF NOT EXISTS user_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, item_type, item_id)
    );
  `);
}

export default { get getDb() { return getDb(); } };

export function createUser(email: string, passwordHash: string, name?: string) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");
  return db.prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)").run(email, passwordHash, name || email.split("@")[0]);
}

export function getUserByEmail(email: string) {
  const db = getDb();
  if (!db) return undefined;
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
}

export function getUserById(id: number) {
  const db = getDb();
  if (!db) return undefined;
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
}

export function savePrediction(userId: number, matchId: string, prediction: string, confidence?: number) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");
  return db.prepare("INSERT OR REPLACE INTO user_predictions (user_id, match_id, prediction, confidence) VALUES (?, ?, ?, ?)").run(userId, matchId, prediction, confidence);
}

export function getUserPredictions(userId: number) {
  const db = getDb();
  if (!db) return [];
  return db.prepare("SELECT * FROM user_predictions WHERE user_id = ? ORDER BY created_at DESC").all(userId);
}

export function addFavorite(userId: number, itemType: string, itemId: string) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");
  return db.prepare("INSERT OR IGNORE INTO user_favorites (user_id, item_type, item_id) VALUES (?, ?, ?)").run(userId, itemType, itemId);
}

export function removeFavorite(userId: number, itemType: string, itemId: string) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");
  return db.prepare("DELETE FROM user_favorites WHERE user_id = ? AND item_type = ? AND item_id = ?").run(userId, itemType, itemId);
}

export function getUserFavorites(userId: number, itemType?: string) {
  const db = getDb();
  if (!db) return [];
  if (itemType) {
    return db.prepare("SELECT * FROM user_favorites WHERE user_id = ? AND item_type = ?").all(userId, itemType);
  }
  return db.prepare("SELECT * FROM user_favorites WHERE user_id = ?").all(userId);
}
