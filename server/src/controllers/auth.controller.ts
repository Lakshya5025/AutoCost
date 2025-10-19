import { type Request, type Response } from "express";
import { prisma } from "../index.js";
import {
  loginSchema,
  otpSchema,
  registerSchema,
} from "../schemas/auth.schema.js";
import bcrypt from "bcrypt";
import { generateOtp, sendOtpEmail, storeOtp } from "../utils/emailService.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../utils/token.utils.js";

/**
 * Sets the refresh token in a secure, httpOnly cookie
 */
const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie("refreshToken", token, {
    httpOnly: true, // Crucial: Prevents XSS
    secure: process.env.NODE_ENV === "production", // Send only over HTTPS
    sameSite: "strict", // Crucial: Prevents CSRF
    maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days (matches token expiry)
  });
};

/**
 * STEP 1: Register a new user
 * Creates user, sets isVerified: false, and sends OTP.
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = registerSchema.parse(
      req.body
    );

    let user = await prisma.user.findUnique({ where: { email } });

    if (user && user.isVerified) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // If user exists but is not verified, delete and recreate
    if (user && !user.isVerified) {
      await prisma.user.delete({ where: { id: user.id } });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      },
    });

    // Send verification OTP
    const otp = generateOtp();
    await storeOtp(user.id, otp, "EMAIL_VERIFICATION");
    await sendOtpEmail(user.email, otp);

    return res.status(201).json({
      message: "Registration successful. Please check your email for an OTP.",
      email: user.email,
    });
  } catch (error: any) {
    // Zod validation error
    if (error.errors) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: error.errors });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * STEP 2: Verify email after registration
 * Verifies OTP and logs the user in.
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, otp } = otpSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const validOtp = await prisma.otp.findFirst({
      where: {
        userId: user.id,
        type: "EMAIL_VERIFICATION",
        expiresAt: { gt: new Date() },
        used: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!validOtp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const isMatch = await bcrypt.compare(otp, validOtp.otpHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark user as verified and OTP as used
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });
    await prisma.otp.update({
      where: { id: validOtp.id },
      data: { used: true },
    });

    // --- Login user immediately ---
    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Store hashed refresh token in DB
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        hashedToken: hashedRefreshToken,
      },
    });

    // Set cookie
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      message: "Email verified successfully. You are now logged in.",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error.errors) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: error.errors });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * STEP 3: Login (Part 1)
 * Verifies credentials and sends a login OTP.
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isVerified) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Send login OTP
    const otp = generateOtp();
    await storeOtp(user.id, otp, "LOGIN_VERIFICATION");
    await sendOtpEmail(user.email, otp);

    return res.status(200).json({
      message: "Login OTP sent. Please check your email.",
      email: user.email,
    });
  } catch (error: any) {
    if (error.errors) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: error.errors });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * STEP 4: Login (Part 2)
 * Verifies the login OTP and creates the session.
 */
export const verifyLoginOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = otpSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isVerified) {
      return res.status(404).json({ message: "User not found" });
    }

    const validOtp = await prisma.otp.findFirst({
      where: {
        userId: user.id,
        type: "LOGIN_VERIFICATION",
        expiresAt: { gt: new Date() },
        used: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!validOtp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const isMatch = await bcrypt.compare(otp, validOtp.otpHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark OTP as used
    await prisma.otp.update({
      where: { id: validOtp.id },
      data: { used: true },
    });

    // --- Create session ---
    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Store hashed refresh token in DB
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        hashedToken: hashedRefreshToken,
      },
    });

    // Set cookie
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      message: "Login successful.",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error.errors) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: error.errors });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * REFRESH: Get a new access token
 * Uses the httpOnly refresh token to issue a new access token.
 */
export const refreshAccessToken = async (req: Request, res: Response) => {
  const tokenFromCookie = req.cookies.refreshToken;
  if (!tokenFromCookie) {
    return res
      .status(401)
      .json({ message: "Access denied. No refresh token." });
  }

  // Verify the token's signature
  const payload = verifyToken(
    tokenFromCookie,
    process.env.REFRESH_TOKEN_SECRET!
  );
  if (!payload || typeof payload === "string" || !payload.userId) {
    return res.status(403).json({ message: "Invalid refresh token." });
  }

  // Find the token in the database
  const dbTokens = await prisma.refreshToken.findMany({
    where: { userId: payload.userId, revoked: false },
  });

  if (dbTokens.length === 0) {
    return res.status(403).json({ message: "Invalid refresh token." });
  }

  // Find the matching hashed token
  let validTokenEntry = null;
  for (const dbToken of dbTokens) {
    const isMatch = await bcrypt.compare(tokenFromCookie, dbToken.hashedToken);
    if (isMatch) {
      validTokenEntry = dbToken;
      break;
    }
  }

  if (!validTokenEntry) {
    return res.status(403).json({ message: "Invalid refresh token." });
  }

  // Token is valid, find user and issue new access token
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });
  if (!user || !user.isVerified) {
    return res.status(403).json({ message: "Invalid user." });
  }

  const newAccessToken = generateAccessToken({ id: user.id, role: user.role });
  return res.status(200).json({ accessToken: newAccessToken });
};

/**
 * LOGOUT: Invalidate the refresh token
 */
export const logout = async (req: Request, res: Response) => {
  const tokenFromCookie = req.cookies.refreshToken;
  if (!tokenFromCookie) {
    return res.status(204).send(); // No content, already logged out
  }

  // Find and delete the matching token
  const payload = verifyToken(
    tokenFromCookie,
    process.env.REFRESH_TOKEN_SECRET!
  );
  if (payload && typeof payload !== "string" && payload.userId) {
    const dbTokens = await prisma.refreshToken.findMany({
      where: { userId: payload.userId, revoked: false },
    });

    for (const dbToken of dbTokens) {
      const isMatch = await bcrypt.compare(
        tokenFromCookie,
        dbToken.hashedToken
      );
      if (isMatch) {
        // Found it. Delete it.
        await prisma.refreshToken.delete({ where: { id: dbToken.id } });
        break;
      }
    }
  }

  // Clear the cookie regardless
  res.cookie("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0), // Expire immediately
  });

  return res.status(204).send();
};
