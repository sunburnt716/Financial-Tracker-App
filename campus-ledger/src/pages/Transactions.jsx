import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TransactionCard from "../components/TransactionCard";
import InvestmentCard from "../components/InvestmentCard";
import LoginRequiredBanner from "../components/LoginRequiredBanner";
import "../App.css";

export default function Transactions() {
  const navigate = useNavigate();

  // --- Auth / User State ---
  const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail"));
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [showLoginPopup, setShowLoginPopup] = useState(!token);

  // --- Transaction Data State ---
  const [transactions, setTransactions] = useState([]);
  const [investments, setInvestments] = useState([]);

  // --- Manual Form State ---
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [manualStatus, setManualStatus] = useState("idle"); // idle, loading, success, error

  // --- Form Visibility State ---
  const [showScanForm, setShowScanForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  // --- Editing State ---
  const [editingTxId, setEditingTxId] = useState(null);
  const [editingInvId, setEditingInvId] = useState(null);

  // --- Pagination State ---
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(
    Number(localStorage.getItem("itemsPerPage")) || 10,
  );
  const [totalPages, setTotalPages] = useState(1);

  // --- Scan / Upload State ---
  const [scannedFile, setScannedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanStatus, setScanStatus] = useState("idle"); // idle, scanning, success, error

  // --- Document Type Selection State ---
  const [scanType, setScanType] = useState(null);
  const [investmentType, setInvestmentType] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL + "/api/transactions";
  const isFormOpen = showScanForm || showManualForm;

  // --- Effect: Generate Image Preview when file changes ---
  useEffect(() => {
    if (!scannedFile) {
      setPreviewUrl(null);
      return;
    }
    // Create a temporary URL for the selected file
    const objectUrl = URL.createObjectURL(scannedFile);
    setPreviewUrl(objectUrl);

    // Cleanup memory when file changes
    return () => URL.revokeObjectURL(objectUrl);
  }, [scannedFile]);

  // --- Fetch Data (Transactions AND Investments) ---
  const fetchTransactions = async () => {
    if (!token) return;

    try {
      // 1. Fetch Regular Transactions (Receipts)
      const txRes = await fetch(`${API_URL}?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const txData = await txRes.json();

      if (txRes.ok) {
        setTransactions(txData.transactions || []);
        setTotalPages(txData.totalPages || 1);
        localStorage.setItem("itemsPerPage", limit);
      } else {
        console.error("Fetch error:", txData.message);
      }

      // 2. Fetch Investments
      const invRes = await fetch(`${API_URL}/investments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (invRes.ok) {
        const invData = await invRes.json();
        let finalData = [];
        // Handle various backend response structures
        if (Array.isArray(invData)) {
          finalData = invData;
        } else if (invData.investments && Array.isArray(invData.investments)) {
          finalData = invData.investments;
        } else if (invData.data && Array.isArray(invData.data)) {
          finalData = invData.data;
        }
        setInvestments(finalData);
      }
    } catch (err) {
      console.error("CRITICAL ERROR in fetchTransactions:", err);
    }
  };

  // --- Effect: Initial Load & Auth Listeners ---
  useEffect(() => {
    // Immediate load if token exists
    if (token) {
      fetchTransactions();
    }

    const handleAuthChange = () => {
      const newToken = localStorage.getItem("token");
      setToken(newToken);
      setUserEmail(localStorage.getItem("userEmail"));
      if (newToken) {
        fetchTransactions();
        setShowLoginPopup(false);
      }
    };

    window.addEventListener("authChanged", handleAuthChange);
    return () => window.removeEventListener("authChanged", handleAuthChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, limit]);

  const formatDate = (isoString) =>
    new Date(isoString).toISOString().split("T")[0];

  // --- Manual Transaction Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return setShowLoginPopup(true);

    setManualStatus("loading");

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

      // Success UI
      setManualStatus("success");
      setName("");
      setPrice("");
      setDate("");

      // Refresh Data
      fetchTransactions();

      // Reset button after 2 seconds
      setTimeout(() => setManualStatus("idle"), 2000);
    } catch (err) {
      console.error(err);
      setManualStatus("error");
      setTimeout(() => setManualStatus("idle"), 3000);
    }
  };

  // --- Handle Smart Scan Submit ---
  const handleScanSubmit = async () => {
    if (!scannedFile) return alert("No file selected!");
    if (!token) return setShowLoginPopup(true);

    setScanStatus("scanning"); // Button shows "Processing..."

    const formData = new FormData();
    formData.append("file", scannedFile);

    // Determine endpoint
    let targetEndpoint = `${API_URL}/extract`; // Default: Transaction

    if (scanType === "investment") {
      if (investmentType === "brokerage") {
        targetEndpoint = `${API_URL}/investments/brokerage`;
      } else if (investmentType === "holdings") {
        targetEndpoint = `${API_URL}/investments/holdings`;
      } else {
        setScanStatus("idle");
        return alert("Please select investment type.");
      }
    }

    try {
      const res = await fetch(targetEndpoint, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to scan document");

      // Success UI
      setScanStatus("success"); // Button shows "Success! ✅"

      // Refresh Data
      fetchTransactions();

      // Clear file and reset button after 2 seconds
      setTimeout(() => {
        setScannedFile(null);
        setPreviewUrl(null);
        setScanStatus("idle");
      }, 2000);
    } catch (err) {
      console.error(err);
      setScanStatus("error"); // Button shows "Error (Retry)"
      setTimeout(() => setScanStatus("idle"), 3000);
    }
  };

  // --- DELETE (Receipts) ---
  const handleDelete = async (id) => {
    if (!token) return setShowLoginPopup(true);
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");

      // Logic fix: Refresh list
      if (transactions.length === 1 && page > 1) setPage((prev) => prev - 1);
      else fetchTransactions();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // --- DELETE (Investments) ---
  const handleDeleteInvestment = async (id) => {
    if (!token) return setShowLoginPopup(true);
    try {
      const res = await fetch(`${API_URL}/investments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");

      fetchTransactions();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // --- EDIT (Receipts) ---
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

      // 1. Optimistic Update (Immediate UI change)
      setTransactions((prev) =>
        prev.map((t) =>
          t._id === data.transaction._id ? data.transaction : t,
        ),
      );
      setEditingTxId(null);

      // 2. Database Confirmation (Fetch fresh data to be sure)
      fetchTransactions();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // --- EDIT (Investments) ---
  const handleEditInvestment = async (updatedInv) => {
    if (!token) return setShowLoginPopup(true);
    try {
      const res = await fetch(`${API_URL}/investments/${updatedInv._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedInv),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to update investment");

      setEditingInvId(null);

      // Force refresh to ensure data consistency
      fetchTransactions();
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

          {/* Main Toggle Buttons */}
          <div className="input-choice-buttons fade-in">
            <button
              className={`transaction-button ${showScanForm ? "active" : ""}`}
              onClick={() => {
                setShowScanForm((prev) => !prev);
                setShowManualForm(false);
                setScanType(null);
                setInvestmentType(null);
                setScannedFile(null);
                setPreviewUrl(null);
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

              {/* STEP 3: Upload File */}
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
                        setScannedFile(null);
                        setPreviewUrl(null);
                        setScanStatus("idle");
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

                  {/* PREVIEW AND ACTION BUTTON */}
                  {scannedFile && (
                    <div
                      className="file-preview-container fade-in"
                      style={{ marginTop: "15px" }}
                    >
                      {/* Image Preview Logic */}
                      {previewUrl && scannedFile.type.startsWith("image") ? (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          style={{
                            width: "100%",
                            maxHeight: "160px",
                            objectFit: "contain",
                            borderRadius: "8px",
                            marginBottom: "10px",
                            border: "1px solid #ddd",
                          }}
                        />
                      ) : (
                        // Fallback for PDF/Non-image
                        <div
                          style={{ textAlign: "center", marginBottom: "10px" }}
                        >
                          <span style={{ fontSize: "2rem" }}>📄</span>
                          <p style={{ fontSize: "0.8rem" }}>
                            {scannedFile.name}
                          </p>
                        </div>
                      )}

                      {/* BUTTON WITH SUCCESS STATE */}
                      <button
                        className={`transaction-button-alternate ${scanStatus === "success" ? "btn-success" : ""} ${scanStatus === "error" ? "btn-error" : ""}`}
                        onClick={handleScanSubmit}
                        disabled={
                          scanStatus === "scanning" || scanStatus === "success"
                        }
                        style={{
                          display: "block",
                          margin: "0 auto",
                          width: "100%",
                        }}
                      >
                        {scanStatus === "scanning" && "Processing..."}
                        {scanStatus === "success" && "Success! ✅"}
                        {scanStatus === "error" && "Error - Try Again"}
                        {scanStatus === "idle" &&
                          `Process ${scanType === "transaction" ? "Receipt" : "Statement"}`}
                      </button>
                    </div>
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

              {/* BUTTON WITH SUCCESS STATE */}
              <button
                type="submit"
                className={`transaction-button ${manualStatus === "success" ? "btn-success" : ""} ${manualStatus === "error" ? "btn-error" : ""}`}
                disabled={
                  manualStatus === "loading" || manualStatus === "success"
                }
              >
                {manualStatus === "loading" && "Adding..."}
                {manualStatus === "success" && "Added! ✅"}
                {manualStatus === "error" && "Error"}
                {manualStatus === "idle" && "Add Transaction"}
              </button>
            </form>
          )}
        </div>

        {/* RIGHT LISTS: INVESTMENTS & TRANSACTIONS */}
        <div
          className={`transaction-page-right ${
            !isFormOpen ? "full-width" : ""
          }`}
        >
          {/* NEW: Investments Section */}
          {investments.length > 0 && (
            <div className="investments-list" style={{ marginBottom: "2rem" }}>
              <h2>Your Investments</h2>
              {investments.map((inv) => (
                <InvestmentCard
                  key={inv._id}
                  investment={inv}
                  onDelete={handleDeleteInvestment}
                  onUpdate={handleEditInvestment}
                  editingInvId={editingInvId}
                  setEditingInvId={setEditingInvId}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}

          {/* Existing: Transactions Section */}
          <h2>
            {transactions.length ? "All Transactions" : ""}
            {!transactions.length && !investments.length
              ? "No Activity Yet"
              : ""}
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

          {/* Pagination (For Transactions) */}
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

      {/* INLINE STYLES FOR BUTTON STATES */}
      <style>{`
        /* Success Green */
        .btn-success {
          background-color: #28a745 !important;
          color: white !important;
          border-color: #28a745 !important;
          cursor: default;
        }
        
        /* Error Red */
        .btn-error {
          background-color: #dc3545 !important;
          color: white !important;
        }

        /* Scan Preview Image */
        .scan-preview-img {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
