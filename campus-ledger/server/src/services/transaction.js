// src/services/transaction.js
import { extractTransactionDataFromDocument } from "./documentProcessing.js";
import Transactions from "../models/transactions.js";
import {
  validateTransactionCreate,
  validateTransactionUpdate,
  normalizeTransactionData,
} from "../utils/transaction.js";

/**
 * Process a single transaction
 * Supports manual JSON or document input
 */
export const processTransaction = async (transactionData, options = {}) => {
  let rawData;

  if (options.source === "document") {
    // transactionData must be the full file object with buffer and mimetype
    rawData = await extractTransactionDataFromDocument(transactionData);
  } else {
    rawData = transactionData;
  }

  const normalizedInput = normalizeTransactionData(rawData);
  validateTransactionCreate(normalizedInput);

  const transaction = await Transactions.create(normalizedInput);
  return transaction;
};

/**
 * Get all transactions (sorted newest first)
 */
export const getAllTransactions = async () => {
  const transactions = await Transactions.find().sort({ date: -1 });
  return transactions;
};

/**
 * Update transaction by ID
 */
export const updateTransaction = async (id, updatedData) => {
  if (!id) {
    throw new Error("Transaction ID is required");
  }

  // Only normalize the fields that exist in updatedData
  const normalizedData = normalizeTransactionData({
    ...updatedData,
    metadata: updatedData.metadata || {},
  });

  validateTransactionUpdate(normalizedData);

  const updatedTransaction = await Transactions.findByIdAndUpdate(
    id,
    normalizedData,
    { new: true, runValidators: true }
  );

  if (!updatedTransaction) {
    throw new Error("Transaction not found");
  }

  return updatedTransaction;
};

/**
 * Delete transaction by ID
 */
export const deleteTransaction = async (id) => {
  if (!id) {
    throw new Error("Transaction ID is required");
  }

  const deletedTransaction = await Transactions.findByIdAndDelete(id);

  if (!deletedTransaction) {
    throw new Error("Transaction not found");
  }

  return deletedTransaction;
};
