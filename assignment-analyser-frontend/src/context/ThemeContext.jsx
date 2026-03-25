// ThemeContext.jsx
// Handles dark and light mode for the app.
// Saves the user's preference to localStorage so it is remembered on next visit.

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Default to dark mode, but use saved preference if there is one
  const [theme, setTheme] = useState(
    () => localStorage.getItem("briefly_theme") || "dark"
  );

  // Apply the theme to the <html> element and save it whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("briefly_theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Call this in any component to get the current theme and the toggle function
export function useTheme() {
  return useContext(ThemeContext);
}
