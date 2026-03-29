// MainApp.jsx
// Top-level component: manages page layout, section routing, analysis state,
// header (with settings dropdown), mobile sidebar, theme toggle, and footer.

import { useState, useContext, useRef, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../supabaseClient";
import { getUsage, recordUsage, MAX_WINDOW, MAX_DAY } from "../utils/usage";
import FileUpload from "./FileUpload";
import ResultDisplay from "./ResultDisplay";
import Sidebar from "./Sidebar";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import VerificationPage from "./VerificationPage";
import ResetPasswordForm from "./ResetPasswordForm";
import "../App.css";

// The admin email comes from the frontend .env file (VITE_ADMIN_EMAIL).
// This only controls the UI gate — the backend enforces the limit independently.
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "";

function isAdmin(email) {
  return Boolean(ADMIN_EMAIL) && email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// ── Component ────────────────────────────────────────────────────────────────

function MainApp() {
  const { user, isRecovery }   = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();

  // Analysis state
  const [result,       setResult]       = useState(null);
  const [analysisMode, setAnalysisMode] = useState("general");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  // Navigation state
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [activeSection, setActiveSection] = useState("main");
  const [settingsOpen,  setSettingsOpen]  = useState(false);

  // Usage tracking — read from localStorage; refreshed after each analysis
  const [usage, setUsage] = useState(getUsage);

  // Ref for detecting clicks outside the settings dropdown (to close it)
  const settingsRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Return to the home view and clear any result/error
  const goHome = () => {
    setActiveSection("main");
    setResult(null);
    setError(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    goHome();
  };

  // Returns true if the user has hit either the 3-hour or daily limit.
  // Admin accounts are never blocked on the frontend.
  const isLimitReached = () => {
    if (isAdmin(user?.email)) return false;
    const { dayCount, windowCount } = usage;
    return dayCount >= MAX_DAY || windowCount >= MAX_WINDOW;
  };

  // Called by FileUpload when the user submits the form
  const analyseBrief = async (file, focus, mode) => {
    if (!user) return;

    if (isLimitReached()) {
      setError(
        `You have used your ${MAX_DAY} analyses for today. Please come back tomorrow.`
      );
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file",          file);
      formData.append("user_focus",    focus);
      formData.append("analysis_mode", mode);
      // Send the user's email so the backend can apply the admin bypass
      formData.append("user_email",    user?.email || "");

      const response = await fetch(`${import.meta.env.VITE_API_URL}/analyse`, {
        method: "POST",
        body:   formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Something went wrong. Please try again.");
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Record usage for non-admin accounts
      if (!isAdmin(user?.email)) {
        recordUsage();
        setUsage(getUsage());
      }

      setAnalysisMode(mode);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Section renderer ───────────────────────────────────────────────────────

  const renderContent = () => {
    // If the user arrived via a password reset link, show the set-new-password form
    if (isRecovery) return <ResetPasswordForm />;

    switch (activeSection) {

      // ── About ──────────────────────────────────────────────────────────────
      case "about":
        return (
          <div className="info-section">

            <div className="info-hero">
              <h2>About Briefly</h2>
              <p className="info-lead">
                Briefly is a free tool built to help students get more out of their assignment briefs.
                Upload your brief, choose what kind of guidance you need, and get a clear breakdown
                of exactly what is being asked of you.
              </p>
            </div>

            <div className="about-origin">
              <p>
                This started as a personal project after noticing that one of the biggest challenges
                students face is not the work itself, but understanding what the brief is actually
                asking for. Academic language can be dense, requirements are often buried, and it is
                easy to miss what the tutor is really looking for.
              </p>
              <p>
                Briefly was built to bridge that gap. It reads your brief and gives you a structured,
                specific response based on what is in it. When you submit a brief, it is processed to
                generate your analysis and is not stored or retained in any way.
              </p>
            </div>

            <div className="about-features-header">
              <h3>Analysis types</h3>
              <p>Each mode is designed for a different stage of tackling an assignment.</p>
            </div>

            <div className="about-features-grid">
              <div className="about-feature-card">
                <div className="about-feature-title">General Breakdown</div>
                <p>
                  A complete overview of your brief covering what the assignment is testing,
                  its key requirements, a suggested structure, a step-by-step action plan,
                  a timeline, and the most common mistakes to avoid. A solid starting point
                  for any assignment.
                </p>
              </div>
              <div className="about-feature-card">
                <div className="about-feature-title">Assessment Requirements</div>
                <p>
                  A focused breakdown of everything your assignment requires, both what is
                  written in the brief and the academic expectations that often go unstated.
                  Useful for making sure nothing has been missed before you begin writing.
                </p>
              </div>
              <div className="about-feature-card">
                <div className="about-feature-title">Report / Submission Structure</div>
                <p>
                  A recommended structure for your submission with detailed guidance on what
                  each section should contain, what evidence or argument to include, and how
                  it all fits together.
                </p>
              </div>
              <div className="about-feature-card">
                <div className="about-feature-title">Marking / Rubric Analysis</div>
                <p>
                  Scans your brief for a marking rubric or grading criteria. Where one exists,
                  it is broken down criterion by criterion so you know exactly what is needed
                  for a high grade. Where no rubric is present, a suggested one is generated
                  based on the assignment type.
                </p>
              </div>
              <div className="about-feature-card">
                <div className="about-feature-title">Timeline and Planning</div>
                <p>
                  Breaks the assignment into manageable phases, each with specific tasks and
                  a suggested timeframe. Particularly useful when working to a deadline and
                  trying to plan your time effectively.
                </p>
              </div>
            </div>

            <div className="about-privacy-block">
              <h3>Privacy</h3>
              <p>
                Your brief is sent to the AI to generate your analysis and is not stored or
                retained after that. The only information Briefly holds is your email address,
                which is used solely for account login.
              </p>
            </div>

          </div>
        );

      // ── Contact ────────────────────────────────────────────────────────────
      case "contact":
        return (
          <div className="info-section contact-section">
            <div className="info-hero">
              <h2>Contact</h2>
              <p className="info-lead">
                Briefly was built by Sam Paisley. If you have feedback or just want to get in touch, the links below are the best way to reach me.
              </p>
            </div>

            <div className="contact-cards">
              <a
                href="https://www.linkedin.com/in/sam-paisley/"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link-card"
              >
                <div className="contact-link-card-inner">
                  <div className="contact-link-label">LinkedIn</div>
                  <div className="contact-link-url">linkedin.com/in/sam-paisley</div>
                  <div className="contact-link-desc">Connect or send a message</div>
                </div>
                <span className="contact-link-arrow">→</span>
              </a>
              <a
                href="https://sampaisley.me"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link-card"
              >
                <div className="contact-link-card-inner">
                  <div className="contact-link-label">Personal site</div>
                  <div className="contact-link-url">sampaisley.me</div>
                  <div className="contact-link-desc">Portfolio and other projects</div>
                </div>
                <span className="contact-link-arrow">→</span>
              </a>
            </div>
          </div>
        );

      // ── Auth pages ─────────────────────────────────────────────────────────
      case "login":
        return (
          <div className="auth-page">
            <LoginForm
              onLoginSuccess={() => setActiveSection("main")}
              onSwitchToRegister={() => setActiveSection("register")}
            />
          </div>
        );

      case "register":
        return (
          <div className="auth-page">
            <RegisterForm
              onVerificationPage={() => setActiveSection("verify")}
              onSwitchToLogin={() => setActiveSection("login")}
            />
          </div>
        );

      case "verify":
        return (
          <div className="auth-page">
            <VerificationPage onBackToLogin={() => setActiveSection("login")} />
          </div>
        );

      // ── Main (default) ─────────────────────────────────────────────────────
      default:
        // Marketing hero for logged-out visitors
        if (!user) {
          return (
            <div className="home-logged-out">
              <div className="hero">
                <h2>Understand your assignment brief in minutes</h2>
                <p>
                  Upload your brief and get a clear, structured breakdown of what is being asked,
                  what your tutor is looking for, and how to approach the work with confidence.
                </p>
                <div className="hero-actions">
                  <button className="btn-primary" onClick={() => setActiveSection("register")}>
                    Get Started Free
                  </button>
                  <button className="btn-ghost" onClick={() => setActiveSection("login")}>
                    Login
                  </button>
                </div>
              </div>

              <div className="home-how">
                <h3>How it works</h3>
                <div className="how-steps">
                  <div className="how-step">
                    <span className="how-number">1</span>
                    <div className="how-text">
                      <strong>Upload your brief</strong>
                      <p>Drop in your PDF assignment brief and Briefly will read through it in full.</p>
                    </div>
                  </div>
                  <div className="how-step">
                    <span className="how-number">2</span>
                    <div className="how-text">
                      <strong>Choose an analysis type</strong>
                      <p>Pick the kind of guidance you need, from a full breakdown to rubric analysis or timeline planning.</p>
                    </div>
                  </div>
                  <div className="how-step">
                    <span className="how-number">3</span>
                    <div className="how-text">
                      <strong>Get your guidance</strong>
                      <p>Receive a detailed, structured response based specifically on your brief and ready to act on.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="home-features">
                <div className="home-feature-card">
                  <div className="home-feature-title">Tailored to your brief</div>
                  <p>Every analysis is built from the content of your actual brief. You will not get a generic response that could apply to any assignment.</p>
                </div>
                <div className="home-feature-card">
                  <div className="home-feature-title">Rubric detection</div>
                  <p>Briefly scans for a marking rubric in your brief. If one is found it is analysed in full. If not, a suggested rubric is generated from the assignment type.</p>
                </div>
                <div className="home-feature-card">
                  <div className="home-feature-title">Private by design</div>
                  <p>Your brief is processed to generate your analysis and is not stored or retained. Only your email is held, for account login.</p>
                </div>
                <div className="home-feature-card">
                  <div className="home-feature-title">Free to use</div>
                  <p>Briefly is completely free. Create an account and start analysing your briefs straight away, no payment needed.</p>
                </div>
              </div>
            </div>
          );
        }

        // Logged-in view
        return (
          <>
            {error && (
              <div className="error-banner">
                <strong>Something went wrong:</strong> {error}
              </div>
            )}

            {!result && (
              <FileUpload
                onAnalyse={analyseBrief}
                loading={loading}
                usageLimitReached={isLimitReached()}
                usage={usage}
                maxWindow={MAX_WINDOW}
                maxDay={MAX_DAY}
              />
            )}

            {loading && (
              <div className="loading-card">
                <div className="loading-spinner"></div>
                <p>Analysing your brief...</p>
                <p className="loading-subtitle">This usually takes 10 to 20 seconds</p>
              </div>
            )}

            {result && !loading && (
              <ResultDisplay
                result={result}
                mode={analysisMode}
                onReset={() => { setResult(null); setError(null); }}
              />
            )}
          </>
        );
    }
  };

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div className="app-wrapper">

      {/* Sticky header */}
      <header className="app-header">
        <div className="header-inner">

          <span className="header-logo" onClick={goHome}>Briefly</span>

          <nav className="header-nav">
            <button className="header-nav-btn" onClick={() => setActiveSection("about")}>About</button>
            <button className="header-nav-btn" onClick={() => setActiveSection("contact")}>Contact</button>
          </nav>

          <div className="header-auth">
            {user ? (
              /* Logged-in: email button opens the settings dropdown */
              <div className="user-menu" ref={settingsRef}>
                <button
                  className="header-user-btn"
                  onClick={() => setSettingsOpen((prev) => !prev)}
                  title="Account settings"
                >
                  {user.email}
                </button>

                {settingsOpen && (
                  <div className="user-dropdown">
                    <div className="dropdown-section">
                      <div className="dropdown-label">Account</div>
                      <div className="dropdown-email">{user.email}</div>
                      {/* Show an admin badge for the owner account */}
                      {isAdmin(user.email) && (
                        <div className="dropdown-label" style={{ marginTop: 6, color: "var(--accent)" }}>
                          Admin — no usage limits
                        </div>
                      )}
                    </div>

                    {/* Only show usage stats for regular accounts */}
                    {!isAdmin(user.email) && (
                      <div className="dropdown-section">
                        <div className="dropdown-label">Usage today</div>
                        <div className="dropdown-usage-row">
                          <span>Analyses today</span>
                          <span>{usage.dayCount} / {MAX_DAY}</span>
                        </div>
                      </div>
                    )}

                    <button
                      className="dropdown-logout-btn"
                      onClick={() => { setSettingsOpen(false); handleLogout(); }}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => setActiveSection("login")}>Login</button>
                <button className="btn-primary" onClick={() => setActiveSection("register")}>Register</button>
              </>
            )}
          </div>

          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Mobile sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectSection={(section) => { setActiveSection(section); setSidebarOpen(false); }}
        onLogout={() => { handleLogout(); setSidebarOpen(false); }}
      />

      {/* Page content */}
      <main className="main-content">
        <div className="page-inner">{renderContent()}</div>
      </main>

      <footer className="app-footer">
        <p>Briefly &copy; {new Date().getFullYear()} &middot; Assignment Brief Analyser</p>
      </footer>

      {/* Floating dark/light mode toggle */}
      <button
        className="theme-toggle-btn"
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

    </div>
  );
}

export default MainApp;
