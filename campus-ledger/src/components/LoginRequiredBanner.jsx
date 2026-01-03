import { useNavigate } from "react-router-dom";

export default function LoginRequiredBanner({ userEmail }) {
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  const handleClose = () => setVisible(false);
  const goToAccount = () => navigate("/account");

  if (!visible) return null;

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
            <button className="banner-link" onClick={goToAccount}>
              Go to Account Page
            </button>
          )}
          <button className="banner-close" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
