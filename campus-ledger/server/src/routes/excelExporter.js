import express from "express";
import { exportFinancialData } from "../controllers/excelExporter.js";

const router = express.Router();

/**
 * @route   GET /api/export
 * @desc    Export financial data (Investments, Transactions, or both) to Excel
 * @access  Private
 * @query   type (all | investment | transaction)
 * @query   id (optional, for exporting a specific record)
 */
router.get("/", exportFinancialData);

export default router;
