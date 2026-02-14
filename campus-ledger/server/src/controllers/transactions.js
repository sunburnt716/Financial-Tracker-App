import { Transaction, Investment } from "../models/transactions.js";
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

// -------------------- HELPER: TRANSACTION NORMALIZATION --------------------

/**
 * Normalizes input from AI or frontend to DB-safe transaction.
 * Standardizes item names and handles currency string-to-number conversion.
 */
const normalizeInputTransaction = (input) => {
  const rawItems = input.metadata?.items || input.items || [];

  const items = rawItems.map((i) => ({
    item_name: i.item_name || i.name || "Unknown",
    item_price:
      typeof i.price === "string"
        ? Number(i.price.replace(/[$,]/g, ""))
        : i.item_price || i.price || 0,
  }));

  return normalizeTransactionData({
    name: input.name || input.company_name || "Unknown",
    price:
      typeof input.total_price === "string"
        ? Number(input.total_price.replace(/[$,]/g, ""))
        : input.price || input.total_price || 0,
    date: input.date ? new Date(input.date) : new Date(),
    metadata: { items },
  });
};

// -------------------- TRANSACTION CONTROLLERS (RECEIPTS/MANUAL) --------------------

export const createTransactions = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const savedTransactions = [];

    // Case A: File Upload (Receipt)
    if (req.file) {
      const rawDoc = await processDocumentRaw(
        req.file.buffer,
        req.file.mimetype,
        process.env.DOCUMENT_AI_PROCESSOR_ID,
        process.env.GOOGLE_CLOUD_PROJECT_ID,
      );
      const parsed = parseReceiptData(rawDoc);
      const normalized = normalizeInputTransaction(parsed);
      validateTransactionCreate(normalized);

      const saved = await Transaction.create({ ...normalized, user: req.user });
      savedTransactions.push(saved);
    }
    // Case B: Manual JSON Body (Single or Array)
    else if (req.body) {
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
      return res
        .status(400)
        .json({ success: false, message: "No data provided" });
    }

    res.status(201).json({ success: true, data: savedTransactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const extractTransaction = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const rawDoc = await processDocumentRaw(
      req.file.buffer,
      req.file.mimetype,
      process.env.DOCUMENT_AI_PROCESSOR_ID,
      process.env.GOOGLE_CLOUD_PROJECT_ID,
    );

    const parsed = parseReceiptData(rawDoc);
    const normalized = normalizeInputTransaction(parsed);
    validateTransactionCreate(normalized);

    const saved = await Transaction.create({ ...normalized, user: req.user });
    res.status(200).json({ success: true, transaction: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find({ user: req.user })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments({ user: req.user }),
    ]);

    res.status(200).json({
      success: true,
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const editTransactions = async (req, res) => {
  try {
    const updates = normalizeInputTransaction(req.body);
    validateTransactionUpdate(updates);
    const updated = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user },
      updates,
      { new: true },
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ success: true, transaction: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteTransactions = async (req, res) => {
  try {
    const deleted = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user,
    });
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// -------------------- INVESTMENT CONTROLLERS (STATEMENTS) --------------------

export const uploadBrokerage = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const rawDoc = await processDocumentRaw(
      req.file.buffer,
      req.file.mimetype,
      process.env.DOCUMENT_AI_BROKERAGE_ID,
      process.env.GOOGLE_CLOUD_PROJECT_ID,
    );

    const data = parseBrokerageStatement(rawDoc);

    const saved = await Investment.create({
      user: req.user,
      type: "brokerage_summary",
      period_start: data.period_start,
      period_end: data.period_end,
      total_value: data.total_value, // Normalized from parser
      holdings: data.holdings,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error("Brokerage Upload Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadHoldings = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const rawDoc = await processDocumentRaw(
      req.file.buffer,
      req.file.mimetype,
      process.env.DOCUMENT_AI_HOLDINGS_ID,
      process.env.GOOGLE_CLOUD_PROJECT_ID,
    );

    const data = parseHoldingsStatement(rawDoc);

    console.log("--- OUR PARSER RESULT ---");
    console.log(JSON.stringify(data, null, 2));

    //    if (!data.holdings || data.holdings.length === 0) {
    //      return res
    //        .status(422)
    //        .json({ success: false, message: "No holdings detected." });
    //    }

    const saved = await Investment.create({
      user: req.user,
      type: "holdings_detail",
      total_value: data.total_value, // Normalized key
      total_dividends: data.total_dividends,
      holdings: data.holdings,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error("Holdings Upload Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

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

export const deleteInvestment = async (req, res) => {
  try {
    const deleted = await Investment.findOneAndDelete({
      _id: req.params.id,
      user: req.user,
    });
    if (!deleted)
      return res.status(404).json({ message: "Investment not found" });
    res.status(200).json({ success: true, message: "Investment deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const editInvestment = async (req, res) => {
  try {
    const updated = await Investment.findOneAndUpdate(
      { _id: req.params.id, user: req.user },
      req.body,
      { new: true },
    );
    if (!updated)
      return res.status(404).json({ message: "Investment not found" });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// -------------------- UTILITY / TEST --------------------

export const testDocumentAI = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const rawDoc = await processDocumentRaw(
      req.file.buffer,
      req.file.mimetype,
      process.env.DOCUMENT_AI_PROCESSOR_ID,
      process.env.GOOGLE_CLOUD_PROJECT_ID,
    );
    res.status(200).json({ success: true, rawData: rawDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
