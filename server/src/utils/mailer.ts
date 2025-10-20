import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// We will use Mailtrap here as a fake SMTP server for development.
// In production, you would replace these with your actual email provider's details (e.g., SendGrid, AWS SES).
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends an email using the configured transporter.
 * @param {MailOptions} mailOptions - The options for the email.
 * @returns {Promise<void>}
 */
export async function sendEmail(mailOptions: MailOptions): Promise<void> {
  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    // In a real application, you might want to throw this error
    // to be handled by the calling function.
    throw new Error("Failed to send email.");
  }
}

/**
 * Sends a One-Time Password (OTP) to a user's email.
 * @param {string} email - The recipient's email address.
 * @param {string} otp - The OTP to send.
 * @returns {Promise<void>}
 */
export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const mailOptions = {
    from: '"Product Pricing App" <no-reply@productpricing.com>',
    to: email,
    subject: "Your One-Time Password (OTP)",
    text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Your One-Time Password (OTP)</h2>
        <p>Please use the following code to complete your action. This code is valid for 10 minutes.</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #000;">${otp}</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  await sendEmail(mailOptions);
}
