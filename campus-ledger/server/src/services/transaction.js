// src/services/transaction.js

import { extractTransactionDataFromDocument } from "./documentProcessing.js";
import Transactions from "../models/transactions.js";
import {
  validateTransactionData,
  normalizeTransactionData,
} from "../utils/transaction.js";

export const processTransaction = async (transactionData, options = {}) => {
  let rawData;

  if (options.source === "document") {
    // transactionData must be the full file object with buffer and mimetype
    rawData = await extractTransactionDataFromDocument(transactionData);
  } else {
    rawData = transactionData;
  }

  // Validate & normalize
  validateTransactionData(rawData);
  const normalizedInput = normalizeTransactionData(rawData);

  const transaction = await Transactions.create(normalizedInput);
  return transaction;
};

export const getAllTransactions = async () => {
  const transactions = await Transactions.find().sort({ date: -1 });
  return transactions;
};

export const updateTransaction = async (id, updatedData) => {
  if (!id) {
    throw new Error("Transaction ID is required");
  }

  const normalizedData = normalizeTransactionData({
    ...updatedData,
    metadata: updatedData.metadata || {},
  });

  validateTransactionData(normalizedData);

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
