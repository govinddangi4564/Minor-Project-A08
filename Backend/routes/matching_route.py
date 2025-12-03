from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID
from sqlalchemy.orm import Session

from schemas.matching_schema import CandidateMatchOut, CalculateMatchRequest
from services.matching_service import calculate_match_score, match_all_candidates, match_candidate
from models.base import get_db
from utils.security import get_authenticated_entity

router = APIRouter(prefix="/matching")


@router.post("/run", response_model=List[CandidateMatchOut])
def run_matching(db: Session = Depends(get_db), auth: dict = Depends(get_authenticated_entity)):
    if auth['type'] == 'company':
        matches = match_all_candidates(db, auth['entity'].id)
        if not matches:
            raise HTTPException(status_code=404, detail="No matches found")
        return matches
    else:
        raise HTTPException(401, "Invalid token")


@router.post("/candidate/{candidate_id}", response_model=List[CandidateMatchOut])
def run_candidate_matching(candidate_id: UUID, db: Session = Depends(get_db), auth: dict = Depends(get_authenticated_entity)):
    if auth['type'] == 'company':
        matches = match_candidate(db, candidate_id, auth['entity'].id)
        if not matches:
            raise HTTPException(status_code=404, detail="Candidate not found or no matches")
        return matches
    else:
        raise HTTPException(401, "Invalid token")


@router.post("/calculate", response_model=CandidateMatchOut)
def calculate_matching(
    body: CalculateMatchRequest,
    auth: str = Depends(get_authenticated_entity),
    db: Session = Depends(get_db)
):
    """
    Calculates match score between a candidate and a job description.
    """
    if auth['type'] == 'company':
        result = calculate_match_score(
            candidate_id=body.candidate_id,
            jd_id=body.jd_id,
            db=db
        )
        if not result:
            raise HTTPException(status_code=404, detail="Candidate not found or no matches")
        return result
    else:
        raise HTTPException(401, "Invalid token")
