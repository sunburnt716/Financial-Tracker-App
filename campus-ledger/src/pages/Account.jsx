import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

export default function AccountPage() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isSignIn && password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      // Example in AccountPage.jsx
      const url = isSignIn
        ? import.meta.env.VITE_API_URL + "/api/auth/login"
        : import.meta.env.VITE_API_URL + "/api/auth/signup";

      const res = await axios.post(url, { email, password });

      // Handle backend success flag
      if (!res.data.success) {
        setError(res.data.message || "Login failed");
        setLoading(false);
        return;
      }

      // Store token and email in localStorage
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userEmail", res.data.email);

      // --- Trigger Navbar update ---
      window.dispatchEvent(new Event("authChanged"));

      // Clear form
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setLoading(false);

      navigate("/dashboard"); // optional redirect
    } catch (err) {
      setError(
        err.response?.data?.message || "Something went wrong, try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className="account-page-container">
      <div className="account-card">
        <div className="account-toggle">
          <button
            className={isSignIn ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setIsSignIn(true)}
          >
            Sign In
          </button>
          <button
            className={!isSignIn ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setIsSignIn(false)}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form className="account-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group password-field">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="peek-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {!isSignIn && (
            <div className="input-group password-field">
              <label>Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="peek-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="transaction-button"
            disabled={loading}
          >
            {loading ? "Please wait..." : isSignIn ? "Sign In" : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}
