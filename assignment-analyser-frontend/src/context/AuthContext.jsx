// AuthContext.jsx
// Keeps track of the logged-in user and makes them available across the whole app.
// Any component can import AuthContext and read the current user from it.

import { createContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Create the context — components import this and get the current user
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,       setUser]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  // Initialise synchronously from the URL so the reset form shows on the very first render
  const [isRecovery, setIsRecovery] = useState(
    () => new URLSearchParams(window.location.search).get("reset") === "true"
  );

  useEffect(() => {
    const isResetFlow = new URLSearchParams(window.location.search).get("reset") === "true";

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsRecovery(true);
        } else if (!isResetFlow) {
          // Only clear recovery state if we're not in a reset flow
          setIsRecovery(false);
        }
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isRecovery, setIsRecovery }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
