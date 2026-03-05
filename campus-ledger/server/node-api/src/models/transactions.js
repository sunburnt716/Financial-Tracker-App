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

// --- FIX 1: Made this schema robust and forgiving ---
const holdingSchema = new mongoose.Schema(
  {
    ticker: { type: String, default: "UNKNOWN" },
    name: { type: String, default: "" },
    shares: { type: Number, default: 0 },
    price_per_share: { type: Number, default: 0 },
    market_value: { type: Number, default: 0 },
    cost_basis: { type: Number, default: 0 },
    stock_dividend: { type: Number, default: 0 },
    purchase_date: { type: Date, default: null },
  },
  { _id: false },
);

// --- FIX 2 & 3: Fixed typos, aligned fields with DocumentAI ---
const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String }, // e.g., "holdings_detail" or "brokerage_summary"
    period_start: { type: Date, default: null }, // Fixed typo "preiod_start"
    period_end: { type: Date, default: null },

    // Aligned with what Document AI actually extracts
    total_value: { type: Number, default: 0 },
    total_dividends: { type: Number, default: 0 },
    starting_value: { type: Number, default: 0 },
    ending_value: { type: Number, default: 0 },

    // REPLACED the inline schema so it actually uses your holdingSchema!
    holdings: {
      type: [holdingSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    raw_ai_output: { type: Object },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
export const Transaction = mongoose.model("Transaction", transactionSchema);
export const Investment = mongoose.model("Investment", investmentSchema);
