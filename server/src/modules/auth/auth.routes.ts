import { Router } from "express";
import {
  registerUser,
  loginUser,
  verifyOtp,
  getMeHandler,
  logoutHandler,
} from "./auth.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
} from "./auth.validation.js";
import { isAuthenticated } from "../../middleware/auth.js";

const router = Router();

// --- Public Routes ---
router.post("/register", validate(registerSchema), registerUser);
router.post("/login", validate(loginSchema), loginUser);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);

// --- Protected Routes (require a valid session) ---

// GET /api/auth/me - Checks if a user is logged in and returns their data
router.get("/me", isAuthenticated, getMeHandler);

// POST /api/auth/logout - Destroys the user's session
router.post("/logout", isAuthenticated, logoutHandler);

export default router;
