"""
Pydantic schemas for Interview scheduling.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class InterviewCreate(BaseModel):
    candidate_id: UUID
    interview_type: str = Field(..., example="Technical Round")
    scheduled_date: str = Field(..., example="2025-11-30")
    scheduled_time: str = Field(..., example="14:30")
    duration_minutes: int = Field(default=30, example=30)
    interviewers: Optional[List[str]] = Field(default=None, example=["interviewer@company.com"])
    notes: Optional[str] = Field(default=None, example="Focus on React and Node.js experience")


class InterviewOut(BaseModel):
    id: UUID
    candidate_id: UUID
    interview_type: str
    scheduled_date: str
    scheduled_time: str
    duration_minutes: int
    interviewers: Optional[List[str]]
    notes: Optional[str]
    status: str
    scheduled_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
