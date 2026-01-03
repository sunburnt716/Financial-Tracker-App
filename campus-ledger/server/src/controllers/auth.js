import { User } from "../models/transactions.js";
import jwt from "jsonwebtoken";

// --- SIGN UP ---
export const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const user = await User.create({ email, password });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ success: true, token, email: user.email });
  } catch (err) {
    console.error("Signup failed:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// --- LOGIN ---
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Return token and email
    res.status(200).json({ success: true, token, email: user.email });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
