import React, { useState, useEffect } from "react";
import "../App.css";

const TransactionCard = ({
  transaction,
  onDelete,
  onUpdate,
  editingTxId,
  setEditingTxId,
  handleEditSubmit,
  formatDate, // passed from parent
}) => {
  const [editFields, setEditFields] = useState({});
  const [expanded, setExpanded] = useState(false);

  const isEditing = editingTxId === transaction._id;

  // Normalize data access
  const transactionData = transaction.data || transaction;
  const { name, price, date, metadata = {}, type } = transactionData;

  // --- 1. Determine Card Type ---
  const getCardType = () => {
    if (type === "brokerage" || metadata.institution) return "Brokerage";
    if (type === "holding" || metadata.ticker || metadata.asset_class)
      return "Holding";
    return "Transaction";
  };

  const cardType = getCardType();

  // --- 2. Initialize Edit State ---
  useEffect(() => {
    if (isEditing) {
      setEditFields({
        name: name || "",
        price: price || 0,
        date: date || new Date().toISOString(),
        metadata: metadata || {},
      });
    }
  }, [isEditing]); // Only run when edit mode toggles

  const handleFieldChange = (key, value) => {
    setEditFields((prev) => ({ ...prev, [key]: value }));
  };

  const submitEdit = (e) => {
    e.preventDefault();
    handleEditSubmit({ ...transaction, ...editFields });
  };

  // --- 3. Safety Helper Functions ---

  // Safe Date Formatter: Prevents crash if date is missing
  const getDisplayDate = () => {
    if (!date) return "No Date";
    try {
      // Use the parent's formatter if available, otherwise fallback
      return formatDate
        ? formatDate(date)
        : new Date(date).toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  // Safe Price Formatter: Holdings might use Quantity instead of Price
  const getDisplayPrice = () => {
    // If it's a holding and price is 0/missing, maybe show value or quantity?
    // For now, we safely render the price if it exists.
    const val = parseFloat(price);
    if (isNaN(val)) return "$0.00";

    return val.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const renderLabel = () => {
    let colorClass = "tag-default";
    if (cardType === "Brokerage") colorClass = "tag-brokerage";
    if (cardType === "Holding") colorClass = "tag-holding";
    return <span className={`card-type-label ${colorClass}`}>{cardType}</span>;
  };

  return (
    <div className={`transaction-card ${cardType.toLowerCase()}-card`}>
      {isEditing ? (
        /* --- EDIT MODE --- */
        <form className="edit-transaction-form" onSubmit={submitEdit}>
          <div className="edit-header">Editing {cardType}</div>

          <div className="edit-input-group">
            <label>Name / Institution:</label>
            <input
              type="text"
              value={editFields.name || ""}
              onChange={(e) => handleFieldChange("name", e.target.value)}
            />
          </div>

          <div className="edit-input-group">
            <label>Value / Amount:</label>
            <input
              type="number"
              value={editFields.price || 0}
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
                {renderLabel()}
                <span
                  className="tx-name"
                  onClick={() => setExpanded(!expanded)}
                >
                  {name ||
                    (metadata.ticker
                      ? `Ticker: ${metadata.ticker}`
                      : "Unnamed Record")}
                </span>
              </div>

              {/* Only show price if it's relevant, or use Safe Display */}
              <div className={`tx-price ${price >= 0 ? "positive" : ""}`}>
                {getDisplayPrice()}
              </div>
            </div>

            <div className="tx-date">{getDisplayDate()}</div>

            {/* --- BROKERAGE DETAILS --- */}
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

            {/* --- HOLDING DETAILS --- */}
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
                {/* If there is no price, maybe we show Value from metadata if exists */}
                {metadata.market_value && (
                  <div className="detail-row">
                    <span className="label">Market Val:</span> $
                    {metadata.market_value}
                  </div>
                )}
              </div>
            )}

            {/* --- RECEIPT ITEMS --- */}
            {cardType === "Transaction" && expanded && (
              <div className="tx-items">
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
