"""
Interview scheduling routes for company module.
Allows companies to schedule interviews with candidates and send email invitations.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID
from typing import Optional

from models.base import get_db
from models import Interview, Candidate
from schemas.interview_schema import InterviewCreate, InterviewOut
from utils.security import get_authenticated_entity
from routes.company_route import get_current_company

router = APIRouter(prefix="/interviews")


@router.post("/", response_model=InterviewOut)
async def schedule_interview(
    interview_data: InterviewCreate,
    db: Session = Depends(get_db),
    auth = Depends(get_authenticated_entity)
):
    """
    Schedule a new interview for a candidate.
    Sends email invitations to specified interviewers.
    """
    # Verify candidate exists
    candidate = db.query(Candidate).filter(Candidate.id == interview_data.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Create interview record
    interview = Interview(
        candidate_id=interview_data.candidate_id,
        interview_type=interview_data.interview_type,
        scheduled_date=interview_data.scheduled_date,
        scheduled_time=interview_data.scheduled_time,
        duration_minutes=interview_data.duration_minutes,
        interviewers=interview_data.interviewers,
        notes=interview_data.notes,
        status="scheduled",
        scheduled_by=auth["entity_id"]  # Company ID
    )
    
    db.add(interview)
    db.commit()
    db.refresh(interview)
    
    # Send email invitations to candidate and interviewers
    try:
        from services.email_service import send_interview_invitation
        
        # Get company name (you can enhance this by fetching from database)
        company_name = "Our Company"  # TODO: Fetch from company profile
        
        email_sent = send_interview_invitation(
            candidate_name=candidate.name,
            candidate_email=candidate.email,
            interviewer_emails=interview_data.interviewers or [],
            interview_type=interview_data.interview_type,
            scheduled_date=interview_data.scheduled_date,
            scheduled_time=interview_data.scheduled_time,
            duration_minutes=interview_data.duration_minutes,
            notes=interview_data.notes,
            company_name=company_name
        )
        
        if email_sent:
            print(f"✅ Interview invitation emails sent successfully")
        else:
            print(f"⚠️ Interview created but email notification failed")
            
    except Exception as e:
        print(f"⚠️ Interview created but email sending failed: {str(e)}")
        # Don't fail the interview creation if email fails
    
    return interview


@router.get("/{interview_id}", response_model=InterviewOut)
async def get_interview(
    interview_id: UUID,
    db: Session = Depends(get_db),
    auth = Depends(get_authenticated_entity)
):
    """Get interview details by ID."""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.get("/candidate/{candidate_id}")
async def get_candidate_interviews(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    auth = Depends(get_authenticated_entity)
):
    """Get all interviews for a specific candidate."""
    interviews = db.query(Interview).filter(
        Interview.candidate_id == candidate_id
    ).order_by(Interview.scheduled_date.desc()).all()
    
    return interviews


@router.put("/{interview_id}/cancel")
async def cancel_interview(
    interview_id: UUID,
    db: Session = Depends(get_db),
    auth = Depends(get_authenticated_entity)
):
    """Cancel a scheduled interview."""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    interview.status = "cancelled"
    db.commit()
    
    # Send cancellation email to candidate
    try:
        from services.email_service import send_interview_cancellation
        
        candidate = db.query(Candidate).filter(Candidate.id == interview.candidate_id).first()
        if candidate:
            company_name = "Our Company"  # TODO: Fetch from company profile
            
            send_interview_cancellation(
                candidate_name=candidate.name,
                candidate_email=candidate.email,
                interview_type=interview.interview_type,
                scheduled_date=interview.scheduled_date,
                scheduled_time=interview.scheduled_time,
                company_name=company_name
            )
    except Exception as e:
        print(f"⚠️ Interview cancelled but email notification failed: {str(e)}")
    
    return {"message": "Interview cancelled successfully"}
