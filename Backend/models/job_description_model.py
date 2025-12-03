from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from models.base import Base


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title = Column(String(255), nullable=False)
    department = Column(String(255))
    location = Column(String(255))
    description = Column(Text)

    keywords = Column(JSONB)  # array or json structure

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True)

    # Optional relationships
    candidate_matches = relationship("CandidateMatch", back_populates="job_description")
    shortlists = relationship("Shortlist", back_populates="job_description")
    company = relationship("Company", back_populates="job_description")
    user = relationship("UserModel", back_populates="job_description")
