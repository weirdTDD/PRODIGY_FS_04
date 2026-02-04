import crypto from "crypto";

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString("hex");
}

console.log("JWT Secret:", generateSecret());
console.log("Refresh Token Secret:", generateSecret());
console.log("Password Reset Secret:", generateSecret());
