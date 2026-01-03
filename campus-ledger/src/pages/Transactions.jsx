import React, { useState, useEffect } from "react";
import TransactionCard from "../components/TransactionCard";
import LoginRequiredBanner from "../components/LoginRequiredBanner";
import "../App.css";
import { useNavigate } from "react-router-dom";

export default function Transactions() {
  const navigate = useNavigate();

  // --- Auth / User State ---
  const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail"));
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [showLoginPopup, setShowLoginPopup] = useState(!token);

  // --- Transaction State ---
  const [transactions, setTransactions] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [showScanForm, setShowScanForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
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

  // --- Fetch Transactions ---
  const fetchTransactions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to fetch transactions");

      setTransactions(data.transactions || []);
      setTotalPages(data.totalPages || 1);
      localStorage.setItem("itemsPerPage", limit);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  // --- Fetch on token/page/limit change + authChanged events ---
  useEffect(() => {
    fetchTransactions();
    const handleAuthChange = () => fetchTransactions();
    window.addEventListener("authChanged", handleAuthChange);
    return () => window.removeEventListener("authChanged", handleAuthChange);
  }, [token, page, limit]);

  // --- Logout ---
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setToken(null);
    setUserEmail(null);
    setTransactions([]); // clear transactions
    setShowLoginPopup(true);

    // Notify other components
    window.dispatchEvent(new Event("authChanged"));
  };

  const formatDate = (isoString) =>
    new Date(isoString).toISOString().split("T")[0];

  // --- Manual Transaction Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return setShowLoginPopup(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, price: Number(price), date }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to create transaction");

      // Reset form fields
      setName("");
      setPrice("");
      setDate("");
      setShowManualForm(false);

      // Reset to first page and refetch
      setPage(1);
      fetchTransactions(); // <- make sure this fetches with the current page & limit
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // --- Scan Document ---
  const handleScanSubmit = async () => {
    if (!scannedFile) return;
    if (!token) return setShowLoginPopup(true);

    setIsScanning(true);
    const formData = new FormData();
    formData.append("file", scannedFile);

    try {
      const res = await fetch(`${API_URL}/extract`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to scan document");

      setScannedFile(null);
      setShowScanForm(false);

      // Reset to first page and refetch
      setPage(1);
      fetchTransactions();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // --- Delete Transaction ---
  const handleDelete = async (id) => {
    if (!token) return setShowLoginPopup(true);

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to delete transaction");

      // If we deleted the last item on the page, go back a page
      if (transactions.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        fetchTransactions(); // re-sync with backend
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // --- Edit Transaction ---
  const handleEditSubmit = async (tx) => {
    if (!token) return setShowLoginPopup(true);

    try {
      const res = await fetch(`${API_URL}/${tx._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(tx),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to update transaction");

      setTransactions((prev) =>
        prev.map((t) => (t._id === data.transaction._id ? data.transaction : t))
      );
      setEditingTxId(null);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div
      className={`transaction-page-container ${
        !isFormOpen ? "centered-layout" : ""
      }`}
    >
      <LoginRequiredBanner
        userEmail={userEmail}
        onClose={() => setShowLoginPopup(false)}
      />

      <div className={`transaction-page ${!isFormOpen ? "centered-page" : ""}`}>
        {/* LEFT FORM SECTION */}
        <div className="transaction-page-left">
          <div className="dashboard-header fade-in">
            <h1>Choose your form of input</h1>
          </div>
          <div className="input-choice-buttons fade-in">
            <button
              className="transaction-button"
              onClick={() =>
                setShowScanForm((prev) => !prev) || setShowManualForm(false)
              }
            >
              Scan Document
            </button>
            <button
              className="transaction-button"
              style={{ marginLeft: "1rem" }}
              onClick={() =>
                setShowManualForm((prev) => !prev) || setShowScanForm(false)
              }
            >
              Manually Input Transactions
            </button>
          </div>

          {showScanForm && (
            <div className="transaction-form fade-in">
              <h3>Scan Document</h3>
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
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Amount:</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
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

        {/* RIGHT TRANSACTIONS LIST */}
        <div
          className={`transaction-page-right ${
            !isFormOpen ? "full-width" : ""
          }`}
        >
          <h2>
            {transactions.length ? "All Transactions" : "No Transactions Yet"}
          </h2>
          {transactions.map((tx) => (
            <TransactionCard
              key={tx._id}
              transaction={tx}
              onDelete={handleDelete}
              onUpdate={() => setEditingTxId(tx._id)}
              editingTxId={editingTxId}
              setEditingTxId={setEditingTxId}
              handleEditSubmit={handleEditSubmit}
              formatDate={formatDate}
            />
          ))}

          {/* PAGINATION */}
          {transactions.length > 0 && (
            <div className="pagination">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={page === totalPages}
              >
                Next
              </button>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
