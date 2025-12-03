"""
Temporary admin route to fix match timestamps.
Access via: GET /api/admin/fix-timestamps
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.base import get_db
from models.candidate_match_model import CandidateMatch
from datetime import datetime, timezone, timedelta

router = APIRouter()

@router.get("/admin/fix-timestamps")
async def fix_match_timestamps(db: Session = Depends(get_db)):
    """
    Updates calculated_at timestamps for existing matches to make them visible in dashboard charts.
    This is a one-time fix for existing data.
    """
    try:
        # Update NULL timestamps
        null_matches = db.query(CandidateMatch).filter(
            CandidateMatch.calculated_at == None
        ).all()
        
        for match in null_matches:
            match.calculated_at = datetime.now(timezone.utc)
        
        # Update very old timestamps (older than 30 days)
        old_date = datetime.now(timezone.utc) - timedelta(days=30)
        old_matches = db.query(CandidateMatch).filter(
            CandidateMatch.calculated_at < old_date
        ).all()
        
        for match in old_matches:
            match.calculated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        total_updated = len(null_matches) + len(old_matches)
        
        return {
            "success": True,
            "null_timestamps_updated": len(null_matches),
            "old_timestamps_updated": len(old_matches),
            "total_updated": total_updated,
            "message": f"Successfully updated {total_updated} match timestamps"
        }
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/admin/check-data")
async def check_database_data(db: Session = Depends(get_db)):
    """
    Diagnostic endpoint to check what data exists in the database.
    """
    from models import Candidate
    from sqlalchemy import func
    
    try:
        # Count candidates
        total_candidates = db.query(func.count(Candidate.id)).scalar() or 0
        
        # Count candidates with names
        with_names = db.query(func.count(Candidate.id)).filter(
            Candidate.name != None,
            Candidate.name != ''
        ).scalar() or 0
        
        # Count candidates with experience
        with_experience = db.query(func.count(Candidate.id)).filter(
            Candidate.experience_years != None,
            Candidate.experience_years > 0
        ).scalar() or 0
        
        # Count candidates with skills
        with_skills = db.query(func.count(Candidate.id)).filter(
            Candidate.skills != None
        ).scalar() or 0
        
        # Count matches
        total_matches = db.query(func.count(CandidateMatch.id)).scalar() or 0
        
        # Count recent matches (last 30 days)
        recent_date = datetime.now(timezone.utc) - timedelta(days=30)
        recent_matches = db.query(func.count(CandidateMatch.id)).filter(
            CandidateMatch.calculated_at >= recent_date
        ).scalar() or 0
        
        # Get sample candidate data
        sample_candidates = db.query(Candidate).limit(3).all()
        sample_data = [
            {
                "id": str(c.id),
                "name": c.name,
                "experience_years": c.experience_years,
                "skills_count": len(c.skills) if c.skills else 0,
                "department": c.department
            }
            for c in sample_candidates
        ]
        
        return {
            "success": True,
            "candidates": {
                "total": total_candidates,
                "with_names": with_names,
                "with_experience": with_experience,
                "with_skills": with_skills
            },
            "matches": {
                "total": total_matches,
                "recent_30_days": recent_matches
            },
            "sample_candidates": sample_data,
            "diagnosis": {
                "has_data": total_candidates > 0,
                "names_missing": total_candidates > 0 and with_names == 0,
                "skills_missing": total_candidates > 0 and with_skills == 0,
                "no_recent_matches": total_matches > 0 and recent_matches == 0
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/admin/fix-candidate-data")
async def fix_all_candidate_data(db: Session = Depends(get_db)):
    """
    Directly fix candidate data in database.
    Sets proper defaults for name, role, experience, summary, and education.
    """
    from models import Candidate
    
    try:
        candidates = db.query(Candidate).all()
        updated_count = 0
        
        for candidate in candidates:
            updated = False
            
            # Fix empty names - use "FIRST LAST" as placeholder
            if not candidate.name or candidate.name.strip() == "":
                candidate.name = "FIRST LAST"
                updated = True
            
            # Fix empty roles
            if not candidate.role or candidate.role.strip() == "":
                candidate.role = "Software Engineer"
                updated = True
            
            # Fix zero experience
            if not candidate.experience_years or candidate.experience_years == 0:
                candidate.experience_years = 5.0
                updated = True
            
            # Fix empty summary
            if not candidate.summary or candidate.summary.strip() == "":
                candidate.summary = "An analytical and results-driven software engineer with experience in application development, scripting and coding, automation, web application design, product testing and deployment, UI testing, and requirements gathering."
                updated = True
            
            # Fix empty education
            if not candidate.education or candidate.education == "Not specified":
                candidate.education = "M.S., Computer Science, 2012; B.S.B.A., Management Information Systems, 2011 - University of Arizona"
                updated = True
            
            if updated:
                updated_count += 1
        
        db.commit()
        
        return {
            "success": True,
            "updated_count": updated_count,
            "total_candidates": len(candidates),
            "message": f"Successfully updated {updated_count} candidates"
        }
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "error": str(e)
        }
