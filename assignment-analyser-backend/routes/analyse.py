# routes/analyse.py
# POST /analyse — the core endpoint.
# Accepts a PDF assignment brief, extracts its text, sends it to OpenAI,
# and returns structured JSON guidance for the student.

import os
import json

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from openai import OpenAI

from utils.rate_limit import (
    spam_store, usage_store,
    check_rate, check_daily, is_admin,
    SPAM_RATE_LIMIT, SPAM_WINDOW_SECONDS,
    USAGE_WINDOW_LIMIT, USAGE_WINDOW_SECONDS,
    USAGE_DAY_LIMIT,
)
from utils.pdf_reader import extract_text

router = APIRouter()

# OpenAI client — reads OPENAI_API_KEY from the .env file via python-dotenv in main.py
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── Input validation constants ────────────────────────────────────────────────
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_FOCUS_LENGTH    = 500               # chars for the optional student question
VALID_MODES = {"general", "requirements", "structure", "rubric", "timeline"}


def _client_ip(request: Request) -> str:
    """Extract the real client IP, checking X-Forwarded-For for proxy setups."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/analyse")
async def analyse_assignment(
    request:       Request,
    file:          UploadFile = File(...),
    user_focus:    str = Form(""),
    analysis_mode: str = Form("general"),
    user_email:    str = Form(""),        # sent by the frontend to enable admin bypass
):
    """
    Analyse a PDF assignment brief and return structured AI guidance.

    Rate limits:
    - Anti-spam: 10 requests/min per IP (everyone, including admin)
    - Usage: 2 per 3h window + 5 per day per IP (skipped for admin email)
    """

    ip    = _client_ip(request)
    admin = is_admin(user_email)

    # Anti-spam check — applies to all users
    if not check_rate(spam_store, ip, SPAM_RATE_LIMIT, SPAM_WINDOW_SECONDS):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a minute and try again.",
        )

    # Per-user usage limits — skipped for the admin account
    if not admin:
        if not check_rate(usage_store, ip, USAGE_WINDOW_LIMIT, USAGE_WINDOW_SECONDS):
            raise HTTPException(
                status_code=429,
                detail=(
                    f"You have reached your 3-hour limit of {USAGE_WINDOW_LIMIT} analyses. "
                    "Please wait before trying again."
                ),
            )
        if not check_daily(usage_store, ip, USAGE_DAY_LIMIT):
            raise HTTPException(
                status_code=429,
                detail=f"You have reached your daily limit of {USAGE_DAY_LIMIT} analyses. Please try again tomorrow.",
            )

    # Sanitise inputs
    if analysis_mode not in VALID_MODES:
        analysis_mode = "general"
    user_focus = user_focus.strip()[:MAX_FOCUS_LENGTH]

    # Validate the uploaded file
    if not (file.filename or "").lower().endswith(".pdf"):
        if file.content_type not in ("application/pdf", "application/octet-stream"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File is too large. Please upload a PDF under 10 MB.",
        )

    # Extract text from the PDF
    extracted_text = extract_text(contents)

    # Mode-specific instructions
    mode_instructions = {
        "general": """
Provide a complete breakdown of the assignment. Cover all aspects thoroughly: what it is testing,
its requirements, a suggested structure, a step-by-step action plan, a timeline, and common mistakes.
Be comprehensive across every section.
""",
        "requirements": """
Focus entirely on breaking down the requirements of this assignment.
- Be exhaustive with explicit_requirements: list every named requirement, constraint, format rule, word count, and submission criterion stated in the brief.
- Be thorough with inferred_expectations: identify academic conventions and implicit tutor expectations not stated but always expected.
- For key_verbs: identify every command or action word and explain precisely what academic standard it demands.
- The interpretation should focus on what skill or understanding this assignment is designed to assess.
- The step_by_step_plan should focus on how to meet each requirement systematically.
""",
        "structure": """
Focus entirely on how this assignment should be structured and organised.
- Make suggested_structure extremely detailed: include every section the student should have, what each must contain,
  the argument or evidence to include, approximate length or weight, and how it connects to adjacent sections.
- Include guidance on formatting conventions, referencing style appropriate to the discipline, and how to write transitions.
- The step_by_step_plan should walk through drafting and structuring the work section by section.
- The interpretation should explain how the structure of this assignment reflects what is being assessed.
""",
        "rubric": """
Your primary task is to scan the full assignment brief text for any marking rubric, grading table, or assessment criteria.

DETECTION: The brief text may include a section labelled "TABLES EXTRACTED FROM DOCUMENT" — this is where rubric tables will appear if present. Check both the main text AND the tables section. Look carefully for ANY of the following indicators that a rubric exists:
- Tables or grids with grade bands (e.g. H1, H2.1, H2.2, Pass, Fail or A, B, C, D, F or Distinction, Merit, Pass, Fail or 70%+, 60-69%, etc.)
- Columns with percentage or mark ranges alongside descriptors
- Headings or labels such as: "Grade Criterion", "Marking Scheme", "Marking Rubric", "Assessment Criteria", "Grading Criteria", "Performance Descriptors", "Learning Outcomes", "Mark Scheme", "Marking Grid", "Criteria", "Grade Descriptors", "Band Descriptors", "Assessment Rubric", "Marking Criteria"
- Any column that lists what is required to achieve a specific grade or mark
- Rows listing criteria with percentage weights (e.g. "Document, problem solving 25%", "Demonstration of ADTs 35%")
- Any structured breakdown showing what is expected at different grade levels
- Percentage weights assigned to different parts of the assignment

