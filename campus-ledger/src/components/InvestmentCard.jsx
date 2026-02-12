import React, { useState, useEffect } from "react";
import "../App.css";

const InvestmentCard = ({
  investment,
  onDelete,
  onUpdate,
  editingInvId,
  setEditingInvId,
  formatDate,
}) => {
  const [editFields, setEditFields] = useState({});
  const isEditing = editingInvId === investment._id;

  // Distinguish types, but generally treat them similarly for layout
  const isBrokerage = investment.type === "brokerage_summary";

  // --- Initialize Edit State (Your Original Logic) ---
  useEffect(() => {
    if (isEditing) {
      setEditFields({
        total_value: investment.total_value || 0,
        uploadDate: investment.uploadDate || new Date().toISOString(),
        period_start: investment.period_start || "",
        period_end: investment.period_end || "",
        institution: investment.metadata?.institution || "",
      });
    }
  }, [isEditing, investment, isBrokerage]);

  const handleFieldChange = (key, value) => {
    setEditFields((prev) => ({ ...prev, [key]: value }));
  };

  const submitEdit = (e) => {
    e.preventDefault();
    const updatedInvestment = {
      ...investment,
      total_value: parseFloat(editFields.total_value),
      uploadDate: editFields.uploadDate,
      ...(isBrokerage && {
        period_start: editFields.period_start,
        period_end: editFields.period_end,
        metadata: {
          ...investment.metadata,
          institution: editFields.institution,
        },
      }),
    };
    onUpdate(updatedInvestment);
    setEditingInvId(null);
  };

  // --- Helpers ---
  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val || 0);

  const getDisplayDate = (d) => {
    if (!d) return "N/A";
    try {
      return formatDate ? formatDate(d) : new Date(d).toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  // --- Render ---
  return (
    <div className="transaction-card" style={{ position: "relative" }}>
      {/* Top Right Close Button 
         (Added this so it matches the TransactionCard UI exactly)
      */}
      <button
        className="card-close-btn"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(investment._id);
        }}
        title="Remove Item"
      >
        ×
      </button>

      {isEditing ? (
        /* --- EDIT MODE (Your Original Form, New Classes) --- */
        <form className="edit-transaction-form" onSubmit={submitEdit}>
          <div className="edit-header">
            Editing {isBrokerage ? "Brokerage Summary" : "Holdings Report"}
          </div>

          <div className="edit-input-group">
            <label>Total Value:</label>
            <input
              type="number"
              step="0.01"
              value={editFields.total_value}
              onChange={(e) => handleFieldChange("total_value", e.target.value)}
            />
          </div>

          {isBrokerage && (
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
              <div className="edit-row-split">
                <div className="edit-input-group">
                  <label>Start Date:</label>
                  <input
                    type="date"
                    value={
                      editFields.period_start
                        ? editFields.period_start.split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      handleFieldChange("period_start", e.target.value)
                    }
                  />
                </div>
                <div className="edit-input-group">
                  <label>End Date:</label>
                  <input
                    type="date"
                    value={
                      editFields.period_end
                        ? editFields.period_end.split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      handleFieldChange("period_end", e.target.value)
                    }
                  />
                </div>
              </div>
            </>
          )}

          <div className="edit-form-buttons">
            <button type="submit" className="transaction-button">
              Save
            </button>
            <button
              type="button"
              className="transaction-button-alternate"
              onClick={() => setEditingInvId(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        /* --- VIEW MODE (Unified UI) --- */
        <div className="transaction-card-content">
          <div className="tx-left">
            <div className="tx-header">
              <div className="tx-name-wrapper">
                {/* Badge */}
                <span className="card-type-label tag-holding">
                  {isBrokerage ? "Brokerage" : "Investment"}
                </span>
                {/* Main Name (Institution) */}
                <span className="tx-name">
                  {isBrokerage
                    ? investment.metadata?.institution || "Unknown Institution"
                    : "Portfolio Holdings"}
                </span>
              </div>
              {/* Price */}
              <div className="tx-price positive">
                {formatCurrency(investment.total_value)}
              </div>
            </div>

            {/* Date Row */}
            <div className="tx-date">
              {isBrokerage ? (
                <span>Statement: {getDisplayDate(investment.period_end)}</span>
              ) : (
                <span>Uploaded: {getDisplayDate(investment.uploadDate)}</span>
              )}
            </div>

            {/* Optional Details Box 
               (Replaces the "Holdings" list you didn't like)
            */}
            {isBrokerage && investment.period_start && (
              <div className="schema-details" style={{ marginTop: "10px" }}>
                <div className="detail-row">
                  <span className="label">Period Covered</span>
                  <span className="value">
                    {getDisplayDate(investment.period_start)} —{" "}
                    {getDisplayDate(investment.period_end)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="tx-right">
            <div className="card-buttons">
              <button
                className="transaction-button-alternate"
                onClick={() => setEditingInvId(investment._id)}
              >
                Edit
              </button>
              <button
                className="remove-btn"
                onClick={() => onDelete(investment._id)}
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

export default InvestmentCard;
