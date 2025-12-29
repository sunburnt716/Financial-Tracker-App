import { useState, useEffect } from "react";
import TransactionCard from "../components/TransactionCard";
import "../App.css";
import { mockTransactions } from "../data/mockTransactions";

export default function Transactions() {
  // --- STATE ---
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem("transactions");
    return saved ? JSON.parse(saved) : mockTransactions;
  });
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [showScanForm, setShowScanForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showThresholdForm, setShowThresholdForm] = useState(false);
  const [showAbove, setShowAbove] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(0);
  const [editingTxId, setEditingTxId] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(
    Number(localStorage.getItem("itemsPerPage")) || 10
  );
  const [totalPages, setTotalPages] = useState(1);
  const [scannedFile, setScannedFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const API_URL = "http://localhost:5000/api/transactions";
  const isFormOpen = showScanForm || showManualForm;

  // --- FETCH TRANSACTIONS ---
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch(`${API_URL}?page=${page}&limit=${limit}`);
        const data = await res.json();
        if (data.transactions && data.transactions.length > 0) {
          setTransactions((prev) => [...prev, ...data.transactions]);
        } else {
          alert("No transactions detected in document.");
        }
        setTotalPages(data.totalPages || 1);
        localStorage.setItem("itemsPerPage", limit);
      } catch (err) {
        console.error("Error fetching transactions", err);
      }
    };
    fetchTransactions();
  }, [page, limit]);

  // --- MANUAL TRANSACTION SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price: Number(price), date }),
      });
      if (!res.ok) throw new Error("Failed to create transaction");
      const newTx = await res.json();
      setTransactions((prev) => [...prev, newTx]);
      setName("");
      setPrice("");
      setDate("");
      setShowManualForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add transaction.");
    }
  };

  // --- DELETE TRANSACTION ---
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      const data = await res.json(); // parse backend JSON

      if (!res.ok)
        throw new Error(data.message || "Failed to delete transaction");

      // Remove the deleted transaction from state
      setTransactions((prev) => prev.filter((tx) => tx._id !== id));
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // --- EDIT TRANSACTION ---
  const handleEditSubmit = async (tx) => {
    try {
      const res = await fetch(`${API_URL}/${tx._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tx),
      });
      const data = await res.json();

      if (!res.ok)
        throw new Error(data.message || "Failed to update transaction");

      // Update transaction in state
      setTransactions((prev) =>
        prev.map((t) => (t._id === data.transaction._id ? data.transaction : t))
      );
      setEditingTxId(null);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const formatDate = (isoString) =>
    new Date(isoString).toISOString().split("T")[0];

  // --- SCAN FORM ---
  const handleScanSubmit = async () => {
    if (!scannedFile) return;
    setIsScanning(true);

    const formData = new FormData();
    formData.append("file", scannedFile);

    try {
      const res = await fetch(`${API_URL}/extract`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to scan document");

      const data = await res.json();

      if (data.transactions && data.transactions.length > 0) {
        setTransactions((prev) => [...prev, ...data.transactions]);
      } else {
        alert("No transactions detected in document.");
      }

      setScannedFile(null);
      setShowScanForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to scan document.");
    } finally {
      setIsScanning(false);
    }
  };

  // --- EXPORT EXCEL ---
  const handleExportExcel = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/export/excel");
      if (!response.ok) throw new Error("Failed to download file");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transactions.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Failed to export Excel file");
    }
  };

  return (
    <div
      className={`transaction-page-container ${
        !isFormOpen ? "centered-layout" : ""
      }`}
    >
      <div className={`transaction-page ${!isFormOpen ? "centered-page" : ""}`}>
        {/* LEFT SIDE */}
        <div className="transaction-page-left">
          <div className="dashboard-header fade-in">
            <h1>Choose your form of input</h1>
          </div>
          <div className="input-choice-buttons fade-in">
            <button
              className="transaction-button"
              onClick={() => {
                setShowScanForm((prev) => !prev);
                setShowManualForm(false);
                setShowThresholdForm(false);
              }}
            >
              Scan Document
            </button>
            <button
              className="transaction-button"
              style={{ marginLeft: "1rem" }}
              onClick={() => {
                setShowManualForm((prev) => !prev);
                setShowScanForm(false);
                setShowThresholdForm(false);
              }}
            >
              Manually Input Transactions
            </button>
          </div>

          {/* SCAN FORM */}
          {showScanForm && (
            <div className="transaction-form fade-in">
              <h3>Scan Document</h3>
              <label className="transaction-button">
                Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => setScannedFile(e.target.files[0])}
                />
              </label>
              <label className="transaction-button">
                Upload Document
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => setScannedFile(e.target.files[0])}
                />
              </label>
              {scannedFile && (
                <button
                  className="transaction-button-alternate"
                  onClick={handleScanSubmit}
                  disabled={isScanning}
                >
                  {isScanning ? "Scanning..." : "Process Receipt"}
                </button>
              )}
            </div>
          )}

          {/* MANUAL FORM */}
          {showManualForm && (
            <form className="transaction-form fade-in" onSubmit={handleSubmit}>
              <h3>Manual Transaction</h3>
              <div className="manual-form-inputs">
                <div className="input-group">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Transaction name"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Amount:</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Date:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="transaction-button">
                Add Transaction
              </button>
            </form>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div
          className={`transaction-page-right ${
            !isFormOpen ? "full-width" : ""
          }`}
        >
          <h2>
            {transactions.length ? "All Transactions" : "No Transactions Yet"}
          </h2>
          {transactions.length > 0 && (
            <button className="transaction-button" onClick={handleExportExcel}>
              Export to Excel File
            </button>
          )}
          {transactions.map((tx) => (
            <TransactionCard
              key={tx._id || Math.random()}
              transaction={tx}
              onDelete={() => handleDelete(tx._id)}
              onUpdate={() => setEditingTxId(tx._id)}
              editingTxId={editingTxId}
              setEditingTxId={setEditingTxId}
              handleEditSubmit={handleEditSubmit}
              formatDate={formatDate}
            />
          ))}

          {/* Pagination */}
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
    </div>
  );
}
