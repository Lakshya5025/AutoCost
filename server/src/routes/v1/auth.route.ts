import { Router } from "express";
import {
  login,
  logout,
  refreshAccessToken,
  register,
  verifyEmail,
  verifyLoginOtp,
} from "../../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/verify-login", verifyLoginOtp);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);

export default router;
