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

const parseMoney = (val) => {
  if (!val) return 0;
  let clean = String(val).replace(/[$,]/g, "").trim();
  if (clean.startsWith("(") && clean.endsWith(")")) {
    clean = "-" + clean.slice(1, -1);
  }
  return parseFloat(clean) || 0;
};

const parseNumber = (val) => {
  if (!val) return 0;
  return parseFloat(String(val).replace(/,/g, "").trim()) || 0;
};

/**
 * Ensures we don't save "Invalid Date" to Mongo
 */
const safeDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// -------------------- PARSER 1: RECEIPTS (Legacy) --------------------
// Kept as-is for your everyday transaction flow
export function parseReceiptData(doc) {
  const entities = doc.entities || [];
  const text = doc.text || "";

  const companyName = text.split("\n")[0] || null;
  const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);
  const date = dateMatch ? dateMatch[0] : null;
  const totalEntity = entities.find((e) => e.type === "receipt_total");
  const totalPrice = totalEntity?.mentionText || null;

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
export function parseBrokerageStatement(doc) {
  const entities = doc.entities || [];

  const result = {
    type: "brokerage_summary",
    period_start: null,
    period_end: null,
    total_value: 0,
    holdings: [],
  };

  entities.forEach((entity) => {
    const typeStr = String(entity.type || "")
      .toLowerCase()
      .trim();
    const value = entity.mentionText;

    // Fuzzy matching for top-level dates and values
    if (typeStr.includes("beginning") || typeStr.includes("start"))
      result.period_start = safeDate(value);
    if (
      (typeStr.includes("ending") && typeStr.includes("date")) ||
      typeStr === "ending_date"
    )
      result.period_end = safeDate(value);
    if (typeStr.includes("portfolio_value") || typeStr.includes("total_value"))
      result.total_value = parseMoney(value);

    // Fuzzy matching for the holding rows
    if (typeStr.includes("holding") && entity.properties) {
      const holding = {
        ticker: "",
        name: "",
        shares: 0,
        price_per_share: 0,
        market_value: 0,
      };

      entity.properties.forEach((child) => {
        const childType = String(child.type || "")
          .toLowerCase()
          .trim();
        const val = child.mentionText || "";

        if (childType.includes("ticker"))
          holding.ticker = val.trim().toUpperCase();
        if (childType.includes("name")) holding.name = val.trim();
        if (childType.includes("shares") || childType.includes("quantity"))
          holding.shares = parseNumber(val);
        if (childType.includes("price"))
          holding.price_per_share = parseMoney(val);
        if (childType.includes("value") || childType.includes("balance"))
          holding.market_value = parseMoney(val);
      });

      // Fallbacks so the database never crashes
      if (!holding.name) holding.name = holding.ticker || "Unknown Asset";
      if (!holding.ticker) holding.ticker = "N/A";

      // Keep the row if it has ANY financial validity
      if (
        holding.market_value > 0 ||
        holding.shares > 0 ||
        holding.ticker !== "N/A"
      ) {
        result.holdings.push(holding);
      }
    }
  });

  return result;
}

// -------------------- PARSER 3: HOLDINGS STATEMENT --------------------
export function parseHoldingsStatement(doc) {
  const entities = doc.entities || [];

  const result = {
    type: "holdings_detail",
    total_value: 0,
    total_dividends: 0,
    holdings: [],
  };

  entities.forEach((entity) => {
    const typeStr = String(entity.type || "")
      .toLowerCase()
      .trim();
    const value = entity.mentionText;

    if (typeStr.includes("total_balance") || typeStr.includes("total_value"))
      result.total_value = parseMoney(value);
    if (typeStr.includes("total_dividends") || typeStr.includes("dividend"))
      result.total_dividends = parseMoney(value);

    if (typeStr.includes("holding") && entity.properties) {
      const holding = {
        ticker: "",
        name: "",
        shares: 0,
        market_value: 0,
        price_per_share: 0,
        cost_basis: 0,
        stock_dividend: 0,
        purchase_date: null,
      };

      entity.properties.forEach((child) => {
        const childType = String(child.type || "")
          .toLowerCase()
          .trim();
        const val = child.mentionText || "";

        if (childType.includes("ticker"))
          holding.ticker = val.trim().toUpperCase();
        if (childType.includes("name")) holding.name = val.trim();
        if (childType.includes("shares") || childType.includes("quantity"))
          holding.shares = parseNumber(val);
        if (childType.includes("market_value") || childType.includes("balance"))
          holding.market_value = parseMoney(val);
        if (childType.includes("price"))
          holding.price_per_share = parseMoney(val);
        if (childType.includes("cost")) holding.cost_basis = parseMoney(val);
        if (childType.includes("dividend"))
          holding.stock_dividend = parseMoney(val);
        if (childType.includes("date")) holding.purchase_date = safeDate(val);
      });

      // Fallbacks so the database never crashes
      if (!holding.name) holding.name = holding.ticker || "Unknown Asset";
      if (!holding.ticker) holding.ticker = "N/A";

      // Keep the row if it has ANY financial validity
      if (
        holding.market_value > 0 ||
        holding.shares > 0 ||
        holding.ticker !== "N/A"
      ) {
        result.holdings.push(holding);
      }
    }
  });

  return result;
}

// -------------------- MAIN: PROCESS RAW DOCUMENT --------------------
export const processDocumentRaw = async (
  fileBuffer,
  mimetype,
  processorId,
  projectId,
) => {
  const request = {
    name: `projects/${projectId}/locations/us/processors/${processorId}`,
    rawDocument: {
      content: fileBuffer,
      mimetype: mimetype,
    },
  };

  const [result] = await client.processDocument(request);

  return result.document;
};
