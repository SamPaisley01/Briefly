// Sidebar.jsx
// Mobile navigation menu that slides in from the side.
// Shows nav links and login/logout depending on whether the user is logged in.

import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./Sidebar.css";

function Sidebar({ isOpen, onClose, onSelectSection, onLogout }) {
  const { user } = useContext(AuthContext);

  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-brand">Briefly</span>
          <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className="sidebar-nav-btn"
            onClick={() => { onSelectSection("about"); onClose(); }}
          >
            About
          </button>
          <button
            className="sidebar-nav-btn"
            onClick={() => { onSelectSection("contact"); onClose(); }}
          >
            Contact
          </button>
        </nav>

        <div className="sidebar-footer">
          {!user ? (
            <>
              <button
                className="sidebar-nav-btn"
                onClick={() => { onSelectSection("login"); onClose(); }}
              >
                Login
              </button>
              <button
                className="sidebar-nav-btn sidebar-register-btn"
                onClick={() => { onSelectSection("register"); onClose(); }}
              >
                Register
              </button>
            </>
          ) : (
            <>
              {user.email && (
                <p className="sidebar-user-email">{user.email}</p>
              )}
              <button
                className="sidebar-nav-btn sidebar-logout-btn"
                onClick={onLogout}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Sidebar;
