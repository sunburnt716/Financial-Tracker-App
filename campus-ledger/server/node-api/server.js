import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

// =================== 1. PATH & ENV CONFIGURATION ===================
// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env immediately
dotenv.config({ path: path.join(__dirname, ".env") });

// Updated required list to include all three Document AI processors
const requiredEnvs = [
  "MONGO_URI",
  "JWT_SECRET",
  "GOOGLE_CLIENT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_CLOUD_PROJECT_ID",
  "DOCUMENT_AI_PROCESSOR_ID", // For Receipts/Transactions
  "DOCUMENT_AI_BROKERAGE_ID", // For Brokerage Summaries
  "DOCUMENT_AI_HOLDINGS_ID", // For Detailed Holdings
];

// Verify variables are loaded before moving forward
console.log("=== Environment Variables Debug ===");
let missingVars = false;
for (const key of requiredEnvs) {
  if (!process.env[key]) {
    console.error(`❌ MISSING: ${key}`);
    missingVars = true;
  } else {
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

// Standard Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// =================== 3. DYNAMIC ROUTE IMPORTS ===================
// Using Promise.all ensures all routes are loaded in parallel
// and only AFTER environment variables are verified.
console.log("🚀 Loading Routes...");

const [
  { default: transactionsRouter },
  { default: authRouter },
  { default: excelRouter },
] = await Promise.all([
  import("./src/routes/transactions.js"),
  import("./src/routes/auth.js"),
  import("./src/routes/excelExporter.js"),
]);

// Apply Routes
app.use("/api/auth", authRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/excel", excelRouter);

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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    `📊 Excel Export available at: http://localhost:${PORT}/api/excel`,
  );
});
