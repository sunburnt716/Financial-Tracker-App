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

  const isBrokerage = investment.type === "brokerage_summary";

  // --- Initialize Edit State ---
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

  return (
    <div
      className="transaction-card"
      style={{ borderLeft: "5px solid #8e44ad" }}
    >
      {isEditing ? (
        /* --- EDIT MODE --- */
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

          {isBrokerage ? (
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
                  <label>Start:</label>
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
                  <label>End:</label>
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
          ) : (
            <div className="edit-input-group">
              <label>Positions (Read-only):</label>
              <input
                type="text"
                disabled
                value={`${investment.holdings?.length || 0} Positions`}
                style={{ backgroundColor: "#eee" }}
              />
            </div>
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
        /* --- VIEW MODE --- */
        <div className="transaction-card-content">
          <div className="tx-left">
            <div className="tx-header">
              <div className="tx-name-wrapper">
                <span
                  className="card-type-label tag-brokerage"
                  style={{ backgroundColor: "#8e44ad" }}
                >
                  {isBrokerage ? "Brokerage" : "Holdings"}
                </span>
                <span className="tx-name">
                  {isBrokerage
                    ? investment.metadata?.institution || "Brokerage Statement"
                    : "Portfolio Holdings"}
                </span>
              </div>
              <div className="tx-price positive">
                {formatCurrency(investment.total_value)}
              </div>
            </div>

            <div className="tx-date">
              {isBrokerage ? (
                <span>
                  {getDisplayDate(investment.period_start)} -{" "}
                  {getDisplayDate(investment.period_end)}
                </span>
              ) : (
                <span>
                  Analyzed {investment.holdings?.length || 0} Positions
                </span>
              )}
            </div>
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
