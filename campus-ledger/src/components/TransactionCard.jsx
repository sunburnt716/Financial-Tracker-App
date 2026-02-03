import React, { useState, useEffect } from "react";
import TransactionCard from "../components/TransactionCard"; // Using your NEW expandable card
import LoginRequiredBanner from "../components/LoginRequiredBanner";
import "../App.css";
import { useNavigate } from "react-router-dom";

export default function Transactions() {
  const navigate = useNavigate();

  // --- Auth State ---
  const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail"));
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [showLoginPopup, setShowLoginPopup] = useState(!token);

  // --- Data State ---
  // We will merge Transactions (Receipts) and Investments here
  const [allItems, setAllItems] = useState([]);

  // --- Form State ---
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");

  // --- UI State ---
  const [showScanForm, setShowScanForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  // --- Pagination ---
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(
    Number(localStorage.getItem("itemsPerPage")) || 10,
  );
  const [totalPages, setTotalPages] = useState(1);

  // --- Scanning State ---
  const [scannedFile, setScannedFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState(null);
  const [investmentType, setInvestmentType] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL + "/api/transactions";
  const isFormOpen = showScanForm || showManualForm;

  // --- 1. FETCH DATA (Consolidated) ---
  const fetchData = async () => {
    if (!token) return;
    try {
      // A. Fetch Receipts (Transactions) - Paginated
      const resTx = await fetch(`${API_URL}?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataTx = await resTx.json();

      // B. Fetch Investments (New Endpoint) - Assuming not paginated for now
      // Note: We assume your router mapped 'getInvestments' to /api/transactions/investments
      const resInv = await fetch(`${API_URL}/investments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataInv = await resInv.json();

      // C. Merge and Sort
      const receipts = dataTx.transactions || [];
      const investments = dataInv.success ? dataInv.data : [];

      // Combine arrays
      const combined = [...receipts, ...investments];

      // Sort by Date (Newest First)
      // Note: Receipts use 'date', Investments might use 'createdAt' or 'period_end'
      combined.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);
        return dateB - dateA;
      });

      setAllItems(combined);
      setTotalPages(dataTx.totalPages || 1); // Using Receipt pagination for now
      localStorage.setItem("itemsPerPage", limit);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const handleAuthChange = () => {
      setToken(localStorage.getItem("token"));
      setUserEmail(localStorage.getItem("userEmail"));
      fetchData();
    };
    window.addEventListener("authChanged", handleAuthChange);
    return () => window.removeEventListener("authChanged", handleAuthChange);
  }, [token, page, limit]);

  // --- Helpers ---
  const resetForms = () => {
    setShowScanForm(false);
    setShowManualForm(false);
    setScannedFile(null);
    setScanType(null);
    setInvestmentType(null);
    setName("");
    setPrice("");
    setDate("");
  };

  // --- Actions ---

  // Handle Edit Click (Passed to Card)
  // This populates the manual form with the existing data
  const handleEditClick = (item) => {
    setName(item.name || "Portfolio Update");
    setPrice(item.price || item.total_value || 0);
    setDate(item.date ? item.date.split("T")[0] : "");
    setShowManualForm(true);
    setShowScanForm(false);
    // You might need an 'editingId' state if you want to perform an Update (PUT)
    // instead of a Create (POST) when they click save.
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    if (!token) return setShowLoginPopup(true);

    try {
      // Try deleting as transaction first
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchData();
      } else {
        alert("Could not delete item.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Manual Submit
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

      if (!res.ok) throw new Error("Failed");

      resetForms();
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Scan Submit
  const handleScanSubmit = async () => {
    if (!scannedFile) return alert("No file selected!");
    if (!token) return setShowLoginPopup(true);

    setIsScanning(true);
    const formData = new FormData();
    formData.append("file", scannedFile);

    // Determine Endpoint
    let targetEndpoint = `${API_URL}/extract`; // Receipt default
    if (scanType === "investment") {
      if (investmentType === "brokerage")
        targetEndpoint = `${API_URL}/investments/brokerage`;
      if (investmentType === "holdings")
        targetEndpoint = `${API_URL}/investments/holdings`;
    }

    try {
      const res = await fetch(targetEndpoint, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Scan failed");

      alert("Processed Successfully!");
      resetForms();
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsScanning(false);
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
        {/* --- LEFT COLUMN: FORMS --- */}
        <div className="transaction-page-left">
          <div className="dashboard-header fade-in">
            <h1>Add Activity</h1>
          </div>

          <div className="input-choice-buttons fade-in">
            <button
              className={`transaction-button ${showScanForm ? "active" : ""}`}
              onClick={() => {
                setShowScanForm(!showScanForm);
                setShowManualForm(false);
              }}
            >
              Scan Document
            </button>
            <button
              className={`transaction-button ${showManualForm ? "active" : ""}`}
              style={{ marginLeft: "1rem" }}
              onClick={() => {
                setShowManualForm(!showManualForm);
                setShowScanForm(false);
              }}
            >
              Manual Input
            </button>
          </div>

          {/* SCAN FORM */}
          {showScanForm && (
            <div className="transaction-form fade-in">
              <h3>Scan Document</h3>

              {/* Type Selection Steps (Same as your code) */}
              {!scanType && (
                <div className="scan-options-vertical">
                  <button
                    className="transaction-button-outline"
                    onClick={() => setScanType("transaction")}
                  >
                    🧾 Receipt
                  </button>
                  <button
                    className="transaction-button-outline"
                    onClick={() => setScanType("investment")}
                  >
                    📈 Investment
                  </button>
                </div>
              )}

              {scanType === "investment" && !investmentType && (
                <div className="scan-options-vertical">
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
                  >
                    Back
                  </button>
                </div>
              )}

              {/* Upload Input */}
              {(scanType === "transaction" ||
                (scanType === "investment" && investmentType)) && (
                <div className="fade-in">
                  <div className="current-selection-badge">
                    Scanning: <strong>{investmentType || "Receipt"}</strong>
                    <span
                      onClick={resetForms}
                      style={{
                        marginLeft: 10,
                        color: "red",
                        cursor: "pointer",
                      }}
                    >
                      x
                    </span>
                  </div>
                  <label
                    className="transaction-button"
                    style={{
                      marginTop: 15,
                      display: "block",
                      textAlign: "center",
                    }}
                  >
                    Choose File
                    <input
                      type="file"
                      onChange={(e) => setScannedFile(e.target.files[0])}
                      style={{ display: "none" }}
                    />
                  </label>
                  {scannedFile && (
                    <button
                      className="transaction-button-alternate"
                      style={{ marginTop: 10, width: "100%" }}
                      onClick={handleScanSubmit}
                      disabled={isScanning}
                    >
                      {isScanning ? "Processing..." : "Upload & Process"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MANUAL FORM */}
          {showManualForm && (
            <form className="transaction-form fade-in" onSubmit={handleSubmit}>
              <h3>{name ? "Edit Transaction" : "New Transaction"}</h3>
              <div className="manual-form-inputs">
                <div className="input-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="transaction-button">
                Save
              </button>
            </form>
          )}
        </div>

        {/* --- RIGHT COLUMN: LIST --- */}
        <div
          className={`transaction-page-right ${!isFormOpen ? "full-width" : ""}`}
        >
          <h2>Recent Activity</h2>

          {allItems.length === 0 && (
            <p className="text-gray-500">No transactions found.</p>
          )}

          {allItems.map((item) => (
            <TransactionCard
              key={item._id}
              transaction={item}
              onEdit={handleEditClick}
              onDelete={handleDelete}
            />
          ))}

          {/* Pagination Controls */}
          {allItems.length > 0 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span>Page {page}</span>
              <button onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
