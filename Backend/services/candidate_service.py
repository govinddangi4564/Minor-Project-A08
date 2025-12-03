from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from typing import List, Optional
from uuid import UUID
from models import Candidate, JobDescription
from models.candidate_match_model import CandidateMatch
from schemas.candidate_schema import CandidateUpdate
from datetime import datetime, timedelta, timezone

def get_candidates(
    db: Session,
    auth: dict,
    role: Optional[str] = None,
    department: Optional[str] = None,
    days: Optional[int] = None,
    search: Optional[str] = None,
    minScore: Optional[int] = None,
    sortBy: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
) -> List[Candidate]:
    query = db.query(Candidate)

    if auth["type"] == "company":
        query = query.filter(Candidate.company_id == auth["entity"].id)
    elif auth["type"] == "user":
        query = query.filter(Candidate.user_id == auth["entity"].user_id)

    # Search by name or email
    if search:
        query = query.filter(or_(
            Candidate.name.ilike(f"%{search}%"),
            Candidate.email.ilike(f"%{search}%")
        ))

    # Filter by uploaded_at within the last `days` days
    if days:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(Candidate.uploaded_at >= cutoff_date)

    # Filter by JD title (case-insensitive) using role filter
    if role:
        query = query.filter(JobDescription.title.ilike(f"%{role}%"))

    # Filter by department (case-insensitive)
    if department:
        query = query.filter(Candidate.department.ilike(f"%{department}%"))

    # Join with CandidateMatch once for both filtering and sorting
    # Use outerjoin to include candidates without matches
    query = query.outerjoin(CandidateMatch, Candidate.id == CandidateMatch.candidate_id).outerjoin(JobDescription, CandidateMatch.jd_id == JobDescription.id)

    # Filter by minScore (using match final_score if available)
    if minScore:
        query = query.filter(or_(
            CandidateMatch.final_score >= minScore,
            CandidateMatch.final_score.is_(None)  # Include candidates without matches
        ))

    # Sorting
    if sortBy == "score":
        # Sort by final_score from matches (already joined)
        query = query.order_by(desc(CandidateMatch.final_score))
    elif sortBy == "newest":
        query = query.order_by(desc(Candidate.uploaded_at))
    elif sortBy == "experience":
        query = query.order_by(desc(Candidate.experience_years))
    elif sortBy in ["name", "uploaded_at"]:
        query = query.order_by(getattr(Candidate, sortBy))

    candidates = query.offset(skip).limit(limit).all()
    
    # Attach ALL match data to each candidate (not just best match)
    for candidate in candidates:
        # Get all matches for this candidate
        all_matches = db.query(CandidateMatch).filter(
            CandidateMatch.candidate_id == candidate.id
        ).order_by(desc(CandidateMatch.final_score)).all()
        
        if all_matches:
            # Attach all matches as a list of dictionaries
            candidate.matches = [
                {
                    "jd_id": str(match.jd_id),
                    "skill_match": match.skill_match_percent,
                    "sbert_score": match.sbert_score,
                    "final_score": match.final_score,
                    "matched_skills": match.matched_skills
                }
                for match in all_matches
            ]
        else:
            candidate.matches = []

        # Normalize empty email strings to None so Pydantic EmailStr validators
        # (which reject empty strings) don't raise ResponseValidationError.
        if hasattr(candidate, 'email') and (candidate.email == "" or candidate.email is None or str(candidate.email).strip() == ""):
            candidate.email = None
    
    return candidates


def get_candidate(db: Session, candidate_id: UUID) -> Optional[Candidate]:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if candidate:
        # Get all matches for this candidate (consistent with get_candidates)
        all_matches = db.query(CandidateMatch).filter(
            CandidateMatch.candidate_id == candidate.id
        ).order_by(desc(CandidateMatch.final_score)).all()
        
        if all_matches:
            # Attach all matches as a list of dictionaries
            candidate.matches = [
                {
                    "jd_id": str(match.jd_id),
                    "skill_match": match.skill_match_percent,
                    "sbert_score": match.sbert_score,
                    "final_score": match.final_score,
                    "matched_skills": match.matched_skills
                }
                for match in all_matches
            ]
        else:
            candidate.matches = []

        # Normalize empty email strings to None before returning
        if hasattr(candidate, 'email') and (candidate.email == "" or candidate.email is None or str(candidate.email).strip() == ""):
            candidate.email = None
    
    return candidate


def update_candidate(db: Session, candidate_id: UUID, updates: CandidateUpdate) -> Optional[Candidate]:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return None
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(candidate, field, value)
    db.commit()
    db.refresh(candidate)
    return candidate


def delete_candidate(db: Session, candidate_id: UUID) -> bool:
    """
    Delete a candidate and all related records including resume.
    
    Deletes in order:
    1. CandidateMatch records (matches with JDs)
    2. Shortlist entries
    3. Candidate record
    4. Resume file from disk
    5. Resume database record
    
    This ensures no orphaned resumes exist that could cause dashboard inconsistencies.
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return False
    
    # Store resume_id and get resume path before deleting candidate
    resume_id = candidate.resume_id
    resume_path = None
    
    if resume_id:
        from models.resume_model import Resume
        resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
        if resume:
            resume_path = resume.uploaded_path
    
    # Delete related records in proper order to avoid foreign key violations
    
    # 1. Delete candidate matches
    db.query(CandidateMatch).filter(CandidateMatch.candidate_id == candidate_id).delete(synchronize_session=False)
    
    # 2. Delete shortlist entries
    from models.shortlist_model import Shortlist
    db.query(Shortlist).filter(Shortlist.candidate_id == candidate_id).delete(synchronize_session=False)
    
    # 3. Delete the candidate
    db.delete(candidate)
    
    # Commit candidate and related deletions
    db.commit()
    
    # 4. Delete resume file from disk (if exists)
    if resume_path:
        try:
            from pathlib import Path
            file_path = Path(resume_path)
            if file_path.exists():
                file_path.unlink()
                print(f"Resume file deleted from disk: {resume_path}")
        except Exception as e:
            print(f"Warning: Failed to delete resume file {resume_path}: {e}")
    
    # 5. Delete resume from database (if exists)
    if resume_id:
        try:
            from models.resume_model import Resume
            resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
            if resume:
                db.delete(resume)
                db.commit()
                print(f"Resume database record deleted: {resume_id}")
        except Exception as e:
            print(f"Warning: Failed to delete resume database record {resume_id}: {e}")
    
    return True
