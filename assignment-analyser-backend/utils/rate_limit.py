# utils/rate_limit.py
# Handles rate limiting to stop people from spamming the API.
# Uses in-memory dictionaries to track requests per IP address.
# Note: these reset when the server restarts.

import os
import time
from collections import defaultdict

# Admin email can bypass the per-user usage limits (not the anti-spam check)
ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")

# Anti-spam: max 10 requests per minute per IP (applies to everyone)
SPAM_RATE_LIMIT     = 10
SPAM_WINDOW_SECONDS = 60

# Usage limits: max 2 analyses per 3-hour window and 2 per day per IP
USAGE_WINDOW_SECONDS = 3 * 60 * 60
USAGE_WINDOW_LIMIT   = 2
USAGE_DAY_LIMIT      = 2

# PDF export limit (generous since there's no AI cost)
EXPORT_RATE_LIMIT = 20

# In-memory stores — one list of timestamps per IP
spam_store:   dict = defaultdict(list)
usage_store:  dict = defaultdict(list)
export_store: dict = defaultdict(list)


def check_rate(store: dict, ip: str, limit: int, window: int) -> bool:
    """
    Sliding window rate limiter.
    Removes old timestamps outside the window, then checks if the limit is hit.
    Returns True if the request is allowed.
    """
    now = time.time()
    store[ip] = [t for t in store[ip] if now - t < window]
    if len(store[ip]) >= limit:
        return False
    store[ip].append(now)
    return True


def check_daily(store: dict, ip: str, limit: int) -> bool:
    """
    Daily limit — resets at midnight.
    Uses a key of IP + today's date so yesterday's data is ignored.
    Returns True if the request is within the daily limit.
    """
    today = time.strftime("%Y-%m-%d")
    key   = f"{ip}::{today}"

    # Clean up old date keys to avoid memory growing indefinitely
    stale = [k for k in list(store.keys()) if not k.endswith(today)]
    for k in stale:
        del store[k]

    count = store.get(key, 0)
    if count >= limit:
        return False
    store[key] = count + 1
    return True


def is_admin(user_email: str) -> bool:
    """Returns True if the email matches the admin email in .env."""
    return bool(ADMIN_EMAIL) and user_email.strip().lower() == ADMIN_EMAIL.strip().lower()
