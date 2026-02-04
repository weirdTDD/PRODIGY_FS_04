import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../database.js";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = "1h";

export async function createUser({ email, password }) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const result = db
    .prepare(
      `
    INSERT INTO users (email, password_hash) 
    VALUES (?, ?)
  `,
    )
    .run(email, hashedPassword);

  return { id: result.lastInsertRowid, email };
}

export async function validateUser({ email, password }) {
  const user = db
    .prepare(
      `
    SELECT id, email, password_hash 
    FROM users 
    WHERE email = ?
  `,
    )
    .get(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return null;
  }

  return { id: user.id, email: user.email };
}

export function generateAuthToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
