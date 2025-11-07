import { useState, useEffect } from "react";
import TransactionCard from "../components/TransactionCard";
import "../App.css";
import { mockTransactions } from "../data/mockTransactions";

export default function Transactions() {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem("transactions");
    return saved ? JSON.parse(saved) : mockTransactions;
  });

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [showAbove, setShowAbove] = useState(false);
  const [showThresholdForm, setShowThresholdForm] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(0);
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  useEffect(() => {
    fetch("/api/transactions")
      .then((res) => res.json())
      .then(setTransactions);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault(); //stops page from reloading

    fetch("/api/transactions", {
      method: "POST", //HTTP metadata
      headers: { "Content-Type": "application/json" }, //HTTP metadata
      //converts data into readable JSON strings
      body: JSON.stringify({ name, price: Number(price), date }),
    })
      //Updates local state, so that UI refreshes back to empty
      .then((res) => res.json())
      .then((newTx) => {
        setTransactions((prev) => [...prev, newTx]);
        setName("");
        setPrice("");
        setDate("");
      })
      .catch((err) => console.error("Error adding transaction", err));
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTransactions((prev) => prev.filter((tx) => tx.id !== id));
      }
    } catch (err) {
      console.error("Error deleting transaction", err);
    }
  };

  const handleThresholdSubmit = (e) => {
    e.preventDefault();
    const filtered = transactions.filter((t) =>
      showAbove ? t.price > thresholdValue : t.price < thresholdValue
    );
    setFilteredTransactions(filtered);
    setShowThresholdForm(false);
  };

  const clearFilter = () => {
    setFilteredTransactions([]);
    setThresholdValue(0);
  };

  const displayTransactions =
    filteredTransactions.length > 0 ? filteredTransactions : transactions;

  return (
    <div className="transaction-page">
      <h1 className="transaction-page-header">Transactions</h1>

      <div className="transaction-page-left">
        <form className="transaction-form" onSubmit={handleSubmit}>
          <label htmlFor="transactionName">Enter transaction name:</label>
          <input
            id="transactionName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label htmlFor="transactionAmount">Enter transaction amount:</label>
          <input
            id="transactionAmount"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />

          <label htmlFor="transactionDate">Enter date of transaction:</label>
          <input
            id="transactionDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <button className="transaction-button" type="submit">
            Submit Transaction
          </button>
        </form>

        <button
          className="transaction-button-alternate"
          onClick={() => setShowThresholdForm(true)}
        >
          Set Threshold
        </button>

        {showThresholdForm && (
          <form className="transaction-form" onSubmit={handleThresholdSubmit}>
            <label>
              Threshold Amount:
              <input
                type="number"
                value={thresholdValue}
                className="transaction-input"
                onChange={(e) => setThresholdValue(Number(e.target.value))}
                required
              />
            </label>

            <label>
              Show Above or Below?
              <select
                value={showAbove ? "above" : "below"}
                onChange={(e) => setShowAbove(e.target.value === "above")}
                className="transaction-select"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </label>

            <button type="submit">Apply Filter</button>
          </form>
        )}
      </div>

      <div className="transaction-page-right">
        <h2>
          {filteredTransactions.length > 0
            ? "Filtered Transactions"
            : "All Transactions"}
        </h2>

        {displayTransactions.map((t) => (
          <TransactionCard
            key={t.id}
            name={t.name}
            price={t.price}
            date={t.date}
            onDelete={() => handleDelete(t.id)}
          />
        ))}

        {filteredTransactions.length > 0 ? (
          <button
            className="transaction-button-alternate"
            type="button"
            onClick={clearFilter}
          >
            Clear Filter
          </button>
        ) : (
          <p style={{ color: "#888", marginTop: "1rem" }}>
            No filter currently applied
          </p>
        )}
      </div>
    </div>
  );
}
