from flask import Flask, jsonify, render_template, request
import re
from io import BytesIO
from pypdf import PdfReader

app = Flask(__name__)

ACTION_VERBS = [
    "led", "built", "managed", "developed", "improved", "created", "optimized",
    "delivered", "designed", "implemented", "increased", "reduced", "launched",
    "trained", "streamlined", "analysed", "analyzed", "collaborated", "mentored"
]


def extract_email(text):
    match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return bool(match)


def extract_phone(text):
    match = re.search(r"(?:\+?\d[\d\s().-]{8,}\d)", text)
    return bool(match)


def has_bullets(text):
    return bool(re.search(r"(?:^|\n)\s*[-•*]\s+", text))


def has_metrics(text):
    return bool(re.search(r"\b\d+(?:%|\+|\s*(?:years?|months?|clients?|projects?))\b", text, re.IGNORECASE))


def has_sections(text):
    required = ["experience", "education", "skills", "projects"]
    lower = text.lower()
    return sum(1 for section in required if section in lower)


def has_action_verbs(text):
    lower = text.lower()
    return sum(1 for verb in ACTION_VERBS if verb in lower)


def extract_text_from_pdf(file_obj):
    try:
        reader = PdfReader(file_obj)
        pages = []
        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append(text)
        return "\n".join(pages).strip()
    except Exception:
        return ""


def analyze_cv(cv_text, job_title):
    text = cv_text.strip()
    lower = text.lower()
    score = 0
    strengths = []
    improvements = []

    if not text:
        return {
            "score": 0,
            "strengths": ["No CV content provided."],
            "improvements": ["Paste the CV text or upload a PDF to start the review."],
            "summary": "Please add CV details before reviewing."
        }

    if len(text.split()) >= 120:
        score += 15
        strengths.append("The CV includes a strong amount of detail for a recruiter to assess experience and skills.")
    else:
        improvements.append("Add more detail to describe your experience, achievements, and responsibilities.")

    if extract_email(text):
        score += 10
        strengths.append("Contact information is clearly included.")
    else:
        improvements.append("Add a professional email address so recruiters can contact you easily.")

    if extract_phone(text):
        score += 10
        strengths.append("A phone number is present for direct contact.")
    else:
        improvements.append("Include a phone number if you want recruiters to reach you quickly.")

    section_count = has_sections(text)
    if section_count >= 3:
        score += 15
        strengths.append("The CV has a clear structure with common resume sections.")
    else:
        improvements.append("Organize the resume with clear sections such as Experience, Skills, Education, and Projects.")

    if has_bullets(text):
        score += 10
        strengths.append("The content uses bullet points, which makes responsibilities easier to scan.")
    else:
        improvements.append("Use bullet points to improve readability and recruiter scanning speed.")

    if has_metrics(text):
        score += 15
        strengths.append("The CV includes measurable results, which strengthens the impact of your achievements.")
    else:
        improvements.append("Add numbers, percentages, or measurable outcomes to highlight success.")

    if has_action_verbs(text):
        score += 15
        strengths.append("Strong action verbs are used to describe achievements and responsibilities.")
    else:
        improvements.append("Use more result-driven verbs like led, built, managed, reduced, and improved.")

    if job_title:
        title_keywords = set(re.findall(r"[A-Za-z]+", job_title.lower()))
        cv_keywords = set(re.findall(r"[A-Za-z]+", lower))
        overlap = sorted(title_keywords.intersection(cv_keywords))
        if overlap:
            score += 10
            strengths.append(f"The CV reflects keywords related to the target role: {', '.join(overlap[:5])}.")
        else:
            improvements.append("Tailor the CV more closely to the role by matching keywords from the job title and description.")

    if len(text.split()) < 180:
        improvements.append("Expand the CV with a few more accomplishments to make it more compelling.")

    score = max(0, min(100, score))

    if score >= 80:
        summary = "This CV is strong and likely to impress recruiters. Keep refining it for a specific role."
    elif score >= 60:
        summary = "This CV is solid, but a few improvements could make it more competitive in the market."
    else:
        summary = "This CV needs more structure, measurable results, and role-specific tailoring to stand out."

    return {
        "score": score,
        "strengths": strengths,
        "improvements": improvements,
        "summary": summary,
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/review", methods=["POST"])
def review():
    payload = request.get_json(silent=True)
    if not payload:
        payload = request.form.to_dict()

    name = (payload.get("name") or "Candidate").strip()
    job_title = (payload.get("jobTitle") or "General role").strip()
    cv_text = (payload.get("cvText") or "").strip()

    uploaded_file = request.files.get("cvFile") or request.files.get("file")
    if uploaded_file and uploaded_file.filename:
        pdf_bytes = uploaded_file.read()
        if uploaded_file.filename.lower().endswith(".pdf"):
            extracted_text = extract_text_from_pdf(BytesIO(pdf_bytes))
            if extracted_text:
                cv_text = extracted_text
            elif not cv_text:
                return jsonify({"error": "The uploaded PDF could not be read. Please upload a valid PDF or paste the CV text manually."}), 400
        elif not cv_text:
            return jsonify({"error": "Please upload a PDF file or paste CV text."}), 400

    if not cv_text:
        return jsonify({"error": "Please paste the CV text or upload a PDF before submitting."}), 400

    analysis = analyze_cv(cv_text, job_title)

    return jsonify({
        "name": name,
        "jobTitle": job_title,
        "analysis": analysis,
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
