# main.py
# This is the entry point for the backend.
# It sets up the FastAPI app, CORS, and security headers,
# then connects the analyse and export routes.

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv

# Load the .env file so environment variables are available
load_dotenv()

from routes.analyse import router as analyse_router
from routes.export  import router as export_router

# Create the app — docs are disabled so they aren't publicly visible
app = FastAPI(title="Briefly API", docs_url=None, redoc_url=None)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Only allow requests from the frontend domain.
# ALLOWED_ORIGINS is set in .env — comma separated if multiple domains needed.

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ── Security headers ───────────────────────────────────────────────────────────
# These are added to every response to protect against common web attacks.

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"]   = "nosniff"
    response.headers["X-Frame-Options"]           = "DENY"
    response.headers["X-XSS-Protection"]          = "1; mode=block"
    response.headers["Referrer-Policy"]           = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Permissions-Policy"]        = "geolocation=(), microphone=(), camera=()"
    return response

# ── Routes ────────────────────────────────────────────────────────────────────

app.include_router(analyse_router)  # POST /analyse
app.include_router(export_router)   # POST /export-pdf
