from typing import List, Optional, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


class CandidateBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str | None = None
    company_id: UUID | None = None
    user_id: UUID | None = None
    resume_id: UUID
    skills: Optional[Any] = []
    experience_years: Optional[int]
    experience: Optional[Any] = []
    education: Optional[Any] = []
    summary: Optional[str] = ""
    department: Optional[str] = ""
    projects: Optional[Any] = []
    rejected: Optional[str] = 'none'
    rejection_reason: Optional[str] = ""


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    skills: Optional[Any] = None
    experience_years: Optional[int] = None
    experience: Optional[Any] = None
    education: Optional[Any] = None
    summary: Optional[str] = None
    department: Optional[str] = None
    projects: Optional[Any] = None
    rejected: Optional[str] = None
    rejection_reason: Optional[str] = None


class CandidateOut(CandidateBase):
    id: UUID
    uploaded_at: datetime
    parsed_at: Optional[datetime]
    role: Optional[str] = ""
    rejected_at: Optional[datetime] = None
    rejected_by: Optional[UUID] = None
    matches: Optional[list] = []  # List of match data from CandidateMatch table

    class Config:
        orm_mode = True
