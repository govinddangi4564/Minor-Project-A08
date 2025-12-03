from sqlalchemy import (
    Column, Boolean, DateTime, ForeignKey, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from models.base import Base


class Shortlist(Base):
    __tablename__ = "shortlist"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    jd_id = Column(UUID(as_uuid=True), ForeignKey("job_descriptions.id"), nullable=False)

    shortlisted = Column(Boolean, default=False)
    shortlisted_at = Column(DateTime(timezone=True), server_default=func.now())

    shortlisted_by = Column(UUID(as_uuid=True), ForeignKey("companies.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Optional relationships
    candidates = relationship("Candidate", back_populates="shortlists")
    job_description = relationship("JobDescription", back_populates="shortlists")

