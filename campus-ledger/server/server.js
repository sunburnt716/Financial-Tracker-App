// server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

// =================== LOAD ENVIRONMENT VARIABLES ===================
dotenv.config({ path: path.resolve("server/.env") });

const requiredEnvs = [
  "MONGO_URI",
  "JWT_SECRET",
  "GOOGLE_APPLICATION_CREDENTIALS_JSON",
  "DOCUMENT_AI_PROCESSOR_ID",
  "GOOGLE_CLOUD_PROJECT_ID",
];

for (const key of requiredEnvs) {
  if (!process.env[key]) {
    console.error(`Environment variable ${key} is missing`);
    process.exit(1);
  }
}

console.log("=== Environment Variables Debug ===");
requiredEnvs.forEach((key) => console.log(`${key}: ${process.env[key]}`));
console.log("===================================");

// =================== EXPRESS APP ===================
const app = express();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json()); // parse JSON bodies

// =================== ROUTES ===================
// Import routes after middleware
import transactionsRouter from "./src/routes/transactions.js";
import authRouter from "./src/routes/auth.js";

// Auth routes (signup, login)
app.use("/api/auth", authRouter);

// Transactions routes (protected by authMiddleware inside router)
app.use("/api/transactions", transactionsRouter);

// Health check route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// =================== MONGODB CONNECTION ===================
mongoose
  .connect(process.env.MONGO_URI) // No deprecated options
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// =================== START SERVER ===================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
