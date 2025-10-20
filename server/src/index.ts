import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import authRoutes from "./modules/auth/auth.routes.js";
import rawMaterialRoutes from "./modules/raw-materials/raw-materials.routes.js";
import productRoutes from "./modules/products/products.routes.js";

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Allow requests from our frontend
    credentials: true, // This is crucial for cookies/session management
  })
);
app.use(cookieParser());
app.use(express.json()); // To parse JSON bodies

// Session Middleware
// This will store session data on the server and use a cookie to track the user's session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey", // Replace with a strong secret in .env
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production (requires HTTPS)
      httpOnly: true, // Prevents client-side JS from accessing the cookie
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
    },
  })
);

// --- API Routes ---
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "UP", message: "Backend is running!" });
});

app.use("/api/auth", authRoutes);
app.use("/api/raw-materials", rawMaterialRoutes);
app.use("/api/products", productRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
