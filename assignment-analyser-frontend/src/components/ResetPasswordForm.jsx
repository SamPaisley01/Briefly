// ResetPasswordForm.jsx
// Shown when the user clicks a password reset link from their email.
// Lets them set a new password via Supabase.

import { useState, useContext } from "react";
import { supabase } from "../supabaseClient";
import { AuthContext } from "../context/AuthContext";

function ResetPasswordForm() {
  const { setIsRecovery } = useContext(AuthContext);
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateErr) {
      setError(updateErr.message || "Could not update password. Please try again.");
      return;
    }

    setSuccess(true);
    // Clear the recovery state after a short delay so the user sees the success message
    setTimeout(() => setIsRecovery(false), 2000);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Set a new password</h2>
        {success ? (
          <p className="success-text">Password updated. Logging you in...</p>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordForm;
