"""
Database model for Interview scheduling.
"""
from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone

from models.base import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    interview_type = Column(String, nullable=False)  # "Technical Round", "HR Round", "Manager Round", etc.
    scheduled_date = Column(String, nullable=False)  # Date in YYYY-MM-DD format
    scheduled_time = Column(String, nullable=False)  # Time in HH:MM format
    duration_minutes = Column(Integer, nullable=False, default=30)
    interviewers = Column(JSON, nullable=True)  # Array of email addresses
    notes = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="scheduled")  # scheduled, completed, cancelled
    scheduled_by = Column(UUID(as_uuid=True), nullable=False)  # Company ID who scheduled  
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    candidate = relationship("Candidate", back_populates="interviews")
