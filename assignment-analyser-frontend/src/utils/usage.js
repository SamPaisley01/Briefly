// utils/usage.js
// Tracks how many analyses the user has done today using localStorage.
// The frontend uses this to show the limit warning and disable the button.
// The backend also enforces limits independently by IP address.

export const WINDOW_MS  = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
export const MAX_WINDOW = 2;                   // max analyses per 3-hour window
export const MAX_DAY    = 2;                   // max analyses per day

// Returns the current usage counts — resets automatically on a new day
export function getUsage() {
  const today = new Date().toDateString();
  const now   = Date.now();

  try {
    const raw = localStorage.getItem("briefly_usage");
    if (!raw) return { dayCount: 0, windowCount: 0 };

    const stored = JSON.parse(raw);

    // If it's a new day, reset everything
    if (stored.date !== today) return { dayCount: 0, windowCount: 0 };

    // Count how many analyses happened in the last 3 hours
    const windowCount = (stored.timestamps || []).filter(
      (t) => now - t < WINDOW_MS
    ).length;

    return { dayCount: stored.dayCount || 0, windowCount };
  } catch {
    return { dayCount: 0, windowCount: 0 };
  }
}

// Call this after a successful analysis to record it
export function recordUsage() {
  const today = new Date().toDateString();
  const now   = Date.now();

  try {
    const raw    = localStorage.getItem("briefly_usage");
    const stored = raw ? JSON.parse(raw) : null;

    // Start fresh if it's a new day
    const prev = stored && stored.date === today
      ? stored
      : { date: today, dayCount: 0, timestamps: [] };

    const updated = {
      date:       today,
      dayCount:   (prev.dayCount || 0) + 1,
      timestamps: [...(prev.timestamps || []), now],
    };

    localStorage.setItem("briefly_usage", JSON.stringify(updated));
  } catch {
    // Ignore errors if localStorage isn't available (e.g. private browsing)
  }
}
