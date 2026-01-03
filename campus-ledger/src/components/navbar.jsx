import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountDropdown, setAccountDropdown] = useState(false);

  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail"));

  // --- Listen to custom "authChanged" event for real-time updates ---
  useEffect(() => {
    const handleAuthChange = () => {
      setToken(localStorage.getItem("token"));
      setUserEmail(localStorage.getItem("userEmail"));
    };

    window.addEventListener("authChanged", handleAuthChange);
    return () => window.removeEventListener("authChanged", handleAuthChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setToken(null);
    setUserEmail(null);
    setAccountDropdown(false);

    // Trigger custom event so Navbar updates across the app
    window.dispatchEvent(new Event("authChanged"));

    navigate("/"); // optional redirect
  };

  return (
    <nav className="navbar">
      <h1 className="logo">FinanceApp</h1>

      <div className={`nav-links ${menuOpen ? "active" : ""}`}>
        <Link to="/dashboard">Dashboard (Coming Soon!)</Link>
        <Link to="/transactions">Transactions</Link>
      </div>

      <div className="login-container">
        <button
          className="login-btn"
          onClick={() => setAccountDropdown(!accountDropdown)}
        >
          {token ? userEmail || "Account" : "Account"} ▼
        </button>

        {accountDropdown && (
          <div className="login-dropdown">
            {!token ? (
              <>
                <Link to="/account" onClick={() => setAccountDropdown(false)}>
                  Sign In
                </Link>
                <Link to="/account" onClick={() => setAccountDropdown(false)}>
                  Sign Up
                </Link>
              </>
            ) : (
              <button onClick={handleLogout} className="logout-btn">
                Log Out
              </button>
            )}
          </div>
        )}
      </div>

      <div className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
      </div>
    </nav>
  );
}
