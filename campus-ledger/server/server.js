import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url"; // Required to recreate __dirname

// =================== 1. PATH & ENV CONFIGURATION ===================
// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env immediately.
// This assumes .env is inside the 'server' folder, right next to this file.
dotenv.config({ path: path.join(__dirname, ".env") });

// UPDATED: Now checking for the separate variables instead of the JSON block
const requiredEnvs = [
  "MONGO_URI",
  "JWT_SECRET",
  "GOOGLE_CLIENT_EMAIL", // Added
  "GOOGLE_PRIVATE_KEY", // Added
  "DOCUMENT_AI_PROCESSOR_ID",
  "GOOGLE_CLOUD_PROJECT_ID",
];

// Verify variables are loaded
console.log("=== Environment Variables Debug ===");
let missingVars = false;
for (const key of requiredEnvs) {
  if (!process.env[key]) {
    console.error(`❌ MISSING: ${key}`);
    missingVars = true;
  } else {
    // Print success without leaking full keys
    console.log(`✅ ${key}: Loaded`);
  }
}

if (missingVars) {
  console.error(
    "!!! Server failed to start due to missing environment variables !!!",
  );
  process.exit(1);
}
console.log("===================================");

// =================== 2. EXPRESS APP SETUP ===================
const app = express();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// =================== 3. DYNAMIC ROUTE IMPORTS ===================
// CRITICAL FIX: We use 'await import' here.
// This ensures these files are only read AFTER dotenv has finished loading.
console.log("🚀 Loading Routes...");
const { default: transactionsRouter } =
  await import("./src/routes/transactions.js");
const { default: authRouter } = await import("./src/routes/auth.js");

// Apply Routes
app.use("/api/auth", authRouter);
app.use("/api/transactions", transactionsRouter);

// Health check route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// =================== 4. DATABASE & SERVER START ===================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