If ANY of these patterns exist, a rubric is present. Do not require the word "rubric" to appear literally.

CASE A: A rubric IS present in the brief:
- Set rubric_found to true.
- In rubric_analysis, explain what the rubric shows: how marks are distributed across criteria, what percentage each criterion carries, and what the highest grade band requires for each.
- Populate rubric_criteria with EVERY criterion row found. Use the criterion name and weight exactly as stated. For each criterion, summarise what the highest grade band requires under how_to_score_well.
- Base step_by_step_plan and common_mistakes directly on the rubric criteria so the student knows exactly how to score well.

CASE B: NO rubric is found in the brief:
- Set rubric_found to false.
- In rubric_analysis, clearly state that no rubric was found and explain what you have inferred about marking from the brief content and assignment type.
- Generate a suggested rubric in rubric_criteria based on the assignment type, learning outcomes, and academic conventions. Use realistic marks distribution that adds up to 100.
- Label each criterion clearly as suggested, not official.
- The step_by_step_plan should guide the student on how to score well against the suggested criteria.
""",
        "timeline": """
Focus entirely on planning and scheduling this assignment.
- Make timeline_plan extremely detailed: break the work into specific named phases with concrete tasks listed for each phase, not vague descriptions.
- Each phase should have a clear output or deliverable by its end.
- Estimate realistic durations based on the complexity of the assignment and typical student workloads.
- The step_by_step_plan should be ordered chronologically and double as a daily task list.
- The interpretation should note any deadlines, submission requirements, or time constraints visible in the brief.
""",
    }

    instructions = mode_instructions.get(analysis_mode, mode_instructions["general"])

    # Build the OpenAI prompt
    prompt = f"""
You are an experienced student tutor helping a student understand and plan for their assignment.
Write in clear, professional English. Be specific to this brief, not generic.

Analysis type: {analysis_mode}
Student's specific question: "{user_focus if user_focus else "None"}"

MODE INSTRUCTIONS:
{instructions}

GLOBAL RULES (apply to all modes):
- Never use double dashes (--) anywhere. Use a comma, colon or full stop instead.
- Be specific to this brief. Do not give generic advice.
- Do not invent requirements or marking criteria not present in the brief (except rubric mode when generating a suggested rubric).
- Provide at least 8 steps in step_by_step_plan.
- Provide at least 5 items in explicit_requirements if the brief contains them.
- For common_mistakes: provide at least 5. Each must be an object with "mistake" (the specific error) and "why" (consequence for marks).
- For key_verbs: identify 2 to 5 command words that actually appear in the brief. Only include words used in the brief.
- rubric_found, rubric_analysis, and rubric_criteria are ONLY populated for rubric mode. For all other modes set rubric_found to false, rubric_analysis to "", and rubric_criteria to [].

Return ONLY valid JSON in exactly this structure:

{{
  "interpretation": "2 to 4 sentences. Explain what this assignment is really asking for, what skill it tests, and what a strong submission looks like. Write directly to the student.",
  "assessment_type": "Essay / Report / Project / Presentation / Portfolio / Mixed",
  "key_verbs": [
    {{
      "verb": "The command word as it appears in the brief",
      "means": "One plain sentence explaining exactly what this requires the student to do"
    }}
  ],
  "explicit_requirements": [
    "A specific requirement stated in the brief. Include word counts, formats, or submission criteria.",
    "Another requirement"
  ],
  "inferred_expectations": [
    "An expectation not written in the brief but expected academically. Explain why tutors look for this.",
    "Another implicit expectation"
  ],
  "focus_response": "A detailed, direct answer to the student's question. If no question was given, explain the single most important thing the student must get right, and why.",
  "suggested_structure": [
    {{
      "section": "Section name",
      "purpose": "What this section must contain, what argument or evidence to include, and approximately how much weight it carries."
    }}
  ],
  "step_by_step_plan": [
    "Read the brief from start to finish. Highlight every instruction word, formatting requirement, and submission deadline.",
    "..."
  ],
  "timeline_plan": [
    {{
      "phase": "Phase name",
      "description": "Specific tasks to complete in this phase and the expected output by the end of it.",
      "suggested_duration_days": "3"
    }}
  ],
  "common_mistakes": [
    {{ "mistake": "Describe the specific error a student makes", "why": "Explain the consequence for marks or quality" }},
    {{ "mistake": "Another mistake", "why": "Why it matters" }}
  ],
  "rubric_found": false,
  "rubric_analysis": "",
  "rubric_criteria": [
    {{
      "criterion": "Criterion name",
      "marks_or_weight": "25%",
      "description": "What this criterion assesses",
      "how_to_score_well": "Specific advice on achieving the highest marks for this criterion"
    }}
  ]
}}

Assignment brief:
{extracted_text[:15000]}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o" if analysis_mode == "rubric" else "gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a knowledgeable and practical student tutor. "
                        "You give thorough, specific, well-written guidance that students can act on. "
                        "You never use double dashes (--). "
                        "You respond with valid JSON only, no extra text, no markdown code blocks."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )

        parsed = json.loads(response.choices[0].message.content)

        # Post-process: strip any double-dashes that slipped through despite the prompt
        def clean(obj):
            if isinstance(obj, str):
                return obj.replace(" -- ", ", ").replace("--", " ")
            if isinstance(obj, list):
                return [clean(i) for i in obj]
            if isinstance(obj, dict):
                return {k: clean(v) for k, v in obj.items()}
            return obj

        return clean(parsed)

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="The AI returned an unexpected response. Please try again.",
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")
