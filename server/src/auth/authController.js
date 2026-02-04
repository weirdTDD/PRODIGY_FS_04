// controllers/authController.js
import {
  createUser,
  validateUser,
  generateTokenPair,
  verifyRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  updatePassword,
  blacklistToken,
  decodeToken,
  getUserByEmail,
  getUserById,
} from "./auth.js";

export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
        error: "Email and password are required.",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
        error: "Invalid email format.",
      });
    }

    // Validate password strength (optional)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
        error: "Password must be at least 6 characters long.",
      });
    }

    const user = await createUser({ email, password });
    const tokens = generateTokenPair(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      token: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
      },
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        tokens,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.message === "User already exists") {
      return res.status(409).json({
        success: false,
        message: "User already exists.",
        error: "User already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: "Internal server error.",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
        error: "Email and password are required.",
      });
    }

    const user = await validateUser({ email, password });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
        error: "Invalid credentials.",
      });
    }

    const tokens = generateTokenPair(user);

    res.json({
      success: true,
      message: "Login successful.",
      token: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
      },
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        tokens,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: "Internal server error.",
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
        error: "Refresh token is required.",
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded || decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
        error: "Invalid refresh token.",
      });
    }

    const user = getUserById(decoded.sub);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        error: "User not found.",
      });
    }

    const tokens = generateTokenPair(user);

    res.json({
      success: true,
      message: "Token refreshed successfully.",
      token: tokens.accessToken,
      data: { tokens },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: "Internal server error.",
    });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      const decoded = decodeToken(token);
      if (decoded && decoded.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        blacklistToken(token, expiresAt.toISOString());
      }
    }

    res.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: "Internal server error.",
    });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // In a real app, you would:
    // 1. Check if user exists with this email
    // 2. Generate password reset token
    // 3. Send email with reset link

    const user = getUserByEmail(email);

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({
        success: true,
        message: "If an account exists, a reset email has been sent.",
      });
    }

    const resetToken = generatePasswordResetToken(user.id);

    // Here you would send the email with the reset link
    // For now, we'll return the token (in production, never do this!)
    res.json({
      success: true,
      message: "Password reset email sent.",
      data: { resetToken }, // Remove this in production!
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: "Internal server error.",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required.",
        error: "Token and new password are required.",
      });
    }

    const decoded = verifyPasswordResetToken(token);

    if (!decoded || decoded.type !== "reset_password") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired reset token.",
        error: "Invalid or expired reset token.",
      });
    }

    const success = await updatePassword(decoded.sub, newPassword);

    if (!success) {
      return res.status(500).json({
        success: false,
        message: "Failed to update password.",
        error: "Failed to update password.",
      });
    }

    res.json({
      success: true,
      message: "Password reset successful.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: "Internal server error.",
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    // User is already attached by authenticate middleware
    const user = req.user;

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: "Internal server error.",
    });
  }
};
