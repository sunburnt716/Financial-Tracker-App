// src/models/transactions.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const itemSchema = new mongoose.Schema(
  {
    item_name: { type: String, required: true },
    item_price: { type: Number, required: true },
  },
  { _id: false }
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

  { timestamps: true }
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

export const User = mongoose.model("User", userSchema);
export const Transaction = mongoose.model("Transaction", transactionSchema);
