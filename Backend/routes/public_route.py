from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List
from utils.resume_parser import extract_skills_from_text
from services.matching_service import compute_sbert_similarity, compute_skill_match
from utils.sendgrid_mail import send_resume_analysis_sendgrid

router = APIRouter(prefix="/public", tags=["Public"])

class AnalyzeRequest(BaseModel):
    resume_text: str
    jd_text: str

class AnalyzeResponse(BaseModel):
    match_score: float
    sbert_score: float
    skill_match_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    resume_skills: List[str]
    jd_skills: List[str]
    improvements: List[str]

class SendReportRequest(BaseModel):
    email: EmailStr
    user_name: str
    match_score: float
    sbert_score: float
    skill_match_score: float
    resume_skills: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    improvements: List[str]

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_resume(request: AnalyzeRequest):
    resume_text = request.resume_text
    jd_text = request.jd_text

    if not resume_text or not jd_text:
        raise HTTPException(status_code=400, detail="Resume text and JD text are required.")

    # 1. Extract Skills
    resume_skills = extract_skills_from_text(resume_text)
    jd_skills = extract_skills_from_text(jd_text)

    # 2. Compute Skill Match
    skill_match_score, matched_skills = compute_skill_match(resume_skills, jd_skills)

    # 3. Compute SBERT Similarity
    sbert_score = compute_sbert_similarity(resume_text, jd_text)

    # 4. Final Weighted Score
    # Weight: 60% Skills, 40% Semantic (SBERT)
    final_score = round((skill_match_score * 0.6) + (sbert_score * 0.4), 2)

    # 5. Identify Missing Skills
    resume_skills_set = set([s.lower() for s in resume_skills])
    missing_skills = [s for s in jd_skills if s.lower() not in resume_skills_set]

    # 6. Generate Improvements
    improvements = []
    if final_score < 50:
        improvements.append("Your resume has a low match score. Consider tailoring it more closely to the job description.")
    
    if missing_skills:
        improvements.append(f"You are missing key skills mentioned in the JD: {', '.join(missing_skills[:5])}.")
        improvements.append("Try to incorporate these keywords into your 'Skills' or 'Experience' sections if you possess them.")
    
    if len(resume_text.split()) < 200:
        improvements.append("Your resume seems a bit short. Elaborate more on your experience and projects.")
    
    if sbert_score < 50:
        improvements.append("The semantic similarity is low. Ensure you use industry-standard terminology found in the job description.")

    if not improvements:
        improvements.append("Great match! Your resume aligns well with the job description.")

    return AnalyzeResponse(
        match_score=final_score,
        sbert_score=sbert_score,
        skill_match_score=round(skill_match_score, 2),
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        resume_skills=resume_skills,
        jd_skills=jd_skills,
        improvements=improvements
    )

@router.post("/send-report")
async def send_analysis_report(request: SendReportRequest):
    """Send resume analysis report to user's email via SendGrid"""
    try:
        send_resume_analysis_sendgrid(
            email_to=request.email,
            user_name=request.user_name,
            match_score=request.match_score,
            sbert_score=request.sbert_score,
            skill_match_score=request.skill_match_score,
            resume_skills=request.resume_skills,
            matched_skills=request.matched_skills,
            missing_skills=request.missing_skills,
            improvements=request.improvements
        )
        return {"message": "Report sent successfully to your email!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile, File
from utils.resume_parser import extract_text_from_pdf
from utils.utility import BASE_DIR

TEMP_DIR = BASE_DIR / "uploads" / "temp"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/parse_resume")
async def parse_resume_public(file: UploadFile = File(...)):
    if file.filename.split(".")[-1].lower() != "pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    file_id = uuid.uuid4()
    file_path = TEMP_DIR / f"temp_{file_id}.pdf"
    
    try:
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)
            
        text = extract_text_from_pdf(str(file_path))
        
        # Clean up
        if file_path.exists():
            file_path.unlink()
            
        return {"text": text}
        
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Error parsing resume: {str(e)}")
