// src/services/documentAI.js
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

const client = new DocumentProcessorServiceClient();

export function processDocumentAI(doc) {
  const entities = doc.entities || [];
  const text = doc.text || "";

  // --- Extract company name (first line of the text) ---
  const companyName = text.split("\n")[0] || null;

  // --- Extract date (first date pattern found) ---
  const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);
  const date = dateMatch ? dateMatch[0] : null;

  // --- Extract total price ---
  const totalEntity = entities.find((e) => e.type === "receipt_total");
  const totalPrice = totalEntity?.mentionText || null;

  // --- Extract item names ---
  const itemNames = entities
    .filter((e) => e.type === "item_name")
    .sort(
      (a, b) =>
        parseInt(a.textAnchor.textSegments[0].startIndex) -
        parseInt(b.textAnchor.textSegments[0].startIndex)
    )
    .map((e) => e.mentionText);

  // --- Extract item prices (only prices starting with $) ---
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

  // --- Pair items and prices sequentially ---
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

export const processDocumentRaw = async (
  fileBuffer,
  mimetype,
  processorId,
  projectId
) => {
  const client = new DocumentProcessorServiceClient();
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
