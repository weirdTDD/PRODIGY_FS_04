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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
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

    CREATE TABLE IF NOT EXISTS blacklisted_tokens (
      token TEXT PRIMARY KEY,
      expires_at DATETIME NOT NULL
    );
  `);
};

initializeDatabase();

const ensureRoomDescriptionColumn = () => {
  const columns = db.prepare("PRAGMA table_info(rooms)").all();
  const hasDescription = columns.some((column) => column.name === "description");
  if (!hasDescription) {
    db.exec("ALTER TABLE rooms ADD COLUMN description TEXT;");
  }
};

const ensureUserUpdatedAtColumn = () => {
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasUpdatedAt = columns.some((column) => column.name === "updated_at");
  if (!hasUpdatedAt) {
    db.exec("ALTER TABLE users ADD COLUMN updated_at DATETIME;");
  }
};

const seedRooms = () => {
  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM rooms")
    .get();
  if (count > 0) return;

  const rooms = [
    {
      id: 1,
      name: "Dog Lovers",
      description: "A community for dog lovers to share stories and tips.",
    },
    {
      id: 2,
      name: "Developers",
      description: "Share code, ideas, and debugging wins together.",
    },
    {
      id: 3,
      name: "Foodies",
      description: "For people who love recipes, reviews, and cooking tips.",
    },
    {
      id: 4,
      name: "Bookworms",
      description: "Discuss books, series, and reading goals.",
    },
    {
      id: 5,
      name: "Movie Buffs",
      description: "Trailers, reviews, and watch party planning.",
    },
  ];

  const insertRoom = db.prepare(
    `
    INSERT INTO rooms (id, name, description, is_public) 
    VALUES (@id, @name, @description, 1)
  `,
  );

  const insertMany = db.transaction((rows) => {
    for (const room of rows) {
      insertRoom.run(room);
    }
  });

  insertMany(rooms);
};

ensureRoomDescriptionColumn();
ensureUserUpdatedAtColumn();
seedRooms();
