// src/services/documentProcessing.js

import Tesseract from "tesseract.js";
import { fileTypeFromBuffer } from "file-type";
import csvParser from "csv-parser";
import XLSX from "xlsx";
import { Readable } from "stream";

/**
 * Extract text from an image or PDF buffer using Tesseract OCR
 */
export const extractTextFromImage = async (buffer) => {
  try {
    const { data } = await Tesseract.recognize(buffer, "eng", {
      logger: (m) => console.log("OCR progress:", m),
    });
    return data.text;
  } catch (err) {
    console.error("Tesseract extraction failed:", err);
    throw new Error("OCR extraction failed");
  }
};

/**
 * Extract data from CSV buffer
 */
export const extractFromCSV = async (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer).pipe(csvParser());
    stream.on("data", (data) => results.push(data));
    stream.on("end", () => resolve(results));
    stream.on("error", (err) => reject(err));
  });
};

/**
 * Extract data from Excel buffer
 */
export const extractFromExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

/**
 * Main function to extract transactions from any document type
 */
export const extractTransactionDataFromDocument = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("No file provided");
  }

  const type = await fileTypeFromBuffer(file.buffer);
  if (!type) throw new Error("Could not detect file type");

  console.log("Detected file type:", type);

  let extractedData = [];

  if (type.mime.startsWith("image/") || type.mime === "application/pdf") {
    // Use OCR
    const text = await extractTextFromImage(file.buffer);
    extractedData = parseTransactionsFromText(text);
  } else if (type.ext === "csv") {
    extractedData = await extractFromCSV(file.buffer);
  } else if (["xls", "xlsx"].includes(type.ext)) {
    extractedData = extractFromExcel(file.buffer);
  } else {
    throw new Error(`Unsupported file type: ${type.mime}`);
  }

  if (!extractedData.length) {
    throw new Error("No transaction data found in document");
  }

  return extractedData;
};

/**
 * Convert raw text from OCR into structured transactions
 * Example: lines like "ItemName 12.34"
 */
/**
 * Convert raw text from OCR into structured transactions
 * - Uses receipt-level date if found
 * - Handles missing decimals in prices
 * - Ignores common non-item lines
 */
const parseTransactionsFromText = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const transactions = [];

  // Try to find a receipt-level date (YYYY-MM-DD)
  let receiptDate = null;
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    receiptDate = new Date(dateMatch[1]);
  }

  const ignoreWords = [
    "tel",
    "subtotal",
    "total",
    "ie",
    "ateOllz",
    "edit",
    "remove",
  ];

  for (let line of lines) {
    // Skip lines that contain noise words
    if (ignoreWords.some((w) => line.toLowerCase().includes(w))) continue;

    // Match name and price (allow missing decimal)
    const match = line.match(/^(.+?)\s+([\$]?[\d,]+\.?\d{0,2})$/);
    if (match) {
      let name = match[1].replace(/[^a-zA-Z0-9\s]/g, "").trim();
      let price = parseFloat(match[2].replace(/[$,]/g, ""));

      // Fix common OCR decimal misreads
      if (price > 1000) price = price / 100;

      if (!isNaN(price) && name.length > 0) {
        transactions.push({
          name,
          price,
          date: receiptDate || new Date(),
        });
      }
    }
  }

  // Safety fallback if nothing valid found
  if (transactions.length === 0) {
    transactions.push({
      name: "Unknown Item",
      price: 0,
      date: receiptDate || new Date(),
    });
  }

  return transactions;
};
