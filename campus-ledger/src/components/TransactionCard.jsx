import React, { useState, useEffect } from "react";

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

  const transactionData = transaction.data || transaction;
  const { name, price, date, metadata = {} } = transactionData;
  const items = (metadata.items || []).map((i) => ({
    item_name: i.item_name || i.name || "Unknown",
    item_price:
      typeof i.item_price === "string"
        ? parseFloat(i.item_price.replace(/[^0-9.-]+/g, ""))
        : i.item_price || 0,
  }));

  const displayPrice =
    typeof price === "string"
      ? parseFloat(price.replace(/[^0-9.-]+/g, ""))
      : price;

  useEffect(() => {
    if (isEditing) {
      setEditFields({
        name,
        price: displayPrice,
        date,
        metadata,
      });
    }
  }, [isEditing, name, displayPrice, date, metadata]);

  const handleFieldChange = (key, value) => {
    setEditFields((prev) => ({ ...prev, [key]: value }));
  };

  const submitEdit = (e) => {
    e.preventDefault();
    handleEditSubmit({ ...transaction, ...editFields });
  };

  return (
    <div className="transaction-card">
      {isEditing ? (
        <form className="edit-transaction-form" onSubmit={submitEdit}>
          {["name", "price", "date"].map((key) => (
            <div className="edit-input-group" key={key}>
              <label>{key}:</label>
              <input
                type={key === "date" ? "date" : "text"}
                value={editFields[key] || ""}
                onChange={(e) => handleFieldChange(key, e.target.value)}
              />
            </div>
          ))}
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
        <div className="transaction-card-content">
          <div className="tx-left">
            {/* Header / summary */}
            <div className="tx-header">
              <div
                className="tx-name"
                onClick={() => setExpanded((prev) => !prev)}
              >
                {name}
                <span
                  className={`caret ${expanded ? "expanded" : ""}`}
                  style={{
                    display: "inline-block",
                    marginLeft: "0.5rem",
                    transition: "transform 0.2s",
                    transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  ▶
                </span>
              </div>
              <div
                className={`tx-price ${
                  displayPrice >= 0 ? "positive" : "negative"
                }`}
              >
                {displayPrice.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </div>
            </div>

            <div className="tx-date">{formatDate(date)}</div>

            {/* Dropdown items */}
            {expanded && (
              <div className="tx-items">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <div key={index} className="tx-item-row">
                      <span className="tx-item-name">{item.item_name}</span>
                      <span className="tx-item-price">
                        {item.item_price.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="tx-items-empty">
                    No item details available
                  </div>
                )}
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
