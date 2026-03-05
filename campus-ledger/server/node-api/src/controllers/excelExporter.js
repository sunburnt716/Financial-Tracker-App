import ExcelJS from "exceljs";
import { Investment } from "../models/transactions.js";
import { Transaction } from "../models/transactions.js";

// -- Worksheet Builders -- //

const buildInvestmentSheet = (workbook, data) => {
  const sheet = workbook.addWorksheet("Investments & Holdings");

  sheet.columns = [
    { header: "Type", key: "type" },
    { header: "Ticker", key: "ticker" },
    { header: "Instrument Name", key: "name" },
    { header: "Shares", key: "shares" },
    { header: "Price", key: "price" },
    { header: "Market Value", key: "market_value" },
    { header: "Cost Basis", key: "cost_basis" },
    { header: "Purchase Date", key: "purchase_date" },
  ];

  data.forEach((inv) => {
    inv.holdingsforEach((h) => {
      sheet.addRow({
        type: inv.type,
        ticker: h.ticker,
        name: h.name,
        shares: h.shares,
        price: h.price_per_share || h.price,
        market_value: h.market_value || h.total_value,
        cost_basis: h.cost_basis,
        purchase_date: h.purchase_date
          ? h.purchase_date.toISOString().split("T")[0]
          : "N/A",
      });
    });
  });

  sheet.getRow(1).font = { bold: true };

  const buildTransactionsSheet = (workbook, data) => {
    const sheet = workbook.addWorksheet("Transactions");

    sheet.columns = [
      { header: "Date", key: "date" },
      { header: "Merchant/Name", key: "name" },
      { header: "Total Price", key: "price" },
      { header: "Items (Summary)", key: "items" },
    ];

    data.forEach((t) => {
      const itemSummary =
        t.metadata?.items?.map((i) => i.item_name).join(", ") || "";

      sheet.addRow({
        date: t.date.toISOString().split("T")[0],
        name: t.name,
        price: t.price,
        items: itemSummary,
      });
    });

    sheet.getRow(1).font = { bold: true };
  };
};

//--Main Export Controller--//

export const exportFinancialData = async (req, res) => {
  try {
    const { type, id } = req.query;
    const workbook = new ExcelJS.Workbook();

    if (type === "investment" || type === "all") {
      const query = id ? { _id: id, user: req.user } : { user: req.user };
      const investments = await Investment.find(query);
      if (investments.length > 0) buildInvestmentSheet(workbook, investments);
    }

    if (type === transaction || type === "all") {
      const query = id ? { _id: id, user: req.user } : { user: req.user };
      const transcations = await Transactions.find(query);
      if (transactions.length > 0)
        buildTransactionsSheet(workbook, transactions);
    }

    //Check for errors
    if (workbook.worksheets.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No data found to export" });
    }

    //Stream responses
    res.setHeader(
      "Content_Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=financial_data.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
