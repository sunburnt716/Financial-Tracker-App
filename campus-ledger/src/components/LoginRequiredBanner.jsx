// src/components/LoginRequiredBanner.jsx
import React, { useState } from "react";

export default function LoginRequiredBanner({ userEmail }) {
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    // Add a slight animation delay before removing from DOM
    setVisible(false);
  };

  if (!visible) return null; // Hide the banner completely

  return (
    <div className={`login-required-banner ${!visible ? "hide" : ""}`}>
      <div className="banner-content">
        {userEmail ? (
          <span className="banner-message">
            Logged in as: <strong>{userEmail}</strong>
          </span>
        ) : (
          <span className="banner-message">
            <strong>Login Required:</strong> You need to be logged in to access
            transactions.
          </span>
        )}
        <div className="banner-actions">
          {!userEmail && (
            <a href="/account" className="banner-link">
              Go to Account Page
            </a>
          )}
          <button className="banner-close" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
