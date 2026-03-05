import { Transaction, Investment } from "../models/transactions.js";
import {
  validateTransactionCreate,
  validateTransactionUpdate,
  normalizeTransactionData,
} from "../utils/transaction.js";
import axios from "axios";
import FormData from "form-data";

// -------------------- NEW HELPER: PYTHON AI MICROSERVICE --------------------

/**
 * Sends the image buffer to the dynamically hosted Python microservice.
 * @param {Buffer} fileBuffer - The image uploaded by the user
 * @param {String} originalName - The actual filename of the uploaded file
 * @param {String} docType - 'receipt' or 'investment'
 */
const processWithPythonAI = async (fileBuffer, originalName, docType) => {
  const formData = new FormData();

  // 1. DYNAMIC FILENAME: Pass the actual name the user uploaded
  formData.append("file", fileBuffer, originalName || "document.jpg");
  formData.append("doc_type", docType);

  // 2. CLOUD-READY URL: Use environment variable, fallback to localhost for dev
  // e.g., process.env.AI_MICROSERVICE_URL = "https://my-python-app.onrender.com"
  const targetUrl = process.env.AI_MICROSERVICE_URL
    ? `${process.env.AI_MICROSERVICE_URL}/process-document`
    : "http://127.0.0.1:8000/process-document";

  const response = await axios.post(targetUrl, formData, {
    headers: { ...formData.getHeaders() },
  });

  return response.data.data;
};

// -------------------- HELPER: TRANSACTION NORMALIZATION --------------------

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
      // Pass the real filename dynamically
      const aiData = await processWithPythonAI(
        req.file.buffer,
        req.file.originalname,
        "receipt",
      );

      const normalized = normalizeInputTransaction(aiData);
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
    console.error("Create Transaction Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const extractTransaction = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const aiData = await processWithPythonAI(
      req.file.buffer,
      req.file.originalname,
      "receipt",
    );
    const normalized = normalizeInputTransaction(aiData);
    validateTransactionCreate(normalized);

    const saved = await Transaction.create({ ...normalized, user: req.user });
    res.status(200).json({ success: true, transaction: saved });
  } catch (err) {
    console.error("Extract Transaction Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    // Kept your exact logic for DB querying
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

    res
      .status(200)
      .json({
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

    const aiData = await processWithPythonAI(
      req.file.buffer,
      req.file.originalname,
      "investment",
    );

    const saved = await Investment.create({
      user: req.user,
      type: "brokerage_summary",
      period_start: aiData.period_start,
      period_end: aiData.period_end,
      starting_value: aiData.starting_value,
      ending_value: aiData.ending_value,
      total_value: aiData.total_value,
      holdings: aiData.holdings,
      status: aiData.status,
      raw_ai_output: aiData,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error("Brokerage Upload Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadHoldings = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const aiData = await processWithPythonAI(
      req.file.buffer,
      req.file.originalname,
      "investment",
    );

    const saved = await Investment.create({
      user: req.user,
      type: "holdings_detail",
      period_start: aiData.period_start,
      period_end: aiData.period_end,
      starting_value: aiData.starting_value,
      ending_value: aiData.ending_value,
      total_value: aiData.total_value,
      holdings: aiData.holdings,
      status: aiData.status,
      raw_ai_output: aiData,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error("Holdings Upload Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getInvestments = async (req, res) => {
  try {
    const docs = await Investment.find({ user: req.user }).sort({
      createdAt: -1,
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

    // Test the python connection directly
    const aiData = await processWithPythonAI(
      req.file.buffer,
      req.file.originalname,
      "receipt",
    );

    res.status(200).json({ success: true, rawData: aiData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
