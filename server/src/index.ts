import express, { type Express, type Request, type Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import v1Routes from "./routes/v1/index.js"; // <-- Add this import
// Load environment variables
dotenv.config();

// Initialize Prisma
export const prisma = new PrismaClient();

const app: Express = express();
const PORT = process.env.PORT || 8000;

// --- Middlewares ---

// CORS configuration for production
const corsOptions = {
  origin: process.env.CLIENT_URL, // Whitelist the Vercel frontend
  credentials: true, // Allow cookies to be sent
};
app.use(cors(corsOptions));

// JSON body parser
app.use(express.json());

// URL-encoded body parser
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// --- API Routes ---
app.use("/api/v1", v1Routes); // <-- Add this line
// Health check route
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "UP", message: "AutoCost API is healthy" });
});

// --- Server Startup ---
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database", error);
    process.exit(1);
  }
};

startServer();
