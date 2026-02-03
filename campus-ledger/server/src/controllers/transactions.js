// src/controllers/transactions.js
import { Transaction } from "../models/transactions.js";
import { Investment } from "../models/transactions.js";
import {
  parseReceiptData,
  processDocumentRaw,
  parseBrokerageStatement,
  parseHoldingsStatement,
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
        process.env.GOOGLE_CLOUD_PROJECT_ID,
      );
      const parsed = parseReceiptData(rawDocument);
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
      process.env.GOOGLE_CLOUD_PROJECT_ID,
    );

    const parsed = parseReceiptData(rawDocument);
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
      { new: true },
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
      process.env.GOOGLE_CLOUD_PROJECT_ID,
    );

    res.status(200).json({ success: true, rawData: rawDocument });
  } catch (err) {
    console.error("Document AI test failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadBrokerage = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // FIX 1: Typo "req.fil" -> "req.file"
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const rawDoc = await processDocumentRaw(
      req.file.buffer,
      req.file.mimetype,
      // FIX 2: Use the BROKERAGE ID, not the generic receipt one
      process.env.DOCUMENT_AI_BROKERAGE_ID,
      process.env.GOOGLE_CLOUD_PROJECT_ID,
    );

    const data = parseBrokerageStatement(rawDoc);

    const saved = await Investment.create({
      user: req.user,
      type: "brokerage_summary",
      period_start: data.period_start,
      period_end: data.period_end,
      // FIX 3: You had total_value twice. Keep only the correct mapping.
      total_value: data.ending_balance,
      holdings: data.holdings,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error("Brokerage Upload Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- CONTROLLER 2: HOLDINGS DETAIL ---
export const uploadHoldings = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // 1. Send to Google (Holdings Processor)
    const rawDoc = await processDocumentRaw(
      req.file.buffer,
      req.file.mimetype,
      process.env.DOCUMENT_AI_HOLDINGS_ID,
      process.env.GOOGLE_CLOUD_PROJECT_ID,
    );

    // 2. Parse
    const data = parseHoldingsStatement(rawDoc);

    // 3. Save
    const saved = await Investment.create({
      user: req.user,
      type: "holdings_detail",
      total_value: data.total_balance,
      total_dividends: data.total_dividends,
      holdings: data.holdings,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error("Holdings Upload Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- CONTROLLER 3: GET INVESTMENTS ---
export const getInvestments = async (req, res) => {
  try {
    const docs = await Investment.find({ user: req.user }).sort({
      uploadDate: -1,
    });
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
