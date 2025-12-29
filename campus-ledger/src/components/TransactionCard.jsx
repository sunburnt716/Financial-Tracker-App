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
  const isEditing = editingTxId === transaction._id;

  const transactionData = transaction.data || transaction;

  // Separate main fields and metadata
  const { name, price, date, metadata } = transactionData;

  useEffect(() => {
    if (isEditing) {
      setEditFields({ name, price, date, metadata: metadata || {} });
    }
  }, [isEditing, name, price, date, metadata]);

  const handleFieldChange = (key, value) => {
    if (key === "metadata") {
      setEditFields((prev) => ({ ...prev, metadata: value }));
    } else {
      setEditFields((prev) => ({ ...prev, [key]: value }));
    }
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
          {metadata && Object.keys(metadata).length > 0 && (
            <div className="edit-metadata">
              {Object.entries(metadata).map(([k, v]) => (
                <div key={k}>
                  <label>{k}:</label>
                  <input
                    type="text"
                    value={v}
                    onChange={(e) =>
                      setEditFields((prev) => ({
                        ...prev,
                        metadata: { ...prev.metadata, [k]: e.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
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
            <div className="tx-name">{name}</div>
            <div
              className={`tx-price ${
                Number(price) >= 0 ? "positive" : "negative"
              }`}
            >
              {Number(price).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </div>
            <div className="tx-date">{formatDate(date)}</div>

            {/* Only display actual metadata */}
            {metadata && Object.keys(metadata).length > 0 && (
              <div className="tx-metadata">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key}>
                    <strong>{key}:</strong> {value}
                  </div>
                ))}
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
