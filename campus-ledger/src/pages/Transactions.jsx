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

  // --- Form Visibility State ---
  const [showScanForm, setShowScanForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingTxId, setEditingTxId] = useState(null);

  // --- Pagination State ---
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(
    Number(localStorage.getItem("itemsPerPage")) || 10,
  );
  const [totalPages, setTotalPages] = useState(1);

  // --- Scan / Upload State ---
  const [scannedFile, setScannedFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // --- NEW: Document Type Selection State ---
  const [scanType, setScanType] = useState(null); // 'transaction' | 'investment'
  const [investmentType, setInvestmentType] = useState(null); // 'brokerage' | 'holdings'

  const API_URL = import.meta.env.VITE_API_URL + "/api/transactions";
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

  useEffect(() => {
    fetchTransactions();
    const handleAuthChange = () => {
      setToken(localStorage.getItem("token"));
      setUserEmail(localStorage.getItem("userEmail"));
      fetchTransactions();
    };
    window.addEventListener("authChanged", handleAuthChange);
    return () => window.removeEventListener("authChanged", handleAuthChange);
  }, [token, page, limit]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setToken(null);
    setUserEmail(null);
    setTransactions([]);
    setShowLoginPopup(true);
    window.dispatchEvent(new Event("authChanged"));
  };

  const formatDate = (isoString) =>
    new Date(isoString).toISOString().split("T")[0];

  // --- Reset Forms Helper ---
  const resetForms = () => {
    setShowScanForm(false);
    setShowManualForm(false);
    setScannedFile(null);
    setScanType(null); // Reset selection
    setInvestmentType(null); // Reset selection
  };

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

      setName("");
      setPrice("");
      setDate("");
      resetForms(); // Close form
      setPage(1);
      fetchTransactions();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // --- NEW: Handle Smart Scan Submit ---
  const handleScanSubmit = async () => {
    if (!scannedFile) return alert("No file selected!");
    if (!token) return setShowLoginPopup(true);

    setIsScanning(true);
    const formData = new FormData();
    formData.append("file", scannedFile);

    // 1. Determine the correct endpoint based on user selection
    let targetEndpoint = `${API_URL}/extract`; // Default: Transaction (Receipt)

    if (scanType === "investment") {
      if (investmentType === "brokerage") {
        targetEndpoint = `${API_URL}/investments/brokerage`;
      } else if (investmentType === "holdings") {
        targetEndpoint = `${API_URL}/investments/holdings`;
      }
    }

    try {
      console.log(`Uploading to: ${targetEndpoint}`); // Debugging

      const res = await fetch(targetEndpoint, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to scan document");

      // Success!
      alert(
        scanType === "investment"
          ? "Investment Document Processed Successfully!"
          : "Receipt Processed Successfully!",
      );

      resetForms();
      setPage(1);
      fetchTransactions(); // Note: Investments won't appear here yet, but receipts will.
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsScanning(false);
    }
  };

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

      if (transactions.length === 1 && page > 1) setPage((prev) => prev - 1);
      else fetchTransactions();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

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
        prev.map((t) =>
          t._id === data.transaction._id ? data.transaction : t,
        ),
      );
      setEditingTxId(null);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div
      className={`transaction-page-container ${!isFormOpen ? "centered-layout" : ""}`}
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

          {/* Main Toggle Buttons */}
          <div className="input-choice-buttons fade-in">
            <button
              className={`transaction-button ${showScanForm ? "active" : ""}`}
              onClick={() => {
                setShowScanForm((prev) => !prev);
                setShowManualForm(false);
                // Reset internal state when toggling
                setScanType(null);
                setInvestmentType(null);
                setScannedFile(null);
              }}
            >
              Scan Document
            </button>
            <button
              className={`transaction-button ${showManualForm ? "active" : ""}`}
              style={{ marginLeft: "1rem" }}
              onClick={() => {
                setShowManualForm((prev) => !prev);
                setShowScanForm(false);
              }}
            >
              Manually Input
            </button>
          </div>

          {/* --- SMART SCAN FORM --- */}
          {showScanForm && (
            <div className="transaction-form fade-in">
              <h3>Scan Document</h3>

              {/* STEP 1: Transaction vs Investment */}
              {!scanType && (
                <div className="scan-step">
                  <p>What type of document is this?</p>
                  <div
                    className="scan-options-vertical"
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexDirection: "column",
                    }}
                  >
                    <button
                      className="transaction-button-outline"
                      onClick={() => setScanType("transaction")}
                    >
                      🧾 Transaction (Receipt)
                    </button>
                    <button
                      className="transaction-button-outline"
                      onClick={() => setScanType("investment")}
                    >
                      📈 Investment Document
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Investment Sub-Type */}
              {scanType === "investment" && !investmentType && (
                <div className="scan-step">
                  <p>What kind of Investment document?</p>
                  <div
                    className="scan-options-vertical"
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexDirection: "column",
                    }}
                  >
                    <button
                      className="transaction-button-outline"
                      onClick={() => setInvestmentType("brokerage")}
                    >
                      Brokerage Summary
                    </button>
                    <button
                      className="transaction-button-outline"
                      onClick={() => setInvestmentType("holdings")}
                    >
                      Holdings Detail
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setScanType(null)}
                      style={{
                        marginTop: "10px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#666",
                      }}
                    >
                      &larr; Go Back
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Upload File (Shown only when type is fully selected) */}
              {(scanType === "transaction" ||
                (scanType === "investment" && investmentType)) && (
                <>
                  <div
                    className="current-selection-badge"
                    style={{
                      marginBottom: "1rem",
                      padding: "5px",
                      background: "#f0f0f0",
                      borderRadius: "5px",
                      fontSize: "0.9rem",
                    }}
                  >
                    Selected:{" "}
                    <strong>
                      {scanType === "transaction"
                        ? "Receipt"
                        : investmentType === "brokerage"
                          ? "Brokerage Stmt"
                          : "Holdings Stmt"}
                    </strong>
                    <span
                      onClick={() => {
                        setScanType(null);
                        setInvestmentType(null);
                      }}
                      style={{
                        marginLeft: "10px",
                        cursor: "pointer",
                        color: "red",
                      }}
                    >
                      Change
                    </span>
                  </div>

                  <div
                    className="scan-options"
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "1rem",
                    }}
                  >
                    <label className="transaction-button">
                      Upload PDF/Img
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        style={{ display: "none" }}
                        onChange={(e) => setScannedFile(e.target.files[0])}
                      />
                    </label>

                    {/* Only show Camera for Receipts (Investments are usually PDFs) */}
                    {scanType === "transaction" && (
                      <label className="transaction-button">
                        Camera
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          style={{ display: "none" }}
                          onChange={(e) => setScannedFile(e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>

                  {scannedFile && (
                    <>
                      <div
                        className="scanned-file-preview"
                        style={{ marginTop: "1rem", textAlign: "center" }}
                      >
                        <p>Selected: {scannedFile.name}</p>
                      </div>
                      <button
                        className="transaction-button-alternate"
                        onClick={handleScanSubmit}
                        disabled={isScanning}
                        style={{ display: "block", margin: "1rem auto 0 auto" }}
                      >
                        {isScanning
                          ? "Processing..."
                          : `Process ${scanType === "transaction" ? "Receipt" : "Statement"}`}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* --- Manual Transaction Form --- */}
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
          className={`transaction-page-right ${!isFormOpen ? "full-width" : ""}`}
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
          {/* Pagination controls ... (same as before) */}
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
