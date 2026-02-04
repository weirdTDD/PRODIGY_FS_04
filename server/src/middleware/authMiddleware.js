import {
  extractTokenFromHeader,
  verifyAuthToken,
  isTokenBlacklisted,
  getUserById,
} from "../auth/auth.js";

export const authenticate = (req, res, next) => {
  const token = extractTokenFromHeader(req.headers);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Missing auth token.",
      error: "Missing auth token.",
    });
  }

  if (isTokenBlacklisted(token)) {
    return res.status(401).json({
      success: false,
      message: "Token revoked.",
      error: "Token revoked.",
    });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      message: "Invalid auth token.",
      error: "Invalid auth token.",
    });
  }

  const user = getUserById(payload.sub);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not found.",
      error: "User not found.",
    });
  }

  req.user = user;
  return next();
};
