from sqlalchemy import (
    Column, String, Integer, Text, DateTime,
    ForeignKey, func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from models.base import Base
from sqlalchemy.orm import relationship


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # Basic info
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)

    # Company
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id"),
        nullable=True
    )

    # Resume
    resume_id = Column(
        UUID(as_uuid=True),
        ForeignKey("resumes.resume_id"),
        nullable=False
    )

    # User
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=True
    )

    # Parsed NLP data
    skills = Column(JSONB)
    experience_years = Column(Integer)
    experience = Column(JSONB)
    education = Column(JSONB)
    summary = Column(Text)
    projects = Column(JSONB)
    department = Column(String(100))
    role = Column(String(100))

    # Rejection tracking
    rejected = Column(String(50), default='none')  # 'none', 'rejected', 'maybe'
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    rejected_by = Column(UUID(as_uuid=True),nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Timestamps
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    parsed_at = Column(DateTime(timezone=True))

    company = relationship("Company", back_populates="candidate")
    user = relationship("UserModel", back_populates="candidate")
    candidate_matches = relationship("CandidateMatch", back_populates="candidate")
    shortlists = relationship("Shortlist", back_populates="candidates")
    interviews = relationship("Interview", back_populates="candidate")

