import Transaction from "../models/transactionsModel.js";

// GET all transactions
export const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Transaction.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const transactions = await Transaction.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ transactions, totalPages });
  } catch (err) {
    console.error(err); // log actual error
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

// CREATE transaction
export const create = async (req, res) => {
  try {
    const { name, price, date } = req.body;
    const newTx = await Transaction.create({ name, price, date });
    res.status(201).json(newTx);
  } catch (err) {
    res.status(500).json({ error: "Failed to add transaction" });
  }
};

// UPDATE transaction
export const update = async (req, res) => {
  try {
    const updatedTx = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedTx)
      return res.status(404).json({ error: "Transaction not found" });

    res.json(updatedTx);
  } catch (err) {
    res.status(500).json({ error: "Failed to update transaction" });
  }
};

// DELETE transaction
export const remove = async (req, res) => {
  try {
    const deletedTx = await Transaction.findByIdAndDelete(req.params.id);

    if (!deletedTx)
      return res.status(404).json({ error: "Transaction not found" });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete transaction" });
  }
};
