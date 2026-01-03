// src/controllers/transactions.js
import { Transaction } from "../models/transactions.js";
import {
  processDocumentAI,
  processDocumentRaw,
} from "../services/documentAI.js";
import {
  validateTransactionCreate,
  validateTransactionUpdate,
  normalizeTransactionData,
} from "../utils/transaction.js";

/**
 * Normalize input from AI or frontend to DB-safe transaction
 */
const normalizeInputTransaction = (input) => {
  const items =
    input.metadata?.items?.map((i) => ({
      item_name: i.item_name || i.name || "Unknown",
      item_price:
        typeof i.item_price === "number"
          ? i.item_price
          : i.price
          ? Number(String(i.price).replace(/\$/g, ""))
          : 0,
    })) ||
    input.items?.map((i) => ({
      item_name: i.item_name || i.name || "Unknown",
      item_price:
        typeof i.item_price === "number"
          ? i.item_price
          : i.price
          ? Number(String(i.price).replace(/\$/g, ""))
          : 0,
    })) ||
    [];

  return normalizeTransactionData({
    name: input.name || input.company_name || "Unknown",
    price:
      typeof input.price === "number"
        ? input.price
        : input.total_price
        ? Number(String(input.total_price).replace(/\$/g, ""))
        : 0,
    date: input.date ? new Date(input.date) : new Date(),
    metadata: { items },
  });
};

/**
 * Create transactions (manual JSON or file upload)
 */
export const createTransactions = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const savedTransactions = [];

    if (req.file) {
      const rawDocument = await processDocumentRaw(
        req.file.buffer,
        req.file.mimetype,
        process.env.DOCUMENT_AI_PROCESSOR_ID,
        process.env.GOOGLE_CLOUD_PROJECT_ID
      );
      const parsed = processDocumentAI(rawDocument);
      const normalized = normalizeInputTransaction(parsed);
      validateTransactionCreate(normalized);

      const saved = await Transaction.create({ ...normalized, user: req.user });
      savedTransactions.push(saved);
    } else if (req.body) {
      const bodyData = Array.isArray(req.body) ? req.body : [req.body];

      for (const t of bodyData) {
        const normalized = normalizeInputTransaction(t);
        validateTransactionCreate(normalized);

        const saved = await Transaction.create({
          ...normalized,
          user: req.user,
        });
        savedTransactions.push(saved);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "No transaction data or file provided",
      });
    }

    res.status(201).json({
      success: true,
      message: "Transactions created",
      data: savedTransactions,
    });
  } catch (err) {
    console.error("Create transaction failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Extract transaction from uploaded receipt via Document AI
 */
export const extractTransaction = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const rawDocument = await processDocumentRaw(
      req.file.buffer,
      req.file.mimetype,
      process.env.DOCUMENT_AI_PROCESSOR_ID,
      process.env.GOOGLE_CLOUD_PROJECT_ID
    );

    const parsed = processDocumentAI(rawDocument);
    const normalized = normalizeInputTransaction(parsed);
    validateTransactionCreate(normalized);

    const savedTransaction = await Transaction.create({
      ...normalized,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      message: "Parsed and saved transaction",
      transaction: savedTransaction,
    });
  } catch (err) {
    console.error("Extraction failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get all transactions
 */
export const getTransactions = async (req, res) => {
  try {
    console.log("REQ.USER:", req.user);
    console.log("REQ.USER TYPE:", typeof req.user);

    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const userId = req.user;

    const [transactions, total] = await Promise.all([
      Transaction.find({ user: userId })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments({ user: userId }),
    ]);

    res.status(200).json({
      success: true,
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error("Get transactions failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update transaction by ID
 */
export const editTransactions = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const updates = normalizeInputTransaction(req.body);
    validateTransactionUpdate(updates);

    const updatedTransaction = await Transaction.findOneAndUpdate(
      { _id: id, user: req.user },
      updates,
      { new: true }
    );

    if (!updatedTransaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    res.status(200).json({ success: true, transaction: updatedTransaction });
  } catch (err) {
    console.error("Edit transaction failed:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Delete transaction by ID
 */
export const deleteTransactions = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    if (!id) throw new Error("No ID provided");

    const deletedTransaction = await Transaction.findOneAndDelete({
      _id: id,
      user: req.user,
    });

    if (!deletedTransaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    res.status(200).json({ success: true, message: "Transaction deleted" });
  } catch (err) {
    console.error("Delete transaction failed:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Test Document AI endpoint (raw output)
 */
export const testDocumentAI = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const rawDocument = await processDocumentRaw(
      req.file.buffer,
      req.file.mimetype,
      process.env.DOCUMENT_AI_PROCESSOR_ID,
      process.env.GOOGLE_CLOUD_PROJECT_ID
    );

    res.status(200).json({ success: true, rawData: rawDocument });
  } catch (err) {
    console.error("Document AI test failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
