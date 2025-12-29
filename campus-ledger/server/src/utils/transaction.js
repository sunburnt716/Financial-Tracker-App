// src/utils/transaction.js

export const validateTransactionData = (data) => {
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

export const normalizeTransactionData = (data) => {
  const { name, date, price, metadata = {} } = data;

  return {
    name: String(name).trim(),
    date: new Date(date),
    price: Number(price),
    metadata,
  };
};

// Helper functions to validate incoming and outgoing data from/to the DB
