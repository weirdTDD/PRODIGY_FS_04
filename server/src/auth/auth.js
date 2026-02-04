// auth.js (enhanced version)
import "dotenv/config";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../database.js";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// Token expiry configurations
const TOKEN_EXPIRY = {
  ACCESS: "15m",
  REFRESH: "7d",
  RESET_PASSWORD: "1h",
  VERIFY_EMAIL: "24h",
};

if (!process.env.JWT_SECRET) {
  console.warn(
    "JWT_SECRET not set. Using insecure default; set JWT_SECRET for production.",
  );
}

// User functions
export async function createUser({ email, password }) {
  try {
    // Check if user already exists
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const result = db
      .prepare(
        "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
      )
      .run(email, hashedPassword, new Date().toISOString());

    return { id: result.lastInsertRowid, email };
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function validateUser({ email, password }) {
  try {
    const user = db
      .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
      .get(email);

    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    return { id: user.id, email: user.email };
  } catch (error) {
    console.error("Error validating user:", error);
    return null;
  }
}

export function getUserById(id) {
  try {
    return db
      .prepare("SELECT id, email, created_at FROM users WHERE id = ?")
      .get(id);
  } catch (error) {
    console.error("Error getting user by id:", error);
    return null;
  }
}

export function getUserByEmail(email) {
  try {
    return db
      .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
      .get(email);
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

// Token generation functions
export function generateAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: "access",
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY.ACCESS },
  );
}

export function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      type: "refresh",
    },
    JWT_SECRET + "_refresh", // Different secret for refresh tokens
    { expiresIn: TOKEN_EXPIRY.REFRESH },
  );
}

export function generatePasswordResetToken(userId) {
  return jwt.sign(
    {
      sub: userId,
      type: "reset_password",
    },
    JWT_SECRET + "_reset",
    { expiresIn: TOKEN_EXPIRY.RESET_PASSWORD },
  );
}

export function generateEmailVerificationToken(userId, email) {
  return jwt.sign(
    {
      sub: userId,
      email: email,
      type: "verify_email",
    },
    JWT_SECRET + "_verify",
    { expiresIn: TOKEN_EXPIRY.VERIFY_EMAIL },
  );
}

// Token verification functions
export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("Token verification error:", error.message);
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET + "_refresh");
  } catch (error) {
    console.error("Refresh token verification error:", error.message);
    return null;
  }
}

export function verifyPasswordResetToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET + "_reset");
  } catch (error) {
    console.error("Password reset token verification error:", error.message);
    return null;
  }
}

export function verifyEmailVerificationToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET + "_verify");
  } catch (error) {
    console.error("Email verification token error:", error.message);
    return null;
  }
}

// Token pair generation (access + refresh)
export function generateTokenPair(user) {
  return {
    accessToken: generateAuthToken(user),
    refreshToken: generateRefreshToken(user),
    expiresIn: TOKEN_EXPIRY.ACCESS,
  };
}

// Middleware helper functions
export function extractTokenFromHeader(headers) {
  const authHeader = headers.authorization || headers.Authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7); // Remove "Bearer " prefix
}

// Token blacklist (for logout functionality)
// You'll need to create a 'blacklisted_tokens' table in your database
export function blacklistToken(token, expiresAt) {
  try {
    db.prepare(
      "INSERT INTO blacklisted_tokens (token, expires_at) VALUES (?, ?)",
    ).run(token, expiresAt);
    return true;
  } catch (error) {
    console.error("Error blacklisting token:", error);
    return false;
  }
}

export function isTokenBlacklisted(token) {
  try {
    const result = db
      .prepare("SELECT id FROM blacklisted_tokens WHERE token = ?")
      .get(token);
    return !!result;
  } catch (error) {
    console.error("Error checking token blacklist:", error);
    return false;
  }
}

// Password update function
export async function updatePassword(userId, newPassword) {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
    ).run(hashedPassword, new Date().toISOString(), userId);
    return true;
  } catch (error) {
    console.error("Error updating password:", error);
    return false;
  }
}

// Utility function to decode token without verification
export function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

// Check if token is expired
export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}
