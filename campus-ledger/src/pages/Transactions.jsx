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
  const [editingTx, setEditingTx] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => {
    return Number(localStorage.getItem("itemsPerPage")) || 10;
  });
  const [totalPages, setTotalPages] = useState(1);

  const API_URL = "http://localhost:5000/api/transactions"; // backend URL

  // Fetch transactions from backend on component mount
  useEffect(() => {
    async function fetchTransactions() {
      try {
        const res = await fetch(`${API_URL}?page=${page}&limit=${limit}`);
        const data = await res.json();

        setTransactions(data.transactions || data);
        setTotalPages(data.totalPages || 1);
        localStorage.setItem("itemsPerPage", limit);
      } catch (err) {
        console.error("Error fetching transactions", err);
      }
    }

    fetchTransactions();
  }, [page, limit]);

  // Add new transaction
  const handleSubmit = (e) => {
    e.preventDefault();
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: Number(price), date }),
    })
      .then((res) => res.json())
      .then((newTx) => {
        setTransactions((prev) => [...prev, newTx]); // append new transaction
        setName("");
        setPrice("");
        setDate("");
      })
      .catch((err) => console.error("Error adding transaction", err));
  };

  // Delete transaction
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTransactions((prev) => prev.filter((tx) => tx._id !== id));
      }
    } catch (err) {
      console.error("Error deleting transaction", err);
    }
  };

  // Edit transaction (show edit form)
  const handleEdit = (tx) => setEditingTx(tx);

  // Submit threshold filter
  const handleThresholdSubmit = (e) => {
    e.preventDefault();
    const filtered = transactions.filter((t) =>
      showAbove ? t.price > thresholdValue : t.price < thresholdValue
    );
    setFilteredTransactions(filtered);
    setShowThresholdForm(false);
  };

  // Clear threshold filter
  const clearFilter = () => {
    setFilteredTransactions([]);
    setThresholdValue(0);
  };

  const displayTransactions =
    filteredTransactions.length > 0 ? filteredTransactions : transactions;

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="transaction-page">
      <h1 className="transaction-page-header">Transactions</h1>

      {/* Left Side — Add Transaction + Filter */}
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

      {/* Right Side — Transaction List */}
      <div className="transaction-page-right">
        <h2>
          {filteredTransactions.length > 0
            ? "Filtered Transactions"
            : "All Transactions"}
        </h2>

        {displayTransactions.map((t) => (
          <TransactionCard
            key={t._id} // use MongoDB _id
            name={t.name}
            price={t.price}
            date={formatDate(t.date)}
            onDelete={() => handleDelete(t._id)}
            onUpdate={() => handleEdit(t)}
          />
        ))}

        {/* Edit Form */}
        {editingTx && (
          <form
            className="transaction-form"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch(`${API_URL}/${editingTx._id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(editingTx),
                });

                if (res.ok) {
                  const updatedTx = await res.json();

                  setTransactions((prev) =>
                    prev.map((tx) =>
                      tx._id === updatedTx._id ? updatedTx : tx
                    )
                  );

                  setEditingTx(null);
                }
              } catch (err) {
                console.error("Error updating transaction", err);
              }
            }}
          >
            <h3>Editing: {editingTx.name}</h3>
            <input
              type="text"
              value={editingTx.name}
              onChange={(e) =>
                setEditingTx({ ...editingTx, name: e.target.value })
              }
              required
            />
            <input
              type="number"
              value={editingTx.price}
              onChange={(e) =>
                setEditingTx({ ...editingTx, price: Number(e.target.value) })
              }
              required
            />
            <input
              type="date"
              value={editingTx.date}
              onChange={(e) =>
                setEditingTx({ ...editingTx, date: e.target.value })
              }
              required
            />
            <button type="submit" className="transaction-button">
              Save Changes
            </button>
            <button
              type="button"
              className="transaction-button-alternate"
              onClick={() => setEditingTx(null)}
            >
              Cancel
            </button>
          </form>
        )}

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
        <div className="pagination">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
          >
            Next
          </button>

          <label>
            Items per page:
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
