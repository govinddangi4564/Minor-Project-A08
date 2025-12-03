from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from schemas.shortlist_schema import ShortlistOut, ShortlistCreate
from services.shortlist_service import get_shortlist, create_shortlist, delete_shortlist
from models.base import get_db
from routes.company_route import get_current_company


router = APIRouter(prefix="/shortlist")


@router.get("/", response_model=List[ShortlistOut])
def fetch_shortlist(
    candidateName: Optional[str] = Query(None), 
    jdId: Optional[UUID] = Query(None),
    jdTitle: Optional[str] = Query(None),
    db: Session = Depends(get_db), 
    company_obj = Depends(get_current_company)
):
    return get_shortlist(db, candidateName, jdId, jdTitle)


@router.post("/", response_model=ShortlistOut)
def add_to_shortlist(shortlist_data: ShortlistCreate, db: Session = Depends(get_db), company_obj = Depends(get_current_company)):
    return create_shortlist(db, shortlist_data, company_obj.id)


@router.delete("/{id}", status_code=204)
def remove_from_shortlist(id: UUID, db: Session = Depends(get_db), company_obj = Depends(get_current_company)):
    success = delete_shortlist(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Shortlist entry not found")
