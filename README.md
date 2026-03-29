# Briefly

Briefly is a web application built as part of a final year college project. It allows students to upload assignment briefs in PDF format and receive a structured AI-powered breakdown of what the brief is asking, what the assessor is looking for, and how to approach the work.

## What it does

Students often struggle to interpret assignment briefs, especially when they are long, densely written, or contain rubrics buried in tables. Briefly solves this by extracting the key information and presenting it in a clear, digestible format.

Upload a brief and choose from several analysis modes:

- **General** — a broad summary of the assignment, key tasks, and common mistakes to avoid
- **Rubric** — breaks down the marking rubric and what each grade band requires
- **Structure** — suggests how to structure your response or report
- **Assessment Requirements** — pulls out the specific requirements, word counts, and deadlines
- **Timeline** — suggests a work plan based on the submission date

---

## Screenshots

<!-- Add screenshots here once the app is deployed and styled -->

| Home Page | Analysis Results |
|-----------|-----------------|
| ![Home](screenshots/home.png) | ![Results](screenshots/results.png) |

<!-- Add more screenshots as needed -->

---

## Tech Stack

**Frontend**
- React + Vite
- Supabase (authentication)
- Hosted on Netlify

**Backend**
- Python + FastAPI
- OpenAI GPT-4o / GPT-4o-mini
- PDF parsing with pdfplumber and PyMuPDF
- Hosted on Render

---

## Project Structure

```
briefly/
├── assignment-analyser-frontend/   # React frontend
└── assignment-analyser-backend/    # FastAPI backend
```

---

## Author

Sam Paisley
