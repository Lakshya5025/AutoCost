import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Allow requests from our frontend
    credentials: true,
    methods: ["get", "post", "put", "patch", "delete"],
  })
);
app.use(express.json()); // To parse JSON bodies

// Simple health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "UP", message: "Backend is running!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
