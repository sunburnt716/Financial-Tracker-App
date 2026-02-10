import React, { useState, useEffect } from "react";
import "../App.css";

const TransactionCard = ({
  transaction,
  onDelete,
  onUpdate,
  editingTxId,
  setEditingTxId,
  handleEditSubmit,
  formatDate,
}) => {
  const [editFields, setEditFields] = useState({});
  const isEditing = editingTxId === transaction._id;

  // --- Data Normalization ---
  // standardizing access whether data comes from OCR or manual entry
  const transactionData = transaction.data || transaction;
  const { name, price, date } = transactionData;

  // --- Initialize Edit State ---
  useEffect(() => {
    if (isEditing) {
      setEditFields({
        name: name || "",
        price: price || 0,
        date: date || new Date().toISOString(),
      });
    }
  }, [isEditing, transaction, name, price, date]);

  const handleFieldChange = (key, value) => {
    setEditFields((prev) => ({ ...prev, [key]: value }));
  };

  const submitEdit = (e) => {
    e.preventDefault();
    handleEditSubmit({
      ...transaction,
      name: editFields.name,
      price: parseFloat(editFields.price),
      date: editFields.date,
      // We don't need to touch metadata or type here anymore
      // as this is strictly for standard transactions
    });
  };

  // --- Helpers ---
  const getDisplayDate = () => {
    if (!date) return "No Date";
    try {
      return formatDate
        ? formatDate(date)
        : new Date(date).toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  const getDisplayPrice = () => {
    const val = parseFloat(price);
    if (isNaN(val)) return "$0.00";
    return val.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  return (
    <div className="transaction-card" style={{ position: "relative" }}>
      {/* --- Close / Delete Button (Top Right) --- */}
      <button
        className="card-close-btn"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isEditing)
            setEditingTxId(null); // Cancel Edit
          else onDelete(transaction._id); // Delete Item
        }}
        title={isEditing ? "Cancel Edit" : "Remove Item"}
      >
        ×
      </button>

      {isEditing ? (
        /* --- EDIT MODE --- */
        <form className="edit-transaction-form" onSubmit={submitEdit}>
          <div className="edit-header">Editing Transaction</div>

          <div className="edit-input-group">
            <label>Name / Merchant:</label>
            <input
              type="text"
              value={editFields.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
            />
          </div>

          <div className="edit-input-group">
            <label>Amount:</label>
            <input
              type="number"
              step="0.01"
              value={editFields.price}
              onChange={(e) => handleFieldChange("price", e.target.value)}
            />
          </div>

          <div className="edit-input-group">
            <label>Date:</label>
            <input
              type="date"
              value={editFields.date ? editFields.date.split("T")[0] : ""}
              onChange={(e) => handleFieldChange("date", e.target.value)}
            />
          </div>

          <div className="edit-form-buttons">
            <button type="submit" className="transaction-button">
              Save
            </button>
            <button
              type="button"
              className="transaction-button-alternate"
              onClick={() => setEditingTxId(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        /* --- VIEW MODE --- */
        <div className="transaction-card-content">
          <div className="tx-left">
            <div className="tx-header">
              <div className="tx-name-wrapper">
                <span className="card-type-label tag-default">Receipt</span>
                <span className="tx-name">{name || "Unnamed Transaction"}</span>
              </div>
              <div className={`tx-price ${price >= 0 ? "positive" : ""}`}>
                {getDisplayPrice()}
              </div>
            </div>
            <div className="tx-date">{getDisplayDate()}</div>
          </div>

          <div className="tx-right">
            <div className="card-buttons">
              <button
                className="transaction-button-alternate"
                onClick={() => setEditingTxId(transaction._id)}
              >
                Edit
              </button>
              <button
                className="remove-btn"
                onClick={() => onDelete(transaction._id)}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionCard;
