// src/services/documentAI.js
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

const client = new DocumentProcessorServiceClient();

/**
 * Process a document buffer with Google Document AI
 * @param {Buffer} fileBuffer - The uploaded file buffer (from Multer)
 * @param {string} mimeType - MIME type of the file, e.g., "application/pdf" or "image/jpeg"
 * @param {string} processorId - Document AI processor ID
 * @param {string} projectId - Google Cloud project ID
 * @param {string} location - Processor location, default "us"
 */
export const processDocument = async (
  fileBuffer,
  mimeType,
  processorId,
  projectId,
  location = "us"
) => {
  try {
    if (!fileBuffer || !mimeType) {
      throw new Error("File buffer and MIME type required");
    }

    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    const request = {
      name,
      rawDocument: {
        content: fileBuffer,
        mimeType,
      },
    };

    const [result] = await client.processDocument(request);
    const { document } = result;

    // Parse structured transactions
    return parseDocumentEntities(document);
  } catch (err) {
    console.error("Document AI processing failed:", err);
    throw err;
  }
};

/**
 * Preprocess OCR text: split multi-word lines if needed and remove empty lines
 * @param {string} rawText
 * @returns {string[]} cleaned lines
 */
const preprocessOCR = (rawText) => {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const cleanedLines = [];

  lines.forEach((line) => {
    // Skip empty lines
    if (!line) return;

    // If line contains only numbers or special keywords, keep as-is
    if (/^\d+(\.\d{1,2})?$/.test(line)) {
      cleanedLines.push(line);
    } else {
      // Split words if line has multiple words (likely separate items misread by OCR)
      const words = line.split(/\s+/);
      cleanedLines.push(...words);
    }
  });

  return cleanedLines;
};

/**
 * Parse Google Document AI entities into structured transactions
 * Maps each number to the preceding item name
 * Ignores totals, tax, balance, and thank you lines
 * @param {object} document - Google Document AI document object
 * @returns {Array<{name: string, price: number, date: Date}>}
 */
export const parseDocumentEntities = (document) => {
  const ignoreKeywords = [
    "total",
    "sub-total",
    "sales tax",
    "balance",
    "thank you",
    "adress",
    "tel",
    "date",
    "time",
    "cash receipt",
  ];

  const lines = (document.text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const transactions = [];
  let currentNameLines = [];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Skip ignored lines immediately
    if (ignoreKeywords.some((kw) => lowerLine.includes(kw))) {
      currentNameLines = []; // reset if we hit a header or total
      continue;
    }

    // Check if line is a number (price)
    const priceMatch = line.match(/^\d+(\.\d{1,2})?$/);

    if (priceMatch) {
      // Combine collected lines as item name
      const name = currentNameLines.join(" ").trim();

      // Only add if name is not empty and does not contain ignore keywords
      if (
        name &&
        !ignoreKeywords.some((kw) => name.toLowerCase().includes(kw))
      ) {
        transactions.push({
          name,
          price: parseFloat(priceMatch[0]),
          date: new Date(),
        });
      }

      currentNameLines = []; // reset for next item
    } else {
      // Collect lines for the item name
      currentNameLines.push(line);
    }
  }

  return transactions;
};
