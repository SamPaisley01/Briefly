# utils/pdf_reader.py
# Extracts text from a PDF file.
# First tries pdfplumber which is good at reading text and tables.
# If that gets very little, it falls back to pymupdf which handles more PDF types.
# Note: if the PDF is a scanned image, neither library can extract text from it.

import io
import pdfplumber
import fitz  # pymupdf
from fastapi import HTTPException


def _table_to_text(table: list) -> str:
    """Converts a table (list of rows) into pipe-separated plain text."""
    lines = []
    for row in table:
        cells = [str(cell).strip() if cell is not None else "" for cell in row]
        if any(cells):
            lines.append(" | ".join(cells))
    return "\n".join(lines)


def _extract_with_pdfplumber(contents: bytes) -> tuple[str, str]:
    """
    Uses pdfplumber to extract regular text and any tables from the PDF.
    Returns a tuple of (body text, table text).
    """
    text_parts  = []
    table_parts = []

    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

            tables = page.extract_tables()
            for table in tables:
                if table:
                    table_parts.append(_table_to_text(table))

    return "\n".join(text_parts), "\n\n---\n".join(table_parts)


def _extract_with_pymupdf(contents: bytes) -> str:
    """Fallback extraction using pymupdf — handles more complex PDF layouts."""
    text_parts = []
    doc = fitz.open(stream=contents, filetype="pdf")
    for page in doc:
        text = page.get_text("text")
        if text:
            text_parts.append(text)
    doc.close()
    return "\n".join(text_parts)


def extract_text(contents: bytes) -> str:
    """
    Main function — tries pdfplumber first, falls back to pymupdf if needed.
    Tables are appended separately so the AI can spot rubrics in them.
    Raises an error if no text can be found at all.
    """
    try:
        body_text, table_text = _extract_with_pdfplumber(contents)
    except Exception:
        body_text  = ""
        table_text = ""

    # If pdfplumber got very little text, try pymupdf as a backup
    if len(body_text.strip()) < 200:
        try:
            fallback = _extract_with_pymupdf(contents)
            if len(fallback.strip()) > len(body_text.strip()):
                body_text = fallback
        except Exception:
            pass

    combined = body_text

    # Add tables clearly labelled so the AI knows to check them for rubrics
    if table_text.strip():
        combined += "\n\n--- TABLES EXTRACTED FROM DOCUMENT ---\n" + table_text

    if not combined.strip():
        raise HTTPException(
            status_code=400,
            detail=(
                "No readable text was found in this PDF. "
                "The file may be a scanned image — please use a text-based PDF."
            ),
        )

    return combined
