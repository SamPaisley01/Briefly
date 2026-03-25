// LoginForm.jsx
// Renders the login form and handles two flows:
//   1. Normal sign-in with email + password via Supabase.
//   2. "Forgot password" — sends a password reset email via Supabase.

import { useState } from "react";
import { supabase } from "../supabaseClient";
import "../App.css";

function LoginForm({ onLoginSuccess, onSwitchToRegister }) {
  // Normal login state
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // Forgot-password flow state
  const [showForgot,    setShowForgot]    = useState(false); // toggles the forgot-password view
  const [resetEmail,    setResetEmail]    = useState("");
  const [resetSent,     setResetSent]     = useState(false);
  const [resetError,    setResetError]    = useState("");
  const [resetLoading,  setResetLoading]  = useState(false);

  // Handle normal sign-in
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError("Incorrect email or password. Please try again.");
      return;
    }

    // Supabase requires email verification before allowing access
    if (!data.user?.email_confirmed_at) {
      setError(
        "Please verify your email before logging in. Check your inbox for the verification link."
      );
      return;
    }

    onLoginSuccess();
  };

  // Send a password reset link to the user's email via Supabase
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
      resetEmail,
      { redirectTo: window.location.origin } // takes user back to the app after reset
    );

    setResetLoading(false);

    if (resetErr) {
      setResetError(resetErr.message || "Could not send a reset email. Please try again.");
      return;
    }

    setResetSent(true);
  };

  // ── Forgot password view ─────────────────────────────────────────────────

  if (showForgot) {
    return (
      <div className="auth-card">
        <h2>Reset your password</h2>
        <p className="auth-subtitle">
          Enter your email and we will send you a link to set a new password.
        </p>

        {resetSent ? (
          // Success state — tell the user to check their inbox
          <>
            <p className="success-text">
              Reset link sent. Check your inbox and follow the link to set a new password.
            </p>
            <p className="auth-subtitle" style={{ marginTop: 8, fontSize: "13px" }}>
              If you do not see the email, check your spam or junk folder.
            </p>
            <div className="auth-switch" style={{ marginTop: 20 }}>
              <span className="switch-link" onClick={() => setShowForgot(false)}>
                Back to login
              </span>
            </div>
          </>
        ) : (
          <form className="auth-form" onSubmit={handleForgotPassword}>
            <div className="field-group">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            {resetError && <p className="error-text">{resetError}</p>}

            <button type="submit" className="auth-submit-btn" disabled={resetLoading}>
              {resetLoading ? (
                <>
                  <span className="spinner"></span>
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </button>

            <div className="auth-switch">
              <span className="switch-link" onClick={() => setShowForgot(false)}>
                Back to login
              </span>
            </div>
          </form>
        )}
      </div>
    );
  }

  // ── Normal login view ────────────────────────────────────────────────────

  return (
    <div className="auth-card">
      <h2>Welcome back</h2>
      <p className="auth-subtitle">Log in to your Briefly account</p>

      <form className="auth-form" onSubmit={handleLogin}>
        <div className="field-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="field-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            autoComplete="current-password"
          />
          {/* Clicking this switches to the forgot-password view */}
          <span className="forgot-link" onClick={() => setShowForgot(true)}>
            Forgot password?
          </span>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner"></span>
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </button>
      </form>

      <div className="auth-switch">
        Don&apos;t have an account?{" "}
        <span className="switch-link" onClick={onSwitchToRegister}>
          Register for free
        </span>
      </div>
    </div>
  );
}

export default LoginForm;
