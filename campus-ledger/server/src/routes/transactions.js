import express from "express";
import * as transactionsController from "../controllers/transactions.js";
import multer from "multer";

const router = express.Router();

// Multer memory storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// CRUD routes
router.get("/", transactionsController.getTransactions);
router.post("/", transactionsController.createTransactions);
router.put("/:id", transactionsController.editTransactions);
router.delete("/:id", transactionsController.deleteTransactions);

// /extract route for scanning documents via Gemini
router.post(
  "/extract",
  upload.single("file"), // file will be available in req.file
  transactionsController.extractTransaction // new dedicated controller
);

export default router;
