import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

// Create the model using the schema
const Transaction = mongoose.model("Transaction", transactionSchema);

Transaction.schema.index({ date: 1 }); //ascending order index on date after get request

export default Transaction;
