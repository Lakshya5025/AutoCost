import nodemailer from "nodemailer";
import { prisma } from "../index.js";
import bcrypt from "bcrypt";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Generates a 6-digit OTP
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hashes an OTP and stores it in the database
 */
export async function storeOtp(
  userId: string,
  otp: string,
  type: "EMAIL_VERIFICATION" | "LOGIN_VERIFICATION"
) {
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate old OTPs of the same type
  await prisma.otp.updateMany({
    where: { userId, type, used: false },
    data: { used: true }, // Mark as used
  });

  // Create new OTP
  await prisma.otp.create({
    data: {
      userId,
      otpHash,
      expiresAt,
      type,
    },
  });
}

/**
 * Sends an email with the OTP
 */
export async function sendOtpEmail(to: string, otp: string) {
  const mailOptions = {
    from: `"AutoCost" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: "Your AutoCost Verification Code",
    text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
    html: `<p>Your verification code is: <b>${otp}</b>. It will expire in 10 minutes.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP email sent to", to);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    // In a real app, you'd have better error handling here
    throw new Error("Failed to send OTP email");
  }
}
