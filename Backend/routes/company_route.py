from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.base import get_db
from schemas.company_schema import *
from services.company_service import *
from utils.security import get_authenticated_entity

router = APIRouter()


def get_current_company(auth: dict = Depends(get_authenticated_entity)):
    entity, type = auth["entity"], auth["type"]
    if type != "company":
        raise HTTPException(401, "Invalid token")
    return entity


# Company login
@router.post("/auth/company/login", response_model=CompanyLoginResponse)
def company_login(payload: CompanyLoginSchema, db: Session = Depends(get_db)):
    return login_company(db, payload.email, payload.password)


# Get company profile
@router.get("/company/profile", response_model=CompanyProfileResponse)
def company_profile(current_company=Depends(get_current_company), db: Session = Depends(get_db)):
    return get_company_profile(db, current_company.id)


# Update company profile
@router.put("/company/profile", response_model=CompanyProfileResponse)
def update_profile(payload: CompanyUpdateSchema, current_company=Depends(get_current_company), db: Session = Depends(get_db)):
    return update_company_profile(db, current_company.id, payload.model_dump())


# Change password
@router.post("/company/change-password")
def change_password_endpoint(payload: ChangePasswordSchema, current_company=Depends(get_current_company), db: Session = Depends(get_db)):
    return change_password(db, current_company.id, payload.currentPassword, payload.newPassword, payload.confirmPassword)


# Register company
@router.post("/companies/register", response_model=CompanyProfileResponse)
def register_company_endpoint(payload: RegisterCompanySchema, db: Session = Depends(get_db)):
    company = register_company(db, payload.model_dump())
    return {
        "companyID": company.id,
        "companyName": company.name,
        "companyEmail": company.email,
        "companyWebsite": company.website
    }


