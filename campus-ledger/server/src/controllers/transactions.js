import {
  processTransaction,
  getAllTransactions,
  updateTransaction,
  deleteTransaction,
} from "../services/transaction.js";
import { processDocument } from "../services/documentAI.js";
import Transaction from "../models/transactions.js";

/**
 * Create transactions controller
 * Handles raw transaction objects, arrays, or document uploads
 */
export const createTransactions = async (req, res) => {
  try {
    let transactionsData = [];

    // Check if a file was uploaded
    if (req.file) {
      // req.file is an object with buffer and mimetype
      transactionsData = await processTransaction(req.file, {
        source: "document",
      });
    } else if (req.body) {
      // Accept raw JSON array or single object
      const bodyData = Array.isArray(req.body) ? req.body : [req.body];
      // Process each transaction through the same service (validates & normalizes)
      transactionsData = [];
      for (const t of bodyData) {
        const transaction = await processTransaction(t);
        transactionsData.push(transaction);
      }
    } else {
      return res
        .status(400)
        .json({ error: "No transaction data or file provided" });
    }

    return res
      .status(201)
      .json({ message: "Transactions created", data: transactionsData });
  } catch (err) {
    console.error("Extraction failed:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Extract transaction from uploaded receipt via Gemini
export const extractTransaction = async (req, res) => {
  try {
    if (!req.file) {
      console.log("No file uploaded");
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log(
      "File received:",
      req.file.originalname,
      req.file.mimetype,
      req.file.size
    );

    // Step 1: process document using Document AI
    const transactions = await processDocument(
      req.file.buffer, // send the buffer
      req.file.mimetype, // send the MIME type
      process.env.DOCUMENT_AI_PROCESSOR_ID,
      process.env.GOOGLE_CLOUD_PROJECT_ID
    );

    console.log("Extracted transactions:", transactions); // debug

    const transactionsWithDate = transactions.map((t) => ({
      ...t,
      date: t.date || new Date(),
    }));

    const saved = await Transaction.insertMany(transactionsWithDate);

    console.log("Saved transactions:", saved);

    res
      .status(201)
      .json({ message: "Transactions extracted", transactions: saved });
  } catch (err) {
    console.error("Extraction failed:", err);
    res.status(500).json({ message: "Extraction failed", error: err.message });
  }
};

// Read all transactions
export const getTransactions = async (req, res) => {
  try {
    const transactions = await getAllTransactions();
    res.status(200).json({ success: true, transactions });
  } catch (err) {
    console.error("Get transactions failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update transaction by ID
export const editTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTransaction = await updateTransaction(id, req.body);
    res.status(200).json({ success: true, transaction: updatedTransaction });
  } catch (err) {
    console.error("Edit transaction failed:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Delete transaction by ID
export const deleteTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) throw new Error("No ID provided");

    await deleteTransaction(id);
    res.status(200).json({ success: true, message: "Transaction deleted" });
  } catch (err) {
    console.error("Delete transaction failed:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};
