import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Import router 
import transactionsRouter from "./routes/transactions.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/transactions", transactionsRouter);

// Health check route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
