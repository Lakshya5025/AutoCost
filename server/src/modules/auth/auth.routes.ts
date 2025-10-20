import { Router } from "express";
import { registerUser, loginUser, verifyOtp } from "./auth.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
} from "./auth.validation.js";

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user and send OTP
// @access  Public
router.post("/register", validate(registerSchema), registerUser);

// @route   POST /api/auth/login
// @desc    Log in a user and send OTP
// @access  Public
router.post("/login", validate(loginSchema), loginUser);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for registration or login
// @access  Public
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);

export default router;
