from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from schemas.jd_schema import JDBase, JDUpdate, JDOut
from services.jd_service import JDUserService, JDCompanyService
from models.base import get_db
from utils.security import get_authenticated_entity

router = APIRouter(prefix="/jds")


@router.get("/", response_model=list[JDOut])
def get_all_jds(db: Session = Depends(get_db), auth = Depends(get_authenticated_entity)):
    if auth['type'] == 'user':
        return JDUserService.get_all(db, auth['entity'])
    
    if auth['type'] == 'company':
        return JDCompanyService.get_all(db, auth['entity'])
    
    return HTTPException(401, "Unsupported auth type")


@router.get("/{jd_id}", response_model=JDOut)
def get_jd(jd_id: UUID, db: Session = Depends(get_db), auth = Depends(get_authenticated_entity)):
    if auth['type'] == 'user':
        service = JDUserService
    elif auth['type'] == 'company':
        service = JDCompanyService
    else:
        raise HTTPException(401, "Unsupported auth type")

    jd = service.get_by_id(db, jd_id, auth['entity'])
    if not jd:
        raise HTTPException(status_code=404, detail="Job Description not found")
    return jd


@router.post("/", response_model=JDOut, status_code=201)
def create_jd(payload: JDBase, db: Session = Depends(get_db), auth = Depends(get_authenticated_entity)):
    if auth['type'] == 'user':
        service = JDUserService
    elif auth['type'] == 'company':
        service = JDCompanyService
    else:
        raise HTTPException(401, "Unsupported auth type")
    return service.create(db, payload, auth['entity'])


@router.put("/{jd_id}", response_model=JDOut)
def update_jd(jd_id: UUID, payload: JDUpdate, db: Session = Depends(get_db), auth = Depends(get_authenticated_entity)):
    if auth['type'] == 'user':
        service = JDUserService
    elif auth['type'] == 'company':
        service = JDCompanyService
    else:
        raise HTTPException(401, "Unsupported auth type")
    jd = service.update(db, jd_id, payload, auth['entity'])
    if not jd:
        raise HTTPException(status_code=404, detail="Job Description not found")
    return jd


@router.delete("/{jd_id}", status_code=204)
def delete_jd(jd_id: UUID, db: Session = Depends(get_db), auth = Depends(get_authenticated_entity)):
    if auth['type'] == 'user':
        service = JDUserService
    elif auth['type'] == 'company':
        service = JDCompanyService
    else:
        raise HTTPException(401, "Unsupported auth type")
    success = service.delete(db, jd_id, auth['entity'])
    if not success:
        raise HTTPException(status_code=404, detail="Job Description not found")
    return None
