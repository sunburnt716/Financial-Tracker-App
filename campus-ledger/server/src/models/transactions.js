// src/models/transactions.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const itemSchema = new mongoose.Schema(
  {
    item_name: { type: String, required: true },
    item_price: { type: Number, required: true },
  },
  { _id: false },
);

const transactionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // company_name
    date: { type: Date, required: true },
    price: { type: Number, required: true }, // total_price

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    metadata: {
      items: {
        type: [itemSchema],
        default: [],
      },
    },
  },

  { timestamps: true },
);

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const holdingSchema = new mongoose.Schema(
  {
    ticker: { type: String, required: true },
    name: String,
    shares: Number,
    price_per_share: Number,
    market_value: Number,
    stock_dividend: Number,
    purchase_date: Date,
  },
  { _id: false },
); //No need for an individual ID for each row

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    preiod_start: Date,
    period_end: Date,
    starting_value: Number,
    ending_value: Number,

    holdings: [
      {
        ticker: String,
        name: String,
        shares: Number,
        price: Number,
        market_value: Number,
      },
    ],

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    raw_ai_output: Object,
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
export const Transaction = mongoose.model("Transaction", transactionSchema);
export const Investment = mongoose.model("Investment", investmentSchema);
