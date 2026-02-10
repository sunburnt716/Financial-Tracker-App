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

  // --- PRESERVED: Data Normalization ---
  const transactionData = transaction.data || transaction;
  const { name, price, date, metadata = {}, type } = transactionData;

  // --- PRESERVED & ENHANCED: Determine Card Type ---
  // We added a helper to make this usable inside the Edit Form state too
  const determineType = (t, m) => {
    if (t === "brokerage" || m?.institution) return "Brokerage";
    if (t === "holding" || m?.ticker || m?.asset_class) return "Holding";
    return "Transaction"; // Default / Receipt
  };

  const cardType = determineType(type, metadata);

  // --- 2. Initialize Edit State ---
  useEffect(() => {
    if (isEditing) {
      setEditFields({
        // Standard fields
        name: name || "",
        price: price || 0,
        date: date || new Date().toISOString(),

        // NEW: specific field to track which Schema we are editing
        schemaType: cardType,

        // Flatten metadata for easier editing (we will re-nest on save)
        institution: metadata.institution || "",
        account_type: metadata.account_type || "",
        ticker: metadata.ticker || "",
        quantity: metadata.quantity || 0,
        market_value: metadata.market_value || 0,
      });
    }
  }, [isEditing, transaction]); // Added transaction to dependency to be safe

  const handleFieldChange = (key, value) => {
    setEditFields((prev) => ({ ...prev, [key]: value }));
  };

  const submitEdit = (e) => {
    e.preventDefault();

    // NEW: Reconstruct the metadata based on the selected Schema Type
    const updatedMetadata = { ...metadata }; // Keep existing hidden fields

    if (editFields.schemaType === "Brokerage") {
      updatedMetadata.institution = editFields.institution;
      updatedMetadata.account_type = editFields.account_type;
    } else if (editFields.schemaType === "Holding") {
      updatedMetadata.ticker = editFields.ticker;
      updatedMetadata.quantity = parseFloat(editFields.quantity);
      updatedMetadata.market_value = parseFloat(editFields.market_value);
    }
    // If it's a generic transaction, we rely on Name/Price/Date

    // Send back to parent, converting SchemaType to lowercase 'type' for backend
    handleEditSubmit({
      ...transaction,
      name: editFields.name,
      price: parseFloat(editFields.price),
      date: editFields.date,
      type: editFields.schemaType.toLowerCase(), // "holding", "brokerage", etc.
      metadata: updatedMetadata,
    });
  };

  // --- 3. Safety Helper Functions (PRESERVED) ---
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

  const renderLabel = (currentType) => {
    // Use currentType argument so it updates instantly in Edit Mode
    let colorClass = "tag-default";
    if (currentType === "Brokerage") colorClass = "tag-brokerage";
    if (currentType === "Holding") colorClass = "tag-holding";
    return (
      <span className={`card-type-label ${colorClass}`}>{currentType}</span>
    );
  };

  // --- NEW: Dynamic Input Renderer ---
  const renderSchemaInputs = () => {
    switch (editFields.schemaType) {
      case "Brokerage":
        return (
          <>
            <div className="edit-input-group">
              <label>Institution:</label>
              <input
                type="text"
                value={editFields.institution}
                onChange={(e) =>
                  handleFieldChange("institution", e.target.value)
                }
              />
            </div>
            <div className="edit-input-group">
              <label>Account Type:</label>
              <input
                type="text"
                value={editFields.account_type}
                onChange={(e) =>
                  handleFieldChange("account_type", e.target.value)
                }
              />
            </div>
          </>
        );
      case "Holding":
        return (
          <>
            <div className="edit-input-group">
              <label>Ticker:</label>
              <input
                type="text"
                value={editFields.ticker}
                onChange={(e) => handleFieldChange("ticker", e.target.value)}
              />
            </div>
            <div className="edit-row-split">
              <div className="edit-input-group">
                <label>Qty:</label>
                <input
                  type="number"
                  value={editFields.quantity}
                  onChange={(e) =>
                    handleFieldChange("quantity", e.target.value)
                  }
                />
              </div>
              <div className="edit-input-group">
                <label>Mkt Val:</label>
                <input
                  type="number"
                  value={editFields.market_value}
                  onChange={(e) =>
                    handleFieldChange("market_value", e.target.value)
                  }
                />
              </div>
            </div>
          </>
        );
      default:
        return null; // Standard transaction only needs Name/Price/Date
    }
  };

  return (
    <div className="transaction-card" style={{ position: "relative" }}>
      {/* NEW: Top Right Close Button */}
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
          <div className="edit-header">
            {/* NEW: Dropdown to change Schema Type */}
            Editing:
            <select
              value={editFields.schemaType}
              onChange={(e) => handleFieldChange("schemaType", e.target.value)}
              className="schema-selector"
            >
              <option value="Transaction">Transaction (Receipt)</option>
              <option value="Brokerage">Brokerage Stmt</option>
              <option value="Holding">Holding</option>
            </select>
          </div>

          <div className="edit-input-group">
            <label>Name / Title:</label>
            <input
              type="text"
              value={editFields.name || ""}
              onChange={(e) => handleFieldChange("name", e.target.value)}
            />
          </div>

          <div className="edit-input-group">
            <label>Total / Price:</label>
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

          {/* NEW: Render extra fields based on dropdown selection */}
          <div className="schema-fields-container">{renderSchemaInputs()}</div>

          <div className="edit-form-buttons">
            <button type="submit" className="transaction-button">
              Save
            </button>
            {/* Kept the bottom Cancel button as well for UX clarity */}
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
        /* --- VIEW MODE (PRESERVED) --- */
        <div className="transaction-card-content">
          <div className="tx-left">
            <div className="tx-header">
              <div className="tx-name-wrapper">
                {renderLabel(cardType)}
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
              {/* You can keep or remove this since you now have the top-right X */}
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
