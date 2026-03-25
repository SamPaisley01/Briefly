# routes/export.py
# POST /export-pdf
# Takes the analysis result and generates a downloadable PDF using ReportLab.
# The file is saved to a temp folder, sent to the user, then deleted automatically.

import os
import uuid
import tempfile
from starlette.background import BackgroundTask

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem,
)
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4

from utils.rate_limit import export_store, check_rate, EXPORT_RATE_LIMIT, SPAM_WINDOW_SECONDS

router = APIRouter()


def _client_ip(request: Request) -> str:
    """Get the user's IP address, checking for proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/export-pdf")
async def export_pdf(request: Request, result: dict):
    # Check rate limit before doing anything
    if not check_rate(export_store, _client_ip(request), EXPORT_RATE_LIMIT, SPAM_WINDOW_SECONDS):
        raise HTTPException(
            status_code=429,
            detail="Too many export requests. Please wait a moment.",
        )

    # Create a uniquely named temp file to write the PDF to
    file_name = os.path.join(
        tempfile.gettempdir(),
        f"briefly_guidance_{uuid.uuid4().hex}.pdf",
    )

    doc    = SimpleDocTemplate(file_name, pagesize=A4)
    styles = getSampleStyleSheet()
    story  = []

    # Helper functions to keep the PDF building code clean
    def add_heading(text):
        story.append(Paragraph(f"<b>{text}</b>", styles["Heading2"]))
        story.append(Spacer(1, 8))

    def add_paragraph(text):
        if text:
            story.append(Paragraph(str(text), styles["BodyText"]))
        story.append(Spacer(1, 10))

    def add_list(items, numbered=False):
        if not items:
            return
        story.append(
            ListFlowable(
                [ListItem(Paragraph(str(item), styles["BodyText"])) for item in items],
                bulletType="1" if numbered else "bullet",
            )
        )
        story.append(Spacer(1, 10))

    # Build the PDF section by section from the result data
    story.append(Paragraph("<b>Assignment Guidance Report</b>", styles["Title"]))
    story.append(Spacer(1, 16))

    add_heading("What This Assignment Is Asking")
    add_paragraph(result.get("interpretation", ""))

    add_heading("Assessment Type")
    add_paragraph(result.get("assessment_type", ""))

    if result.get("focus_response"):
        add_heading("Answer to Your Question")
        add_paragraph(result["focus_response"])

    if result.get("key_verbs"):
        add_heading("Key Words Explained")
        for v in result["key_verbs"]:
            add_paragraph(f"<b>{v.get('verb', '')}</b>: {v.get('means', '')}")

    add_heading("Requirements From the Brief")
    add_list(result.get("explicit_requirements", []))

    add_heading("What Tutors Will Also Expect")
    add_list(result.get("inferred_expectations", []))

    add_heading("Suggested Structure")
    for section in result.get("suggested_structure", []):
        add_paragraph(f"<b>{section.get('section', '')}</b>: {section.get('purpose', '')}")

    add_heading("Step-by-Step Action Plan")
    add_list(result.get("step_by_step_plan", []), numbered=True)

    add_heading("Suggested Timeline")
    for phase in result.get("timeline_plan", []):
        add_paragraph(
            f"<b>{phase.get('phase', '')}</b> "
            f"({phase.get('suggested_duration_days', '?')} days): "
            f"{phase.get('description', '')}"
        )

    add_heading("Common Mistakes to Avoid")
    add_list(result.get("common_mistakes", []))

    doc.build(story)

    # Delete the temp file after it has been sent to the user
    def cleanup():
        try:
            os.unlink(file_name)
        except OSError:
            pass

    return FileResponse(
        file_name,
        filename="assignment_guidance.pdf",
        media_type="application/pdf",
        background=BackgroundTask(cleanup),
    )
