import express from "express";
import multer from "multer";
import { Transaction } from "../models/transactions.js";
import * as transactionsController from "../controllers/transactions.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Multer memory storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- GET ALL TRANSACTIONS WITH PAGINATION ---
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Only fetch transactions for the logged-in user
    const filter = { user: req.user };

    // Total count for pagination
    const total = await Transaction.countDocuments(filter);

    // Fetch paginated transactions
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 }) // newest first
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({ success: true, transactions, totalPages });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --- CREATE NEW TRANSACTION(S) ---
router.post("/", authMiddleware, transactionsController.createTransactions);

// --- EDIT TRANSACTION BY ID ---
router.put("/:id", authMiddleware, transactionsController.editTransactions);

// --- DELETE TRANSACTION BY ID ---
router.delete(
  "/:id",
  authMiddleware,
  transactionsController.deleteTransactions
);

// --- SCAN DOCUMENT / EXTRACT TRANSACTION ---
router.post(
  "/extract",
  authMiddleware,
  upload.single("file"),
  transactionsController.extractTransaction
);

// --- TEST ROUTE TO SEE RAW DOCUMENT AI OUTPUT ---
router.post(
  "/test-extract",
  upload.single("file"),
  transactionsController.testDocumentAI
);

export default router;
