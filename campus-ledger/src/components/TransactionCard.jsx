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
  const [expanded, setExpanded] = useState(false);

  const isEditing = editingTxId === transaction._id;

  // Normalize data access
  const transactionData = transaction.data || transaction;
  const { name, price, date, metadata = {}, type } = transactionData;

  // 1. Determine Card Type Logic
  const getCardType = () => {
    // You can adjust these checks based on your actual schema flags
    if (type === "brokerage" || metadata.institution) return "Brokerage";
    if (type === "holding" || metadata.ticker || metadata.asset_class)
      return "Holding";
    return "Transaction";
  };

  const cardType = getCardType();

  // 2. Initialize Edit State (Only runs when entering edit mode)
  useEffect(() => {
    if (isEditing) {
      setEditFields({
        name: name || "",
        price: price || 0,
        date: date || new Date().toISOString(),
        metadata: metadata || {},
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);
  // Removed other dependencies to prevent the "Recursion/Infinite Loop" issue.
  // We only want to reset form state when we actually toggle the edit mode.

  const handleFieldChange = (key, value) => {
    setEditFields((prev) => ({ ...prev, [key]: value }));
  };

  const submitEdit = (e) => {
    e.preventDefault();
    handleEditSubmit({ ...transaction, ...editFields });
  };

  // 3. Helper to render the specific "Tag" label
  const renderLabel = () => {
    let colorClass = "tag-default";
    if (cardType === "Brokerage") colorClass = "tag-brokerage";
    if (cardType === "Holding") colorClass = "tag-holding";

    return <span className={`card-type-label ${colorClass}`}>{cardType}</span>;
  };

  return (
    <div className={`transaction-card ${cardType.toLowerCase()}-card`}>
      {isEditing ? (
        /* --- EDIT MODE (Generic for all types) --- */
        <form className="edit-transaction-form" onSubmit={submitEdit}>
          <div className="edit-header">Editing {cardType}</div>

          <div className="edit-input-group">
            <label>Name / Institution / Asset:</label>
            <input
              type="text"
              value={editFields.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
            />
          </div>

          <div className="edit-input-group">
            <label>Value / Balance:</label>
            <input
              type="number"
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
              Save Changes
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
            {/* Header with Name and Label */}
            <div className="tx-header">
              <div className="tx-name-wrapper">
                {renderLabel()}
                <span
                  className="tx-name"
                  onClick={() => setExpanded(!expanded)}
                >
                  {name || "Unnamed Record"}
                </span>
              </div>

              <div className={`tx-price ${price >= 0 ? "positive" : ""}`}>
                {Number(price).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </div>
            </div>

            <div className="tx-date">
              {formatDate ? formatDate(date) : date}
            </div>

            {/* --- SCHEMA SPECIFIC DETAILS --- */}

            {/* Brokerage View */}
            {cardType === "Brokerage" && (
              <div className="schema-details">
                <div className="detail-row">
                  <span className="label">Institution:</span>{" "}
                  {metadata.institution || "N/A"}
                </div>
                <div className="detail-row">
                  <span className="label">Account Type:</span>{" "}
                  {metadata.account_type || "N/A"}
                </div>
              </div>
            )}

            {/* Holding View */}
            {cardType === "Holding" && (
              <div className="schema-details">
                <div className="detail-row">
                  <span className="label">Ticker:</span>{" "}
                  <span className="ticker">{metadata.ticker || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Quantity:</span>{" "}
                  {metadata.quantity || 0}
                </div>
              </div>
            )}

            {/* Standard Transaction Items Dropdown (Existing logic) */}
            {cardType === "Transaction" && expanded && (
              <div className="tx-items">
                {/* ... existing item logic if needed, or remove if not used ... */}
                <div className="tx-items-empty">See details in metadata</div>
              </div>
            )}
          </div>

          <div className="tx-right">
            <div className="card-buttons">
              <button
                className="transaction-button-alternate"
                onClick={() => onUpdate(transaction._id)}
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
