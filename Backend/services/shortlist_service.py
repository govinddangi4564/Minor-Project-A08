from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from models import Shortlist, Candidate, JobDescription
from schemas.shortlist_schema import ShortlistCreate

def get_shortlist(db: Session, candidate_name: Optional[str] = None, jd_id: Optional[UUID] = None, jd_title: Optional[str] = None) -> List[Shortlist]:
    query = db.query(Shortlist).join(Candidate).join(JobDescription)
    if candidate_name:
        query = query.filter(Candidate.name.ilike(f"%{candidate_name}%"))
    if jd_id:
        query = query.filter(Shortlist.jd_id == jd_id)
    if jd_title:
        query = query.filter(JobDescription.title.ilike(f"%{jd_title}%"))
    return query.all()


def create_shortlist(db: Session, shortlist_data: ShortlistCreate, company_id: UUID) -> Shortlist:
    new_entry = Shortlist(
        candidate_id=shortlist_data.candidate_id,
        jd_id=shortlist_data.jd_id,
        shortlisted=shortlist_data.shortlisted,
        shortlisted_by=company_id
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry


def delete_shortlist(db: Session, shortlist_id: UUID) -> bool:
    entry = db.query(Shortlist).filter(Shortlist.id == shortlist_id).first()
    if not entry:
        return False
    db.delete(entry)
    db.commit()
    return True
