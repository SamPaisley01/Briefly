import { useState } from "react";
import { supabase } from "../supabaseClient";
import "../App.css";

function RegisterForm({ onVerificationPage, onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match. Please check and try again.");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);

    if (authError) {
      // Supabase free tier limits verification emails to a few per hour.
      // Show a plain-English message instead of the raw API error.
      if (authError.message?.toLowerCase().includes("rate limit")) {
        setError(
          "Too many sign-up attempts right now. Please wait a few minutes and try again."
        );
      } else {
        setError(authError.message);
      }
      return;
    }

    onVerificationPage();
  };

  return (
    <div className="auth-card">
      <h2>Create an account</h2>
      <p className="auth-subtitle">Free to use, no credit card required</p>

      <form className="auth-form" onSubmit={handleRegister}>
        <div className="field-group">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="field-group">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            autoComplete="new-password"
          />
        </div>

        <div className="field-group">
          <label htmlFor="register-confirm">Confirm password</label>
          <input
            id="register-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            required
            autoComplete="new-password"
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner"></span>
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="auth-switch">
        Already have an account?{" "}
        <span className="switch-link" onClick={onSwitchToLogin}>
          Login
        </span>
      </div>
    </div>
  );
}

export default RegisterForm;
