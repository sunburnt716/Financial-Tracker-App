// src/utils/transaction.js

/**
 * Validate a transaction for creation
 * Ensures all required fields exist
 */
export const validateTransactionCreate = (data) => {
  const { name, date, price } = data;

  if (!name || !date || price === undefined) {
    throw new Error("Missing required transaction fields");
  }

  if (isNaN(Number(price))) {
    throw new Error("Price must be a number");
  }

  if (isNaN(new Date(date).getTime())) {
    throw new Error("Invalid date format");
  }

  return true;
};

/**
 * Validate a transaction for updates
 * Allows partial updates, only validates fields that exist
 */
export const validateTransactionUpdate = (data) => {
  if (!data || Object.keys(data).length === 0) {
    throw new Error("No fields provided for update");
  }

  if ("price" in data && isNaN(Number(data.price))) {
    throw new Error("Price must be a number");
  }

  if ("date" in data && isNaN(new Date(data.date).getTime())) {
    throw new Error("Invalid date format");
  }

  return true;
};

/**
 * Normalize transaction data for DB insertion
 */
export const normalizeTransactionData = (data) => {
  const { name, date, price, metadata = {} } = data;

  return {
    name: String(name).trim(),
    date: new Date(date),
    price: Number(price),
    metadata,
  };
};
