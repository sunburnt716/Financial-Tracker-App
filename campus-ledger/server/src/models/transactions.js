// src/models/transaction.js
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    price: { type: Number, required: true },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("Transactions", transactionSchema);
