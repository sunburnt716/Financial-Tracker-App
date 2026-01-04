// src/services/documentAI.js
import fs from "fs";
import path from "path";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

// -------------------- TEMP GOOGLE KEY FILE --------------------
// Path for temporary JSON file
const keyFilePath = path.join(process.cwd(), "temp-google-key.json");

// Write the JSON from environment variable if it doesn't exist
if (!fs.existsSync(keyFilePath)) {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    throw new Error(
      "Environment variable GOOGLE_APPLICATION_CREDENTIALS_JSON is missing!"
    );
  }

  fs.writeFileSync(
    keyFilePath,
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    { encoding: "utf8" }
  );
}

// -------------------- INITIALIZE DOCUMENT AI CLIENT --------------------
const client = new DocumentProcessorServiceClient({
  keyFile: keyFilePath,
});

// -------------------- PROCESS PARSED DOCUMENT --------------------
export function processDocumentAI(doc) {
  const entities = doc.entities || [];
  const text = doc.text || "";

  // --- Company name (first line of the text) ---
  const companyName = text.split("\n")[0] || null;

  // --- Date (first date pattern found) ---
  const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);
  const date = dateMatch ? dateMatch[0] : null;

  // --- Total price ---
  const totalEntity = entities.find((e) => e.type === "receipt_total");
  const totalPrice = totalEntity?.mentionText || null;

  // --- Item names ---
  const itemNames = entities
    .filter((e) => e.type === "item_name")
    .sort(
      (a, b) =>
        parseInt(a.textAnchor.textSegments[0].startIndex) -
        parseInt(b.textAnchor.textSegments[0].startIndex)
    )
    .map((e) => e.mentionText);

  // --- Item prices (only those starting with $) ---
  const itemPrices = entities
    .filter(
      (e) =>
        e.type === "item_price" &&
        typeof e.mentionText === "string" &&
        /^\$\d/.test(e.mentionText)
    )
    .sort(
      (a, b) =>
        parseInt(a.textAnchor.textSegments[0].startIndex) -
        parseInt(b.textAnchor.textSegments[0].startIndex)
    )
    .map((e) => e.mentionText);

  // --- Pair items and prices ---
  const items = itemNames.map((name, i) => ({
    name,
    price: itemPrices[i] || null,
  }));

  return {
    company_name: companyName,
    date,
    total_price: totalPrice,
    items,
  };
}

// -------------------- PROCESS RAW DOCUMENT --------------------
export const processDocumentRaw = async (
  fileBuffer,
  mimetype,
  processorId,
  projectId
) => {
  const request = {
    name: `projects/${projectId}/locations/us/processors/${processorId}`,
    rawDocument: {
      content: fileBuffer,
      mimeType: mimetype,
    },
  };

  const [result] = await client.processDocument(request);

  // Return the full raw JSON as-is
  return result.document;
};
