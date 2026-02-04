import Database from "better-sqlite3";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || `${__dirname}/../../data/chat.db`;

// Ensure data directory exists
if (!existsSync(dirname(DB_PATH))) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
}

export const db = new Database(DB_PATH);

// Initialize schema if not exists
const initializeDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      is_public BOOLEAN DEFAULT 1,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memberships (
      user_id INTEGER REFERENCES users(id),
      room_id INTEGER REFERENCES rooms(id),
      PRIMARY KEY (user_id, room_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY,
      room_id INTEGER REFERENCES rooms(id),
      user_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dm_conversations (
      id INTEGER PRIMARY KEY,
      user1_id INTEGER REFERENCES users(id),
      user2_id INTEGER REFERENCES users(id),
      UNIQUE(user1_id, user2_id)
    );
  `);
};

initializeDatabase();
