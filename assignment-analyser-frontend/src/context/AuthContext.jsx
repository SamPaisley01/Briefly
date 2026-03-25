// AuthContext.jsx
// Keeps track of the logged-in user and makes them available across the whole app.
// Any component can import AuthContext and read the current user from it.

import { createContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Create the context — components import this and get the current user
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // true while the initial session check runs

  useEffect(() => {
    // Check if the user is already logged in when the page loads
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen for login/logout events and update the user state
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Wait for the session check before rendering so the page doesn't flash as logged out
  return (
    <AuthContext.Provider value={{ user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
