import fs from "fs";
import path from "path";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

// -------------------- SETUP & AUTH --------------------
const privateKey = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;

const client = new DocumentProcessorServiceClient({
  apiEndpoint: "us-documentai.googleapis.com",
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey,
  },
});

// -------------------- HELPER UTILS --------------------

/**
 * Turns "$10,500.00", "10,500.00", or "(500.00)" into a Number.
 * Handles negatives in parens if necessary.
 */
const parseMoney = (val) => {
  if (!val) return 0;
  let clean = String(val).replace(/[$,]/g, "").trim();
  // Handle "(100)" as negative -100 (Common in finance)
  if (clean.startsWith("(") && clean.endsWith(")")) {
    clean = "-" + clean.slice(1, -1);
  }
  return parseFloat(clean) || 0;
};

/**
 * Turns "1,000" into 1000
 */
const parseNumber = (val) => {
  if (!val) return 0;
  return parseFloat(String(val).replace(/,/g, "").trim()) || 0;
};

// -------------------- PARSER 1: RECEIPTS (Legacy) --------------------
export function parseReceiptData(doc) {
  const entities = doc.entities || [];
  const text = doc.text || "";

  // Original Logic
  const companyName = text.split("\n")[0] || null;
  const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);
  const date = dateMatch ? dateMatch[0] : null;
  const totalEntity = entities.find((e) => e.type === "receipt_total");
  const totalPrice = totalEntity?.mentionText || null;

  // Items (Flat List Heuristic)
  const itemNames = entities
    .filter((e) => e.type === "item_name")
    .sort(
      (a, b) =>
        parseInt(a.textAnchor.textSegments[0].startIndex) -
        parseInt(b.textAnchor.textSegments[0].startIndex),
    )
    .map((e) => e.mentionText);

  const itemPrices = entities
    .filter((e) => e.type === "item_price" && /^\$\d/.test(e.mentionText))
    .sort(
      (a, b) =>
        parseInt(a.textAnchor.textSegments[0].startIndex) -
        parseInt(b.textAnchor.textSegments[0].startIndex),
    )
    .map((e) => e.mentionText);

  const items = itemNames.map((name, i) => ({
    name,
    price: itemPrices[i] || null,
  }));

  return {
    type: "receipt",
    company_name: companyName,
    date,
    total_price: totalPrice,
    items,
  };
}

// -------------------- PARSER 2: BROKERAGE STATEMENT --------------------
// Focus: Portfolio Summary + Basic Holdings
export function parseBrokerageStatement(doc) {
  const entities = doc.entities || [];

  const result = {
    type: "brokerage_statement",
    period_start: null,
    period_end: null,
    beginning_balance: 0,
    ending_balance: 0,
    holdings: [],
  };

  entities.forEach((entity) => {
    const type = entity.type;
    const value = entity.mentionText || "";

    // Header Fields
    if (type === "beginning_date") result.period_start = new Date(value);
    if (type === "ending_date") result.period_end = new Date(value);
    if (type === "beginning_portfolio_value")
      result.beginning_balance = parseMoney(value);
    if (type === "ending_portfolio_value")
      result.ending_balance = parseMoney(value);

    // Parent Entity: holding_row
    if (type === "holding_row" && entity.properties) {
      const holding = {
        ticker: "UNKNOWN",
        name: "",
        shares: 0,
        price: 0,
        total_value: 0,
      };

      entity.properties.forEach((child) => {
        if (child.type === "ticker_symbol") holding.ticker = child.mentionText;
        if (child.type === "stock_full_name") holding.name = child.mentionText;
        if (child.type === "num_of_shares")
          holding.shares = parseNumber(child.mentionText);
        if (child.type === "market_price")
          holding.price = parseMoney(child.mentionText);
        if (child.type === "market_value")
          holding.total_value = parseMoney(child.mentionText);
      });

      if (holding.ticker !== "UNKNOWN") result.holdings.push(holding);
    }
  });

  return result;
}

// -------------------- PARSER 3: HOLDINGS STATEMENT --------------------
// Focus: Detailed positions (Cost basis, dividends, etc.)
export function parseHoldingsStatement(doc) {
  const entities = doc.entities || [];

  const result = {
    type: "holdings_statement",
    total_balance: 0,
    total_dividends: 0,
    holdings: [],
  };

  entities.forEach((entity) => {
    const type = entity.type;
    const value = entity.mentionText || "";

    // Header Fields
    if (type === "total_balance") result.total_balance = parseMoney(value);
    if (type === "total_dividends") result.total_dividends = parseMoney(value);

    // Parent Entity: holding_row (Now with NEW fields)
    if (type === "holding_row" && entity.properties) {
      const holding = {
        ticker: "UNKNOWN",
        name: "",
        shares: 0,
        market_value: 0,
        price_per_share: 0,
        cost_basis: 0,
        stock_dividend: 0,
        purchase_date: null,
      };

      entity.properties.forEach((child) => {
        const val = child.mentionText;
        if (child.type === "ticker_symbol") holding.ticker = val;
        if (child.type === "instrument_name") holding.name = val;
        if (child.type === "num_of_shares") holding.shares = parseNumber(val);
        if (child.type === "market_value")
          holding.market_value = parseMoney(val);
        if (child.type === "price_per_share")
          holding.price_per_share = parseMoney(val);
        if (child.type === "cost_basis") holding.cost_basis = parseMoney(val);
        if (child.type === "stock_dividend")
          holding.stock_dividend = parseMoney(val);
        if (child.type === "stock_purchase_date")
          holding.purchase_date = new Date(val);
      });

      if (holding.ticker !== "UNKNOWN") result.holdings.push(holding);
    }
  });

  return result;
}

// -------------------- MAIN: PROCESS RAW DOCUMENT --------------------
export const processDocumentRaw = async (
  fileBuffer,
  mimetype,
  processorId, // Pass the correct ID (Receipt, Brokerage, or Holding)
  projectId,
) => {
  const request = {
    name: `projects/${projectId}/locations/us/processors/${processorId}`,
    rawDocument: {
      content: fileBuffer,
      mimeType: mimetype,
    },
  };

  const [result] = await client.processDocument(request);
  return result.document;
};
