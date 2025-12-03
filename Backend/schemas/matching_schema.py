from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Optional


class CalculateMatchRequest(BaseModel):
    candidate_id: UUID
    jd_id: UUID


class CandidateMatchOut(BaseModel):
    id: UUID
    candidate_id: UUID
    jd_id: UUID
    skill_match_percent: float
    sbert_score: float
    final_score: float
    matched_skills: Optional[List[str]]
    calculated_at: datetime

    class Config:
        orm_mode = True
