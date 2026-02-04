// routes/authRoutes.js
import express from "express";
import {
  register,
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
  getProfile,
} from "./authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/password-reset/request", requestPasswordReset);
router.post("/password-reset/confirm", resetPassword);

// Protected routes
router.get("/profile", authenticate, getProfile);

export default router;
