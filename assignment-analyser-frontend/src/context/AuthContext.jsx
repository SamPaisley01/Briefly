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
  const [isRecovery, setIsRecovery] = useState(false); // true when user clicked a password reset link

  useEffect(() => {
    // Check the URL hash on load — if type=recovery, show the reset form immediately
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsRecovery(true);
          setUser(session?.user ?? null);
        } else {
          setIsRecovery(false);
          setUser(session?.user ?? null);
        }
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
