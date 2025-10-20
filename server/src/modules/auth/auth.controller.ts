import { type Request, type Response } from "express";
import prisma from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import { sendOtpEmail } from "../../utils/mailer.js";

const OTP_EXPIRY_MINUTES = 10;

/**
 * Generates a random 6-digit OTP.
 * @returns {string} The generated OTP.
 */
const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        otp,
        otpExpiry,
      },
      create: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        otp,
        otpExpiry,
      },
    });

    await sendOtpEmail(email, otp);

    return res.status(201).json({
      message:
        "Registration successful. Please check your email for an OTP to verify your account.",
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { otp, otpExpiry },
    });

    await sendOtpEmail(email, otp);

    return res.status(200).json({
      message:
        "Password verified. Please check your email for an OTP to complete login.",
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({
        message: "No OTP found for this user. Please try logging in again.",
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > user.otpExpiry) {
      return res
        .status(400)
        .json({ message: "OTP has expired. Please try again." });
    }

    await prisma.user.update({
      where: { email },
      data: {
        otp: null,
        otpExpiry: null,
      },
    });

    req.session.userId = user.id;

    const { password, otp: _, otpExpiry: __, ...userWithoutPassword } = user;

    return res.status(200).json({
      message: "OTP verified successfully. You are now logged in.",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMeHandler = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      // FIX: Assert req.userId is not undefined. The middleware guarantees this.
      where: { id: req.userId! },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, otp, otpExpiry, ...userWithoutPassword } = user;

    res.status(200).json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Failed to get current user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logoutHandler = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Could not log out, please try again." });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logged out successfully" });
  });
};
