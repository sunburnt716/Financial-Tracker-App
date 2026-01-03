import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail"));

  const navigate = useNavigate();

  // Track window resize to toggle mobile/desktop
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for login/logout changes
  useEffect(() => {
    const handleAuthChange = () => {
      setUserEmail(localStorage.getItem("userEmail"));
    };
    window.addEventListener("authChanged", handleAuthChange);
    return () => window.removeEventListener("authChanged", handleAuthChange);
  }, []);

  const toggleMobileMenu = () => {
    setMobileOpen((prev) => !prev);
    if (!mobileOpen) setLoginOpen(false); // close login dropdown when opening menu
  };

  const toggleLoginDropdown = () => setLoginOpen((prev) => !prev);

  const closeMenus = () => {
    setMobileOpen(false);
    setLoginOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setUserEmail(null);
    window.dispatchEvent(new Event("authChanged"));
    closeMenus();
  };

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <h1 className="logo">Trackly</h1>

        {!isMobile && (
          <div className="nav-links desktop-links">
            <Link to="/transactions">Transactions</Link>
            <Link to="/dashboard">Dashboard</Link>

            {/* Account button */}
            <div className="login-container">
              {userEmail ? (
                <button className="login-btn" onClick={handleLogout}>
                  Logout ({userEmail})
                </button>
              ) : (
                <button
                  className="login-btn"
                  onClick={() => navigate("/account")}
                >
                  Sign In / Sign Up
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hamburger for mobile */}
      {isMobile && (
        <div
          className={`hamburger ${mobileOpen ? "open" : ""}`}
          onClick={toggleMobileMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}

      {/* Mobile Menu */}
      {isMobile && (
        <div className={`mobile-menu ${mobileOpen ? "active" : ""}`}>
          <Link to="/transactions" onClick={closeMenus}>
            Transactions
          </Link>
          <Link to="/dashboard" onClick={closeMenus}>
            Dashboard
          </Link>

          {userEmail ? (
            <button className="login-btn" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <button
              className="login-btn"
              onClick={() => {
                navigate("/account");
                closeMenus();
              }}
            >
              Sign In / Sign Up
            </button>
          )}
        </div>
      )}

      {/* Overlay */}
      {mobileOpen && (
        <div className="mobile-overlay active" onClick={closeMenus}></div>
      )}
    </>
  );
};

export default Navbar;
