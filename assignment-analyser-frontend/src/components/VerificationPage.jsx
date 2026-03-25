import "../App.css";

function VerificationPage({ onBackToLogin }) {
  return (
    <div className="auth-card">
      <h2>Check your email</h2>


      <p className="verify-message">
        We have sent a verification link to your email address. Click the link
        in the email to verify your account, then come back here to log in.
      </p>

      <p className="verify-message" style={{ fontSize: "13px", color: "#555555" }}>
        If you do not see the email, check your spam or junk folder.
      </p>

      <button className="auth-submit-btn" onClick={onBackToLogin}>
        Back to Login
      </button>
    </div>
  );
}

export default VerificationPage;
