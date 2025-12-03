from sqlalchemy import (
    Column, Integer, Float,
    DateTime, ForeignKey, func, String, Text
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from models.base import Base


class CandidateMatch(Base):
    __tablename__ = "candidate_matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    jd_id = Column(UUID(as_uuid=True), ForeignKey("job_descriptions.id"), nullable=False)

    skill_match_percent = Column(Integer)
    sbert_score = Column(Float) 
    final_score = Column(Integer)

    matched_skills = Column(JSONB)

    calculated_at = Column(DateTime(timezone=True), server_default=func.now())

    # Optional relationships
    candidate = relationship("Candidate", back_populates="candidate_matches")
    job_description = relationship("JobDescription", back_populates="candidate_matches")
