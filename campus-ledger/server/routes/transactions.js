import express from "express";
const router = express.Router();

//temporary transaction array to store data from server
let transactions = [];

//receive transactions from server, send to client (frontend)
router.get("/", (req, res) => {
  res.json(transactions);
});

// adds newly created data into transactions and pushes it back to client
router.post("/", (req, res) => {
  const tx = { id: Date.now(), ...req.body };
  transactions.push(tx);
  res.status(201).json(tx);
});

router.delete("/:id", (req, res) => {
  const { id } = req.params; //pulls id from backend
  const index = transactions.findIndex((tx) => tx.id === Number(id));
  //finds the index of chosen id

  if (index !== -1) {
    const deleted = transactions.splice(index, 1);
    res.json({ message: "Transaction deleted", deleted });
  } else {
    res.status(404).json({ message: "Transaction not found" });
  }
});
export default router;
