import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TransactionCard from "../components/TransactionCard";
import InvestmentCard from "../components/InvestmentCard"; // <--- IMPORTED
import LoginRequiredBanner from "../components/LoginRequiredBanner";
import "../App.css";

// --- MAIN COMPONENT ---
export default function Transactions() {
  const navigate = useNavigate();

  // --- Auth / User State ---
  const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail"));
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [showLoginPopup, setShowLoginPopup] = useState(!token);

  // --- Transaction State ---
  const [transactions, setTransactions] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");

  // --- Form Visibility State ---
  const [showScanForm, setShowScanForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  // --- Editing State ---
  const [editingTxId, setEditingTxId] = useState(null);
  const [editingInvId, setEditingInvId] = useState(null); // <--- NEW STATE FOR INVESTMENTS

  // --- Pagination State ---
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(
    Number(localStorage.getItem("itemsPerPage")) || 10,
  );
  const [totalPages, setTotalPages] = useState(1);

  // --- Scan / Upload State ---
  const [scannedFile, setScannedFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // --- Document Type Selection State ---
  const [scanType, setScanType] = useState(null);
  const [investmentType, setInvestmentType] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL + "/api/transactions";
  const isFormOpen = showScanForm || showManualForm;

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
        console.error("Transaction fetch error:", txData.message);
      }

      // 2. Fetch Investments
      console.log("Attempting to fetch investments...");
      const invRes = await fetch(`${API_URL}/investments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (invRes.ok) {
        const invData = await invRes.json();
        console.log("🔍 RAW BACKEND RESPONSE:", invData);

        let finalData = [];
        if (Array.isArray(invData)) {
          finalData = invData;
        } else if (invData.investments && Array.isArray(invData.investments)) {
          finalData = invData.investments;
        } else if (invData.data && Array.isArray(invData.data)) {
          finalData = invData.data;
        }

        console.log("✅ FINAL ARRAY FOR STATE:", finalData);
        setInvestments(finalData);
      } else {
        console.error("Investment fetch failed with status:", invRes.status);
      }
    } catch (err) {
      console.error("CRITICAL ERROR in fetchTransactions:", err);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, limit]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setToken(null);
    setUserEmail(null);
    setTransactions([]);
    setInvestments([]);
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
    setScanType(null);
    setInvestmentType(null);
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
      resetForms();
      setPage(1);
      fetchTransactions();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // --- Handle Smart Scan Submit ---
  const handleScanSubmit = async () => {
    if (!scannedFile) return alert("No file selected!");
    if (!token) return setShowLoginPopup(true);

    setIsScanning(true);
    const formData = new FormData();
    formData.append("file", scannedFile);

    // Determine the correct endpoint based on user selection
    let targetEndpoint = `${API_URL}/extract`; // Default: Transaction

    if (scanType === "investment") {
      if (investmentType === "brokerage") {
        targetEndpoint = `${API_URL}/investments/brokerage`;
      } else if (investmentType === "holdings") {
        targetEndpoint = `${API_URL}/investments/holdings`;
      } else {
        setIsScanning(false);
        return alert("Please select the type of investment document.");
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

      alert(
        scanType === "investment"
          ? "Investment Document Processed Successfully!"
          : "Receipt Processed Successfully!",
      );

      resetForms();
      setPage(1);
      fetchTransactions();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsScanning(false);
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

  // --- DELETE (Investments) ---
  const handleDeleteInvestment = async (id) => {
    if (!token) return setShowLoginPopup(true);
    try {
      const res = await fetch(`${API_URL}/investments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to delete investment");

      fetchTransactions(); // Refresh list
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

      // Optimistically update the state or re-fetch
      setInvestments((prev) =>
        prev.map((inv) =>
          // Adjust based on how backend returns the updated object
          inv._id === (data.investment?._id || updatedInv._id)
            ? data.investment || updatedInv
            : inv,
        ),
      );
      setEditingInvId(null);
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
                          : `Process ${
                              scanType === "transaction"
                                ? "Receipt"
                                : "Statement"
                            }`}
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
    </div>
  );
}
