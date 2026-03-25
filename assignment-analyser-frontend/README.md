# Briefly — Assignment Brief Analyser

A web app that helps students understand what their assignment is really asking and get a clear, step-by-step plan for completing it. Upload your PDF assignment brief, choose an analysis type, and receive structured AI-generated guidance in plain English.

Built as a personal project for my portfolio.

---

## Features

- **PDF upload** — drag-and-drop or click to browse
- **Six analysis modes** — general, requirements, structure, artefact, rubric, timeline
- **Tabbed results** — Overview, Requirements, Action Plan, Structure, Timeline, Mistakes, Full Report
- **Export to PDF** — download the full guidance as a formatted PDF
- **Dark / light mode** — floating toggle button, preference saved to localStorage
- **User accounts** — email + password auth with email verification via Supabase
- **Forgot password** — sends a reset link via Supabase
- **Usage limits** — 2 analyses per 3 hours, 5 per day (enforced on both frontend and backend)
- **Rate limiting** — anti-spam and per-user limits on the API
- **Security headers** — X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy

---

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 19, Vite, plain CSS with variables |
| Backend  | Python, FastAPI |
| AI       | OpenAI API (`gpt-4o-mini`) |
| Auth     | Supabase (email + password) |
| PDF in   | pdfplumber |
| PDF out  | ReportLab |

---

## Project Structure

```
assignment-analyser-frontend/
  src/
    components/
      FileUpload.jsx       # Drag-and-drop upload form
      LoginForm.jsx        # Login + forgot password
      MainApp.jsx          # Top-level layout and routing
      RegisterForm.jsx     # Registration form
      ResultDisplay.jsx    # Tabbed analysis results
      ResultDisplay.css
      Sidebar.jsx          # Mobile slide-in menu
      Sidebar.css
      VerificationPage.jsx # Post-registration email prompt
    context/
      AuthContext.jsx      # Supabase session provider
      ThemeContext.jsx     # Dark/light mode provider
    App.css                # Global styles with CSS variables
    App.jsx
    index.css
    main.jsx
    supabaseClient.js      # Supabase client init

assignment-analyser-backend/
  main.py                  # FastAPI app — analyse and export endpoints
  .env                     # OPENAI_API_KEY (not committed)
  requirements.txt
```

---

## Setup

### Backend

```bash
cd assignment-analyser-backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create a .env file with your OpenAI key
echo "OPENAI_API_KEY=your_key_here" > .env

# Start the server
uvicorn main:app --reload
```

The API runs on `http://127.0.0.1:8000`.

### Frontend

```bash
cd assignment-analyser-frontend

# Install dependencies
npm install

# Create a .env file with your Supabase credentials
# (Get these from your Supabase project settings > API)
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here

# Start the dev server
npm run dev
```

The app runs on `http://localhost:5173`.

---

## Environment Variables

### Backend (`assignment-analyser-backend/.env`)

| Variable         | Description           |
|------------------|-----------------------|
| `OPENAI_API_KEY` | Your OpenAI API key   |

### Frontend (`assignment-analyser-frontend/.env`)

| Variable                 | Description                    |
|--------------------------|--------------------------------|
| `VITE_SUPABASE_URL`      | Your Supabase project URL      |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon (public) key |

Neither `.env` file should be committed to version control.

---

## Usage Limits

To keep API costs low, each user is limited to:

- **2 analyses per 3-hour window**
- **5 analyses per day**

These limits are tracked in localStorage on the frontend and enforced independently on the backend (IP-based).
